'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Star, Trash2, ChefHat, Loader2, Search, Image as ImageIcon, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Unsubscribe } from 'firebase/firestore';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  featured: boolean;
  available: boolean;
}

export default function ChefPicksManager() {
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const unsubscribersRef = useRef<Unsubscribe[]>([]);

  // Featured items (Chef's Recommendations - appear on website)
  const featuredItems = allMenuItems.filter(item => item.featured);
  
  // All items for the lower board (searchable)
  const filteredAllItems = searchQuery 
    ? allMenuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allMenuItems;

  // Real-time menu listener
  useEffect(() => {
    if (!db) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    // Cleanup previous listeners
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    // Try with orderBy first, fallback to simple query if index doesn't exist
    const orderedQuery = query(collection(db, 'menuItems'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(orderedQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          image: data.image,
          featured: data.isPopular || data.featured || false,
          available: data.isAvailable !== false,
        } as MenuItem;
      });
      setAllMenuItems(items);
      setLoading(false);
    }, async (error) => {
      console.error('Error with ordered query, trying simple query:', error);
      // Fallback to simple query without orderBy
      try {
        const simpleQuery = query(collection(db, 'menuItems'));
        const simpleUnsub = onSnapshot(simpleQuery, (snapshot) => {
          const items = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              description: data.description,
              price: data.price,
              category: data.category,
              image: data.image,
              featured: data.isPopular || data.featured || false,
              available: data.isAvailable !== false,
            } as MenuItem;
          });
          setAllMenuItems(items);
          setLoading(false);
        }, (err) => {
          console.error('Error fetching menu:', err);
          setLoading(false);
        });
        unsubscribersRef.current.push(simpleUnsub);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
        setLoading(false);
      }
    });

    unsubscribersRef.current.push(unsubscribe);

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, []);

  // Add to Chef's Picks (make featured)
  const addToChefPicks = async (item: MenuItem) => {
    if (!db) return;
    setUpdating(item.id);
    
    try {
      await updateDoc(doc(db, 'menuItems', item.id), { 
        isPopular: true,
        featured: true,
        updatedAt: new Date()
      });
      toast.success(`✨ "${item.name}" added to Chef's Recommendations!`);
    } catch (error) {
      toast.error('Failed to add item');
    } finally {
      setUpdating(null);
    }
  };

  // Remove from Chef's Picks (unfeature)
  const removeFromChefPicks = async (item: MenuItem) => {
    if (!db) return;
    setUpdating(item.id);
    
    try {
      await updateDoc(doc(db, 'menuItems', item.id), { 
        isPopular: false,
        featured: false,
        updatedAt: new Date()
      });
      toast.success(`Removed "${item.name}" from Chef's Recommendations`);
    } catch (error) {
      toast.error('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString()} XAF`;

  const categoryIcons: Record<string, string> = { 
    appetizer: '🥗', main: '🍽️', grilled: '🔥', seafood: '🦐', 
    vegetarian: '🥬', dessert: '🍰', beverage: '🥤', cocktail: '🍸' 
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        <span className="ml-3 text-stone-400 text-lg">Loading menu items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== UPPER BOARD - CHEF'S RECOMMENDATIONS ========== */}
      <Card className="bg-gradient-to-br from-stone-800 to-stone-850 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10">
        <CardHeader className="border-b border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <ChefHat className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-amber-400">Chef's Recommendations</CardTitle>
              <CardDescription className="text-stone-400">
                These items are displayed on the website's homepage in the "Chef's Recommendations" section
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-amber-600 text-white text-sm px-3 py-1">
              <Star className="w-4 h-4 mr-1 fill-current" />
              {featuredItems.length} Featured Items
            </Badge>
            <Badge variant="outline" className="border-stone-600 text-stone-400">
              Updates website in real-time
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {featuredItems.length === 0 ? (
            <div className="text-center py-12 bg-stone-700/20 rounded-lg border border-dashed border-stone-600">
              <Star className="h-16 w-16 mx-auto mb-4 text-stone-500 opacity-50" />
              <p className="text-stone-400 text-lg font-medium">No Chef's Recommendations yet</p>
              <p className="text-stone-500 text-sm mt-2">Click the ⭐ star button on items below to add them here</p>
            </div>
          ) : (
            <ScrollArea className="h-72">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-2">
                {featuredItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative bg-stone-700/40 rounded-xl overflow-hidden border border-amber-500/30 hover:border-amber-500/60 transition-all group"
                  >
                    {/* Image */}
                    <div className="h-32 bg-stone-600 relative">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-600 to-stone-700">
                          <ImageIcon className="w-10 h-10 text-stone-500" />
                        </div>
                      )}
                      {/* Featured Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-amber-600 text-white shadow-lg">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      </div>
                      {/* Available Badge */}
                      {!item.available && (
                        <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold truncate">{item.name}</h4>
                          <p className="text-stone-400 text-xs truncate">{item.description || 'No description'}</p>
                        </div>
                        <span className="text-amber-400 font-bold whitespace-nowrap">{formatCurrency(item.price)}</span>
                      </div>
                      
                      {/* Category */}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-stone-600/50 text-stone-300 text-xs">
                          {categoryIcons[item.category]} {item.category}
                        </Badge>
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFromChefPicks(item)}
                        disabled={updating === item.id}
                        className="w-full mt-3 bg-red-600/80 hover:bg-red-600 text-white"
                      >
                        {updating === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Remove from Chef's Picks
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ========== LOWER BOARD - FULL MENU ========== */}
      <Card className="bg-stone-800 border-stone-700">
        <CardHeader className="border-b border-stone-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Star className="h-5 w-5 text-stone-400" />
                Full Menu
              </CardTitle>
              <CardDescription className="text-stone-400">
                Click the ⭐ star button to add items to Chef's Recommendations above
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-stone-700 border-stone-600 text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-stone-600 text-white">
              {allMenuItems.length} Total Items
            </Badge>
            <Badge className="bg-green-600/20 text-green-400 border border-green-500/30">
              {allMenuItems.filter(i => i.available).length} Available
            </Badge>
            <Badge className="bg-amber-600/20 text-amber-400 border border-amber-500/30">
              {featuredItems.length} Featured
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[500px]">
            {filteredAllItems.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                <p>No menu items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-2">
                {filteredAllItems.map((item) => (
                  <div
                    key={item.id}
                    className={`relative bg-stone-700/40 rounded-xl overflow-hidden border transition-all ${
                      item.featured 
                        ? 'border-amber-500/50 ring-2 ring-amber-500/20' 
                        : 'border-stone-600 hover:border-stone-500'
                    } ${!item.available ? 'opacity-60' : ''}`}
                  >
                    {/* Image */}
                    <div className="h-28 bg-stone-600 relative">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-600 to-stone-700">
                          <ImageIcon className="w-8 h-8 text-stone-500" />
                        </div>
                      )}
                      {/* Category Badge */}
                      <Badge className="absolute top-2 left-2 bg-stone-800/90 text-stone-300 text-xs backdrop-blur-sm">
                        {categoryIcons[item.category]} {item.category}
                      </Badge>
                      {/* Status Badges */}
                      {!item.available && (
                        <Badge className="absolute top-2 right-2 bg-red-500/90 text-white text-xs">
                          Unavailable
                        </Badge>
                      )}
                      {item.featured && (
                        <Badge className="absolute bottom-2 right-2 bg-amber-500 text-white text-xs">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          In Chef Picks
                        </Badge>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="p-3">
                      <h4 className="text-white font-medium truncate text-sm">{item.name}</h4>
                      <p className="text-stone-400 text-xs truncate">{item.description || 'No description'}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-amber-400 font-bold text-sm">{formatCurrency(item.price)}</span>
                      </div>
                      
                      {/* Action Button */}
                      <Button
                        size="sm"
                        variant={item.featured ? "default" : "outline"}
                        onClick={() => item.featured ? removeFromChefPicks(item) : addToChefPicks(item)}
                        disabled={updating === item.id}
                        className={`w-full mt-3 ${
                          item.featured 
                            ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                            : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/20'
                        }`}
                      >
                        {updating === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : item.featured ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            In Chef's Picks
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-2" />
                            Add to Chef's Picks
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
