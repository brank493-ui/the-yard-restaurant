'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, Unsubscribe, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Star, Trash2, ChefHat, Loader2, Image as ImageIcon, Plus, Minus } from 'lucide-react';

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

export default function ChefPicksManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
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

  // Featured items (upper board)
  const featuredItems = menuItems.filter(item => item.featured);
  // All menu items (lower board)
  const allItems = menuItems;

  // Toggle featured status
  const toggleFeatured = async (item: MenuItem, makeFeatured: boolean) => {
    setUpdating(item.id);
    try {
      if (db) {
        // Update in Firestore
        const docRef = doc(db, 'menuItems', item.id);
        await updateDoc(docRef, {
          isPopular: makeFeatured,
          featured: makeFeatured,
          updatedAt: new Date(),
        });
        toast.success(makeFeatured 
          ? `${item.name} added to Chef Picks!` 
          : `${item.name} removed from Chef Picks`
        );
      } else {
        // Use API
        const res = await fetch(`/api/menu/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featured: makeFeatured, isPopular: makeFeatured }),
        });
        if (res.ok) {
          // Optimistic update
          setMenuItems(prev => prev.map(i => 
            i.id === item.id ? { ...i, featured: makeFeatured } : i
          ));
          toast.success(makeFeatured 
            ? `${item.name} added to Chef Picks!` 
            : `${item.name} removed from Chef Picks`
          );
        }
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
      toast.error('Failed to update item');
    } finally {
      setUpdating(null);
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
      {/* Upper Board - Featured Items */}
      <Card className="bg-stone-800 border-stone-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-amber-400" />
            <div>
              <CardTitle className="text-white">Chef Picks - Featured Items</CardTitle>
              <CardDescription className="text-stone-400">
                These items are displayed prominently on the website homepage
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {featuredItems.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No featured items yet</p>
              <p className="text-sm">Click the star icon on items below to add them to Chef Picks</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {featuredItems.map((item) => (
                <div
                  key={item.id}
                  className="relative bg-stone-700/50 rounded-lg overflow-hidden border border-amber-500/30"
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
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-stone-500" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-amber-600 text-white">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Featured
                    </Badge>
                  </div>
                  
                  {/* Details */}
                  <div className="p-3">
                    <h4 className="text-white font-medium truncate">{item.name}</h4>
                    <p className="text-stone-400 text-xs truncate">{item.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-amber-400 font-bold">{formatCurrency(item.price)}</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => toggleFeatured(item, false)}
                        disabled={updating === item.id}
                        className="h-7 text-xs"
                      >
                        {updating === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lower Board - All Menu Items */}
      <Card className="bg-stone-800 border-stone-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-stone-400" />
            Full Menu
          </CardTitle>
          <CardDescription className="text-stone-400">
            Click the star to add items to Chef Picks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {allItems.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                <p>No menu items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-4">
                {allItems.map((item) => (
                  <div
                    key={item.id}
                    className={`relative bg-stone-700/50 rounded-lg overflow-hidden border transition-all ${
                      item.featured 
                        ? 'border-amber-500/50 ring-1 ring-amber-500/30' 
                        : 'border-stone-600 hover:border-stone-500'
                    }`}
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
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-stone-500" />
                        </div>
                      )}
                      {/* Category Badge */}
                      <Badge className="absolute top-2 left-2 bg-stone-800/80 text-stone-300 text-xs">
                        {item.category}
                      </Badge>
                      {/* Available Badge */}
                      {!item.available && (
                        <Badge className="absolute top-2 right-2 bg-red-500/80 text-white text-xs">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="p-3">
                      <h4 className="text-white font-medium truncate text-sm">{item.name}</h4>
                      <p className="text-stone-400 text-xs truncate">{item.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-amber-400 font-bold text-sm">{formatCurrency(item.price)}</span>
                        <Button
                          size="sm"
                          variant={item.featured ? "default" : "outline"}
                          onClick={() => toggleFeatured(item, !item.featured)}
                          disabled={updating === item.id}
                          className={`h-7 text-xs ${
                            item.featured 
                              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                              : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/20'
                          }`}
                        >
                          {updating === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : item.featured ? (
                            <>
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Featured
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Feature
                            </>
                          )}
                        </Button>
                      </div>
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
