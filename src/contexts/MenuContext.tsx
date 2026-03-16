'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categorySlug: string;
  image: string;
  isAvailable: boolean;
  isPopular: boolean;
  featured: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MenuContextType {
  menuItems: MenuItem[];
  featuredItems: MenuItem[];
  visibleMenuItems: MenuItem[];
  hiddenMenuItems: MenuItem[];
  loading: boolean;
  refreshMenu: () => Promise<void>;
  addToFeatured: (itemId: string) => Promise<void>;
  removeFromFeatured: (itemId: string) => Promise<void>;
  setAvailability: (itemId: string, isAvailable: boolean) => Promise<void>;
}

const MenuContext = createContext<MenuContextType | null>(null);

// Normalize menu item data
function normalizeMenuItem(item: Record<string, unknown>): MenuItem {
  const featured = item.featured === true || item.isPopular === true;
  return {
    id: String(item.id || ''),
    name: String(item.name || ''),
    description: String(item.description || ''),
    price: Number(item.price) || 0,
    category: String(item.category || ''),
    categorySlug: String(item.categorySlug || item.category || ''),
    image: String(item.image || ''),
    isAvailable: item.isAvailable !== false,
    featured,
    isPopular: featured,
  };
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubscribersRef = useRef<Unsubscribe[]>([]);
  const isPollingRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Featured items are those with featured=true (shown in Chef's Recommendations)
  const featuredItems = menuItems.filter(item => item.featured === true);
  
  // Visible items are shown in Menu section on website
  const visibleMenuItems = menuItems.filter(item => item.isAvailable === true);
  
  // Hidden items are NOT shown on website
  const hiddenMenuItems = menuItems.filter(item => item.isAvailable !== true);

  // Fetch menu from API
  const fetchMenuFromAPI = useCallback(async () => {
    try {
      const res = await fetch('/api/menu?all=true');
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map((item: Record<string, unknown>) => normalizeMenuItem(item));
        setMenuItems(normalized);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
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
      const menuQuery = query(collection(db, 'menuItems'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(menuQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          return normalizeMenuItem({
            id: doc.id,
            ...data,
          });
        });
        setMenuItems(items);
        setLoading(false);
      }, (error) => {
        console.error('Firebase menu listener error:', error);
        // Fallback to polling
        fetchMenuFromAPI();
        startPolling();
      });
      
      unsubscribersRef.current.push(unsubscribe);
    } else {
      // No Firebase - use API with polling for updates
      fetchMenuFromAPI();
      startPolling();
    }

    function startPolling() {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      
      // Poll every 3 seconds for updates
      pollIntervalRef.current = setInterval(() => {
        fetchMenuFromAPI();
      }, 3000);
    }

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchMenuFromAPI]);

  // Refresh menu manually
  const refreshMenu = useCallback(async () => {
    await fetchMenuFromAPI();
  }, [fetchMenuFromAPI]);

  // Add item to featured (Chef's Picks)
  const addToFeatured = useCallback(async (itemId: string) => {
    try {
      const res = await fetch(`/api/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: true, isPopular: true }),
      });
      
      if (res.ok) {
        // Update local state immediately for faster UI response
        setMenuItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, featured: true, isPopular: true } : item
        ));
      }
    } catch (error) {
      console.error('Error adding to featured:', error);
    }
  }, []);

  // Remove item from featured
  const removeFromFeatured = useCallback(async (itemId: string) => {
    try {
      const res = await fetch(`/api/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: false, isPopular: false }),
      });
      
      if (res.ok) {
        // Update local state immediately for faster UI response
        setMenuItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, featured: false, isPopular: false } : item
        ));
      }
    } catch (error) {
      console.error('Error removing from featured:', error);
    }
  }, []);

  // Set item availability (visibility on website menu)
  const setAvailability = useCallback(async (itemId: string, isAvailable: boolean) => {
    try {
      const res = await fetch(`/api/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
      });
      
      if (res.ok) {
        // Update local state immediately for faster UI response
        setMenuItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, isAvailable } : item
        ));
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  }, []);

  return (
    <MenuContext.Provider value={{
      menuItems,
      featuredItems,
      visibleMenuItems,
      hiddenMenuItems,
      loading,
      refreshMenu,
      addToFeatured,
      removeFromFeatured,
      setAvailability,
    }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}

export { MenuContext };
