'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
  createdAt?: Date | string;
}

interface GalleryContextType {
  galleryImages: GalleryImage[];
  loading: boolean;
  refreshGallery: () => Promise<void>;
  addImage: (data: { url: string; title: string; category: string }) => Promise<void>;
  updateImage: (id: string, data: Partial<GalleryImage>) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

export function GalleryProvider({ children }: { children: React.ReactNode }) {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubscribersRef = useRef<Unsubscribe[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch gallery from API
  const fetchGalleryFromAPI = useCallback(async () => {
    try {
      const res = await fetch('/api/gallery');
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data);
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup Firebase real-time listener or polling
  useEffect(() => {
    // Clean up previous listeners
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (db) {
      // Use Firebase real-time listener
      const galleryQuery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(galleryQuery, (snapshot) => {
        const images = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));
        setGalleryImages(images);
        setLoading(false);
      }, (error) => {
        console.error('Firebase gallery listener error:', error);
        // Fallback to polling
        fetchGalleryFromAPI();
        startPolling();
      });
      
      unsubscribersRef.current.push(unsubscribe);
    } else {
      // No Firebase - use API with polling for updates
      fetchGalleryFromAPI();
      startPolling();
    }

    function startPolling() {
      // Poll every 3 seconds for updates
      pollIntervalRef.current = setInterval(() => {
        fetchGalleryFromAPI();
      }, 3000);
    }

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchGalleryFromAPI]);

  // Refresh gallery manually
  const refreshGallery = useCallback(async () => {
    await fetchGalleryFromAPI();
  }, [fetchGalleryFromAPI]);

  // Add image
  const addImage = useCallback(async (data: { url: string; title: string; category: string }) => {
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        const newItem = await res.json();
        // Update local state immediately
        setGalleryImages(prev => [newItem, ...prev]);
      }
    } catch (error) {
      console.error('Error adding image:', error);
    }
  }, []);

  // Update image
  const updateImage = useCallback(async (id: string, data: Partial<GalleryImage>) => {
    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        // Update local state immediately
        setGalleryImages(prev => prev.map(img => 
          img.id === id ? { ...img, ...data } : img
        ));
      }
    } catch (error) {
      console.error('Error updating image:', error);
    }
  }, []);

  // Delete image
  const deleteImage = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        // Update local state immediately
        setGalleryImages(prev => prev.filter(img => img.id !== id));
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }, []);

  return (
    <GalleryContext.Provider value={{
      galleryImages,
      loading,
      refreshGallery,
      addImage,
      updateImage,
      deleteImage,
    }}>
      {children}
    </GalleryContext.Provider>
  );
}

export function useGallery() {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
}

export { GalleryContext };
