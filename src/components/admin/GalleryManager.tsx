'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Image as ImageIcon, Trash2, Plus, Loader2, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
  createdAt: Date;
}

export default function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newImage, setNewImage] = useState({ url: '', title: '', category: 'restaurant' });
  const [uploading, setUploading] = useState(false);

  // Real-time gallery listener
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      })) as GalleryImage[];
      setImages(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching gallery:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Add new image
  const handleAddImage = async () => {
    if (!db || !newImage.url) {
      toast.error('Please enter an image URL');
      return;
    }

    setUploading(true);
    try {
      await addDoc(collection(db, 'gallery'), {
        url: newImage.url,
        title: newImage.title || 'Gallery Image',
        category: newImage.category,
        createdAt: serverTimestamp(),
      });
      toast.success('Image added to gallery');
      setNewImage({ url: '', title: '', category: 'restaurant' });
      setAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add image');
    } finally {
      setUploading(false);
    }
  };

  // Delete image
  const handleDeleteImage = async (image: GalleryImage) => {
    if (!db) return;
    
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      await deleteDoc(doc(db, 'gallery', image.id));
      toast.success('Image removed from gallery');
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  // Copy URL to clipboard
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const categoryLabels: Record<string, string> = {
    restaurant: 'Restaurant',
    food: 'Food',
    events: 'Events',
    team: 'Our Team',
    interior: 'Interior',
    terrace: 'Terrace',
    bar: 'Bar',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-stone-800 border-stone-700">
        <CardHeader className="border-b border-stone-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-400" />
              Gallery Management
              <Badge className="bg-stone-600 text-white ml-2">{images.length} images</Badge>
            </CardTitle>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-amber-600 hover:bg-amber-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Image
            </Button>
          </div>
          <p className="text-stone-400 text-sm">Manage images that appear in the website gallery section</p>
        </CardHeader>
        <CardContent className="p-4">
          {images.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No images in gallery</p>
              <p className="text-sm">Click "Add Image" to add images</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map(image => (
                  <div 
                    key={image.id} 
                    className="group relative rounded-lg overflow-hidden border border-stone-600 bg-stone-700/50"
                  >
                    <div className="aspect-square relative">
                      <img 
                        src={image.url} 
                        alt={image.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(image.url, '_blank')}
                          className="bg-stone-700 border-stone-600 text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyUrl(image.url)}
                          className="bg-stone-700 border-stone-600 text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteImage(image)}
                          className="bg-red-600 border-red-500 text-white hover:bg-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-white text-sm font-medium truncate">{image.title}</p>
                      <Badge className="bg-stone-600 text-xs mt-1">
                        {categoryLabels[image.category] || image.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Image Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-stone-800 border-stone-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Image to Gallery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-stone-400 text-sm">Image URL *</Label>
              <Input
                value={newImage.url}
                onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label className="text-stone-400 text-sm">Title</Label>
              <Input
                value={newImage.title}
                onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                placeholder="Image title"
              />
            </div>
            <div>
              <Label className="text-stone-400 text-sm">Category</Label>
              <select
                value={newImage.category}
                onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-stone-700 border border-stone-600 text-white"
              >
                <option value="restaurant">Restaurant</option>
                <option value="food">Food</option>
                <option value="events">Events</option>
                <option value="team">Our Team</option>
                <option value="interior">Interior</option>
                <option value="terrace">Terrace</option>
                <option value="bar">Bar</option>
              </select>
            </div>
            {newImage.url && (
              <div className="rounded-lg overflow-hidden border border-stone-600">
                <img 
                  src={newImage.url} 
                  alt="Preview" 
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.png';
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="border-stone-600 text-stone-400">
              Cancel
            </Button>
            <Button 
              onClick={handleAddImage} 
              disabled={uploading || !newImage.url}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
