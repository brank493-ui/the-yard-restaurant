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
import { Menu, Plus, Edit, Trash2, Eye, EyeOff, Star, StarOff, Search, Loader2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
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

  // Separate items by visibility
  const visibleItems = menuItems.filter(item => item.available);
  const hiddenItems = menuItems.filter(item => !item.available);

  // Filter items by category and search
  const filterItems = (items: MenuItem[]) => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const filteredVisibleItems = filterItems(visibleItems);
  const filteredHiddenItems = filterItems(hiddenItems);

  // Move to visible (Upper Board)
  const moveToVisible = async (item: MenuItem) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'menu', item.id), { available: true });
      toast.success(`"${item.name}" is now visible on the website menu`);
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  // Move to hidden (Lower Board)
  const moveToHidden = async (item: MenuItem) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'menu', item.id), { available: false });
      toast.success(`"${item.name}" removed from website menu`);
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
      available: false, // New items start in lower board
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
          <span className="text-stone-300">Visible on Website</span>
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

  // Menu Item Card Component
  const MenuItemCard = ({ item, isUpperBoard }: { item: MenuItem; isUpperBoard: boolean }) => (
    <div 
      key={item.id} 
      className={`p-4 rounded-lg border transition-all ${
        isUpperBoard 
          ? 'bg-gradient-to-r from-green-900/30 to-stone-800 border-green-500/40 hover:border-green-400' 
          : 'bg-stone-800/50 border-stone-700 hover:border-stone-600'
      }`}
    >
      <div className="flex items-start gap-4">
        {item.image && (
          <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-white font-semibold text-lg">{item.name}</p>
            {item.featured && <Star className="w-5 h-5 text-amber-400 fill-current" />}
            {isUpperBoard && (
              <Badge className="bg-green-600 text-xs">Visible on Website</Badge>
            )}
          </div>
          <p className="text-stone-400 text-sm line-clamp-2 mb-2">{item.description}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-amber-400 font-bold text-xl">{item.price.toLocaleString()} XAF</p>
            <Badge className="bg-stone-600 text-xs">{categories.find(c => c.value === item.category)?.icon} {categories.find(c => c.value === item.category)?.label}</Badge>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-stone-700">
        {isUpperBoard ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => moveToHidden(item)}
            className="flex-1 border-orange-500 text-orange-400 hover:bg-orange-500/20"
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            Remove from Menu
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => moveToVisible(item)}
            className="flex-1 border-green-500 text-green-400 hover:bg-green-500/20"
          >
            <ArrowUp className="w-4 h-4 mr-2" />
            Add to Website Menu
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggleFeatured(item)}
          className={`border-amber-500 ${item.featured ? 'text-amber-400' : 'text-stone-400'} hover:bg-amber-500/20`}
        >
          {item.featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openEditDialog(item)}
          className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => deleteItem(item)}
          className="border-red-500 text-red-400 hover:bg-red-500/20"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-stone-800 border-stone-700">
        <CardHeader className="border-b border-stone-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2 text-xl">
                <Menu className="h-6 w-6 text-green-400" />
                Menu Management
              </CardTitle>
              <p className="text-stone-400 text-sm mt-1">
                Manage menu items - Upper board shows items visible on website, lower board shows items available to add
              </p>
            </div>
            <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-500">
              <Plus className="w-4 h-4 mr-2" />
              Add New Item
            </Button>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mt-4">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-stone-700 border-stone-600 text-white"
              />
            </div>
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="bg-stone-700 flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="data-[state=active]:bg-amber-600 text-xs">All</TabsTrigger>
                {categories.slice(0, 4).map(cat => (
                  <TabsTrigger key={cat.value} value={cat.value} className="data-[state=active]:bg-amber-600 text-xs">
                    {cat.icon}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
      </Card>

      {/* Two-Board Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upper Board - Visible on Website */}
        <Card className="bg-gradient-to-b from-green-900/20 to-stone-800 border-green-500/40">
          <CardHeader className="border-b border-green-500/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-400" />
                Upper Board
              </CardTitle>
              <Badge className="bg-green-600 text-white">{filteredVisibleItems.length} items</Badge>
            </div>
            <p className="text-green-400/80 text-sm">Items visible on the website menu</p>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[450px]">
              {filteredVisibleItems.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <EyeOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items visible on website</p>
                  <p className="text-sm">Add items from the lower board</p>
                </div>
              ) : (
                <div className="space-y-3 pr-2">
                  {filteredVisibleItems.map(item => (
                    <MenuItemCard key={item.id} item={item} isUpperBoard={true} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Lower Board - Available to Add */}
        <Card className="bg-stone-800 border-stone-700">
          <CardHeader className="border-b border-stone-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-stone-400" />
                Lower Board
              </CardTitle>
              <Badge className="bg-stone-600 text-white">{filteredHiddenItems.length} items</Badge>
            </div>
            <p className="text-stone-400 text-sm">Items available to add to website menu</p>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[450px]">
              {filteredHiddenItems.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <Menu className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hidden items</p>
                  <p className="text-sm">All items are visible on website</p>
                </div>
              ) : (
                <div className="space-y-3 pr-2">
                  {filteredHiddenItems.map(item => (
                    <MenuItemCard key={item.id} item={item} isUpperBoard={false} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

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
