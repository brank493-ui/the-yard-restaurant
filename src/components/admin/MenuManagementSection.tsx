'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, Unsubscribe, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Plus, Pencil, Trash2, Star, Image as ImageIcon, Loader2, 
  Search, Filter, Package, CheckCircle, XCircle, Eye, EyeOff 
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  featured: boolean;
  available: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categories = [
  { value: 'appetizer', label: 'Appetizers' },
  { value: 'main', label: 'Main Courses' },
  { value: 'grilled', label: 'Grilled Specialties' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'dessert', label: 'Desserts' },
  { value: 'beverage', label: 'Beverages' },
  { value: 'cocktail', label: 'Cocktails' },
];

export default function MenuManagementSection() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main',
    image: '',
    featured: false,
    available: true,
  });

  const unsubscribersRef = useRef<Unsubscribe[]>([]);

  // Real-time menu items listener
  useEffect(() => {
    if (!db) {
      // No Firebase, load from API
      fetch('/api/menu?all=true')
        .then(res => res.json())
        .then(data => {
          setMenuItems(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
      return;
    }

    // Clean up previous listeners
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    // Menu items listener
    const menuQuery = query(
      collection(db, 'menuItems'),
      orderBy('name', 'asc')
    );
    
    unsubscribersRef.current.push(onSnapshot(menuQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          description: d.description || '',
          price: d.price || 0,
          category: d.category || 'main',
          image: d.image,
          featured: d.isPopular || d.featured || false,
          available: d.isAvailable !== false,
          createdAt: d.createdAt?.toDate?.(),
          updatedAt: d.updatedAt?.toDate?.(),
        } as MenuItem;
      });
      setMenuItems(data);
      setLoading(false);
    }));

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, []);

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'available' && item.available) ||
                         (statusFilter === 'unavailable' && !item.available) ||
                         (statusFilter === 'featured' && item.featured);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'main',
      image: '',
      featured: false,
      available: true,
    });
  };

  // Open edit dialog
  const openEditDialog = (item: MenuItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image: item.image || '',
      featured: item.featured,
      available: item.available,
    });
    setEditDialogOpen(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (item: MenuItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  // Create new menu item
  const handleCreate = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          categorySlug: formData.category,
          image: formData.image,
          featured: formData.featured,
          available: formData.available,
        }),
      });

      if (res.ok) {
        toast.success('Menu item created successfully!');
        setCreateDialogOpen(false);
        resetForm();
        // Refresh menu items
        const menuRes = await fetch('/api/menu?all=true');
        if (menuRes.ok) {
          const data = await menuRes.json();
          setMenuItems(data);
        }
      } else {
        toast.error('Failed to create menu item');
      }
    } catch (error) {
      console.error('Error creating menu item:', error);
      toast.error('Failed to create menu item');
    } finally {
      setSaving(false);
    }
  };

  // Update menu item
  const handleUpdate = async () => {
    if (!selectedItem || !formData.name || !formData.price) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/menu/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          categorySlug: formData.category,
          image: formData.image,
          featured: formData.featured,
          isPopular: formData.featured,
          available: formData.available,
          isAvailable: formData.available,
        }),
      });

      if (res.ok) {
        toast.success('Menu item updated successfully!');
        setEditDialogOpen(false);
        resetForm();
        // Refresh menu items
        const menuRes = await fetch('/api/menu?all=true');
        if (menuRes.ok) {
          const data = await menuRes.json();
          setMenuItems(data);
        }
      } else {
        toast.error('Failed to update menu item');
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast.error('Failed to update menu item');
    } finally {
      setSaving(false);
    }
  };

  // Delete menu item
  const handleDelete = async () => {
    if (!selectedItem) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/menu/${selectedItem.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Menu item deleted successfully!');
        setDeleteDialogOpen(false);
        setSelectedItem(null);
        // Refresh menu items
        const menuRes = await fetch('/api/menu?all=true');
        if (menuRes.ok) {
          const data = await menuRes.json();
          setMenuItems(data);
        }
      } else {
        toast.error('Failed to delete menu item');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    } finally {
      setSaving(false);
    }
  };

  // Toggle availability
  const toggleAvailability = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          available: !item.available,
          isAvailable: !item.available,
        }),
      });

      if (res.ok) {
        toast.success(`${item.name} is now ${!item.available ? 'available' : 'unavailable'}`);
        // Optimistic update
        setMenuItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, available: !i.available } : i
        ));
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update availability');
    }
  };

  // Toggle featured
  const toggleFeatured = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          featured: !item.featured,
          isPopular: !item.featured,
        }),
      });

      if (res.ok) {
        toast.success(`${item.name} ${!item.featured ? 'added to' : 'removed from'} featured items`);
        // Optimistic update
        setMenuItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, featured: !i.featured } : i
        ));
      }
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast.error('Failed to update featured status');
    }
  };

  const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString()} XAF`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="ml-2 text-stone-400">Loading menu items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-white text-lg font-semibold">Menu Items ({filteredItems.length})</h3>
          <p className="text-stone-400 text-sm">Manage your restaurant's menu</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-amber-600 hover:bg-amber-500 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add New Item
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-stone-800 border-stone-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-stone-700 border-stone-600 text-white"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-stone-700 border-stone-600 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-stone-700">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-stone-700 border-stone-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-stone-700">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      <ScrollArea className="h-[600px]">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 text-stone-500">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No menu items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-2">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`bg-stone-800 border-stone-700 overflow-hidden ${
                  !item.available ? 'opacity-70' : ''
                }`}
              >
                {/* Image */}
                <div className="h-36 bg-stone-700 relative">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-stone-600" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge className="bg-stone-900/80 text-stone-300 text-xs">
                      {categories.find(c => c.value === item.category)?.label || item.category}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {item.featured && (
                      <Badge className="bg-amber-600 text-white text-xs">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    )}
                    {!item.available && (
                      <Badge className="bg-red-500 text-white text-xs">
                        Hidden
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <CardContent className="p-4">
                  <h4 className="text-white font-medium truncate">{item.name}</h4>
                  <p className="text-stone-400 text-xs line-clamp-2 mt-1">{item.description}</p>
                  
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-amber-400 font-bold">{formatCurrency(item.price)}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleFeatured(item)}
                        className={`h-8 w-8 ${
                          item.featured 
                            ? 'text-amber-400 hover:text-amber-300' 
                            : 'text-stone-500 hover:text-amber-400'
                        }`}
                        title={item.featured ? 'Remove from featured' : 'Add to featured'}
                      >
                        <Star className={`w-4 h-4 ${item.featured ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleAvailability(item)}
                        className={`h-8 w-8 ${
                          item.available 
                            ? 'text-green-400 hover:text-green-300' 
                            : 'text-red-400 hover:text-red-300'
                        }`}
                        title={item.available ? 'Make unavailable' : 'Make available'}
                      >
                        {item.available ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(item)}
                        className="h-8 w-8 text-stone-400 hover:text-amber-400"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDeleteDialog(item)}
                        className="h-8 w-8 text-stone-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-stone-800 border-stone-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Add New Menu Item</DialogTitle>
            <DialogDescription className="text-stone-400">
              Create a new item for your menu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-stone-300">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                placeholder="Item name"
              />
            </div>
            <div>
              <Label className="text-stone-300">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                placeholder="Item description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-stone-300">Price (XAF) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-stone-700 border-stone-600 text-white"
                  placeholder="5000"
                />
              </div>
              <div>
                <Label className="text-stone-300">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-stone-700 border-stone-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-700">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-stone-300">Image URL</Label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.featured}
                  onCheckedChange={(v) => setFormData({ ...formData, featured: v })}
                />
                <Label className="text-stone-300">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.available}
                  onCheckedChange={(v) => setFormData({ ...formData, available: v })}
                />
                <Label className="text-stone-300">Available</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-stone-600 text-stone-300">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-stone-800 border-stone-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Edit Menu Item</DialogTitle>
            <DialogDescription className="text-stone-400">
              Update item details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-stone-300">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
              />
            </div>
            <div>
              <Label className="text-stone-300">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-stone-300">Price (XAF) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-stone-700 border-stone-600 text-white"
                />
              </div>
              <div>
                <Label className="text-stone-300">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-stone-700 border-stone-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-700">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-stone-300">Image URL</Label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
              />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.featured}
                  onCheckedChange={(v) => setFormData({ ...formData, featured: v })}
                />
                <Label className="text-stone-300">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.available}
                  onCheckedChange={(v) => setFormData({ ...formData, available: v })}
                />
                <Label className="text-stone-300">Available</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-stone-600 text-stone-300">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-stone-800 border-stone-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stone-600 text-stone-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
