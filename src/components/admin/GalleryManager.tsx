'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Image as ImageIcon, Trash2, Plus, Loader2, ExternalLink, Copy, Edit, Check } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
  createdAt: Date;
}

const categoryLabels: Record<string, string> = {
  restaurant: 'Restaurant',
  food: 'Food',
  events: 'Events',
  team: 'Our Team',
  interior: 'Interior',
  terrace: 'Terrace',
  bar: 'Bar',
};

const categories = [
  { value: 'restaurant', label: 'Restaurant', icon: '🏠' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'events', label: 'Events', icon: '🎉' },
  { value: 'team', label: 'Our Team', icon: '👥' },
  { value: 'interior', label: 'Interior', icon: '🛋️' },
  { value: 'terrace', label: 'Terrace', icon: '🌳' },
  { value: 'bar', label: 'Bar', icon: '🍸' },
];

export default function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [newImage, setNewImage] = useState({ url: '', title: '', category: 'restaurant' });
  const [editFormData, setEditFormData] = useState({ url: '', title: '', category: 'restaurant' });
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
      toast.success('Image added to gallery - now visible on website!');
      setNewImage({ url: '', title: '', category: 'restaurant' });
      setAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add image');
    } finally {
      setUploading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (image: GalleryImage) => {
    setEditingImage(image);
    setEditFormData({
      url: image.url,
      title: image.title,
      category: image.category,
    });
    setEditDialogOpen(true);
  };

  // Edit image
  const handleEditImage = async () => {
    if (!db || !editingImage || !editFormData.url) {
      toast.error('Please enter an image URL');
      return;
    }

    setUploading(true);
    try {
      await updateDoc(doc(db, 'gallery', editingImage.id), {
        url: editFormData.url,
        title: editFormData.title || 'Gallery Image',
        category: editFormData.category,
        updatedAt: serverTimestamp(),
      });
      toast.success('Image updated - changes visible on website!');
      setEditDialogOpen(false);
      setEditingImage(null);
    } catch (error) {
      toast.error('Failed to update image');
    } finally {
      setUploading(false);
    }
  };

  // Delete image
  const handleDeleteImage = async (image: GalleryImage) => {
    if (!db) return;
    
    if (!confirm(`Are you sure you want to delete "${image.title}"? This will remove it from the website gallery.`)) return;
    
    try {
      await deleteDoc(doc(db, 'gallery', image.id));
      toast.success('Image removed from gallery and website');
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  // Copy URL to clipboard
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2 text-xl">
                <ImageIcon className="h-6 w-6 text-purple-400" />
                Gallery Management
              </CardTitle>
              <p className="text-stone-400 text-sm mt-1">
                Manage images that appear in the website gallery. Changes sync instantly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-600 text-white">{images.length} images</Badge>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Image
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {images.length === 0 ? (
            <div className="text-center py-16 text-stone-500">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl">No images in gallery</p>
              <p className="text-sm mt-2">Click "Add Image" to add images to the website gallery</p>
            </div>
          ) : (
            <ScrollArea className="h-[550px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pr-2">
                {images.map(image => (
                  <div 
                    key={image.id} 
                    className="group relative rounded-xl overflow-hidden border border-stone-600 bg-stone-700/50 hover:border-purple-500/50 transition-all"
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
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                          onClick={() => openEditDialog(image)}
                          className="bg-blue-600 border-blue-500 text-white hover:bg-blue-500"
                        >
                          <Edit className="w-4 h-4" />
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
                    <div className="p-4">
                      <p className="text-white font-medium truncate text-lg">{image.title}</p>
                      <Badge className="bg-stone-600 text-sm mt-2">
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
        <DialogContent className="bg-stone-800 border-stone-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Image to Gallery</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-stone-400 text-sm">Image URL *</Label>
              <Input
                value={newImage.url}
                onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white mt-2"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label className="text-stone-400 text-sm">Title</Label>
              <Input
                value={newImage.title}
                onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white mt-2"
                placeholder="Image title"
              />
            </div>
            <div>
              <Label className="text-stone-400 text-sm">Category</Label>
              <select
                value={newImage.category}
                onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-stone-700 border border-stone-600 text-white mt-2"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            {newImage.url && (
              <div className="rounded-xl overflow-hidden border border-stone-600">
                <img 
                  src={newImage.url} 
                  alt="Preview" 
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.png';
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="border-stone-600 text-stone-400">
              Cancel
            </Button>
            <Button 
              onClick={handleAddImage} 
              disabled={uploading || !newImage.url}
              className="bg-purple-600 hover:bg-purple-500"
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

      {/* Edit Image Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-stone-800 border-stone-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Gallery Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-stone-400 text-sm">Image URL *</Label>
              <Input
                value={editFormData.url}
                onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white mt-2"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label className="text-stone-400 text-sm">Title</Label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white mt-2"
                placeholder="Image title"
              />
            </div>
            <div>
              <Label className="text-stone-400 text-sm">Category</Label>
              <select
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-stone-700 border border-stone-600 text-white mt-2"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            {editFormData.url && (
              <div className="rounded-xl overflow-hidden border border-stone-600">
                <img 
                  src={editFormData.url} 
                  alt="Preview" 
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.png';
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-stone-600 text-stone-400">
              Cancel
            </Button>
            <Button 
              onClick={handleEditImage} 
              disabled={uploading || !editFormData.url}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
