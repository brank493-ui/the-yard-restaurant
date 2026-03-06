'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu, Plus, Edit, Trash2, Eye, EyeOff, Star, StarOff, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  featured: boolean;
  available: boolean;
  preparationTime?: number;
}

const categories = [
  { value: 'appetizer', label: 'Appetizers', icon: '🥗' },
  { value: 'main', label: 'Main Courses', icon: '🍽️' },
  { value: 'grilled', label: 'Grilled Specialties', icon: '🔥' },
  { value: 'seafood', label: 'Seafood', icon: '🦐' },
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  { value: 'dessert', label: 'Desserts', icon: '🍰' },
  { value: 'beverage', label: 'Beverages', icon: '🥤' },
  { value: 'cocktail', label: 'Cocktails', icon: '🍸' },
];

export default function MenuManager() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main',
    image: '',
    preparationTime: '',
    available: true,
    featured: false,
  });

  // Real-time menu listener
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'menu'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as MenuItem[];
      setMenuItems(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching menu:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle available
  const toggleAvailable = async (item: MenuItem) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'menu', item.id), { available: !item.available });
      toast.success(item.available ? 'Item hidden from menu' : 'Item now visible');
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  // Toggle featured
  const toggleFeatured = async (item: MenuItem) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'menu', item.id), { featured: !item.featured });
      toast.success(item.featured ? 'Removed from featured' : 'Added to featured');
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  // Delete item
  const deleteItem = async (item: MenuItem) => {
    if (!db) return;
    if (!confirm(`Delete "${item.name}"?`)) return;
    
    try {
      await deleteDoc(doc(db, 'menu', item.id));
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  // Open add dialog
  const openAddDialog = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'main',
      image: '',
      preparationTime: '',
      available: true,
      featured: false,
    });
    setAddDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (item: MenuItem) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image: item.image || '',
      preparationTime: item.preparationTime?.toString() || '',
      available: item.available,
      featured: item.featured,
    });
    setEditDialogOpen(true);
  };

  // Add item
  const handleAdd = async () => {
    if (!db || !formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }
    
    setSaving(true);
    try {
      await addDoc(collection(db, 'menu'), {
        name: formData.name,
        description: formData.description,
        price: parseInt(formData.price),
        category: formData.category,
        image: formData.image || null,
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : null,
        available: formData.available,
        featured: formData.featured,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Menu item added');
      setAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  // Edit item
  const handleEdit = async () => {
    if (!db || !editItem || !formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'menu', editItem.id), {
        name: formData.name,
        description: formData.description,
        price: parseInt(formData.price),
        category: formData.category,
        image: formData.image || null,
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : null,
        available: formData.available,
        featured: formData.featured,
        updatedAt: serverTimestamp(),
      });
      toast.success('Item updated');
      setEditDialogOpen(false);
      setEditItem(null);
    } catch (error) {
      toast.error('Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-stone-400 text-sm">Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-stone-700 border-stone-600 text-white"
            placeholder="Dish name"
          />
        </div>
        <div>
          <Label className="text-stone-400 text-sm">Price (XAF) *</Label>
          <Input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="bg-stone-700 border-stone-600 text-white"
            placeholder="5000"
          />
        </div>
      </div>
      <div>
        <Label className="text-stone-400 text-sm">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-stone-700 border-stone-600 text-white"
          rows={2}
          placeholder="Dish description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-stone-400 text-sm">Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger className="bg-stone-700 border-stone-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-700">
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-stone-400 text-sm">Prep Time (mins)</Label>
          <Input
            type="number"
            value={formData.preparationTime}
            onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
            className="bg-stone-700 border-stone-600 text-white"
            placeholder="15"
          />
        </div>
      </div>
      <div>
        <Label className="text-stone-400 text-sm">Image URL</Label>
        <Input
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          className="bg-stone-700 border-stone-600 text-white"
          placeholder="https://..."
        />
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.available}
            onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
            className="rounded bg-stone-700 border-stone-600"
          />
          <span className="text-stone-300">Available</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="rounded bg-stone-700 border-stone-600"
          />
          <span className="text-stone-300">Featured</span>
        </label>
      </div>
      {formData.image && (
        <div className="rounded-lg overflow-hidden border border-stone-600">
          <img src={formData.image} alt="Preview" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-stone-800 border-stone-700">
        <CardHeader className="border-b border-stone-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Menu className="h-5 w-5 text-green-400" />
              Menu Management
              <Badge className="bg-stone-600 text-white ml-2">{menuItems.length} items</Badge>
            </CardTitle>
            <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-stone-700 border-stone-600 text-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="bg-stone-700 mb-4 flex-wrap h-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-amber-600">All</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat.value} value={cat.value} className="data-[state=active]:bg-amber-600">
                  {cat.icon} {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-lg border ${item.available ? 'bg-stone-700/50 border-stone-600' : 'bg-stone-800 border-stone-700 opacity-60'}`}
                >
                  <div className="flex items-start gap-3">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium">{item.name}</p>
                        {item.featured && <Star className="w-4 h-4 text-amber-400 fill-current" />}
                        {!item.available && <Badge className="bg-red-500 text-xs">Hidden</Badge>}
                      </div>
                      <p className="text-stone-400 text-xs truncate">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-amber-400 font-semibold">{item.price.toLocaleString()} XAF</p>
                        <Badge className="bg-stone-600 text-xs">{categories.find(c => c.value === item.category)?.label}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAvailable(item)}
                      className={`flex-1 ${item.available ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}
                    >
                      {item.available ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                      {item.available ? 'Visible' : 'Hidden'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(item)}
                      className="border-blue-500 text-blue-400"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteItem(item)}
                      className="border-red-500 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-stone-800 border-stone-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="border-stone-600 text-stone-400">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving} className="bg-green-600 hover:bg-green-500">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-stone-800 border-stone-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-stone-600 text-stone-400">
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
