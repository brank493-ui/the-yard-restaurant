'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Eye, EyeOff, Gift } from 'lucide-react';
import { getInMemoryStore } from '@/lib/in-memory-store';

interface SpecialOffer {
  id: string;
  title: string;
  titleFr?: string;
  description: string;
  descriptionFr?: string;
  icon: string;
  isActive: boolean;
  order: number;
}

const offerIcons = [
  { value: '🎁', label: '🎁 Gift' },
  { value: '🍽️', label: '🍽️ Food' },
  { value: '🍸', label: '🍸 Drinks' },
  { value: '👨‍👩‍👧‍👦', label: '👨‍👩‍👧‍👦 Family' },
  { value: '🥐', label: '🥐 Breakfast' },
  { value: '🎉', label: '🎉 Celebration' },
  { value: '⏰', label: '⏰ Time-based' },
  { value: '💰', label: '💰 Discount' },
  { value: '⭐', label: '⭐ Featured' },
];

export default function OffersManager() {
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [offerFormData, setOfferFormData] = useState<Partial<SpecialOffer>>({
    title: '',
    titleFr: '',
    description: '',
    descriptionFr: '',
    icon: '🎁',
    isActive: true,
    order: 1,
  });
  const [savingOffer, setSavingOffer] = useState(false);

  // Fetch special offers from API
  const fetchSpecialOffers = useCallback(async () => {
    try {
      const res = await fetch('/api/offers?all=true');
      if (res.ok) {
        const data = await res.json();
        setSpecialOffers(data);
      } else {
        console.error('Failed to fetch special offers');
      }
    } catch (error) {
      console.error('Error fetching special offers:', error);
    }
  }, []);

  const handleAddOffer = () => {
    setIsAddingOffer(true);
    setEditingOffer(null);
    setOfferFormData({
      title: '',
      titleFr: '',
      description: '',
      descriptionFr: '',
      icon: '🎁',
      isActive: true,
      order: 1,
    });
  };

  const handleEditOffer = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setIsAddingOffer(false);
    setOfferFormData({
      title: offer.title,
      titleFr: offer.titleFr || '',
      description: offer.description,
      descriptionFr: offer.descriptionFr || '',
      icon: offer.icon || '🎁',
      isActive: offer.isActive,
      order: offer.order ?? 1,
    });
  };

  const handleSaveOffer = async () => {
    if (!offerFormData.title || !offerFormData.description) {
      toast.error('Title and description are required');
      return;
    }

    setSavingOffer(true);
    try {
      const url = isAddingOffer ? '/api/offers' : `/api/offers/${editingOffer?.id}`;
      const method = isAddingOffer ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerFormData),
      });
      
      if (res.ok) {
        toast.success(isAddingOffer ? 'Special offer added!' : 'Special offer updated!');
        setIsAddingOffer(false);
        setEditingOffer(null);
        setOfferFormData({
          title: '',
          titleFr: '',
          description: '',
          descriptionFr: '',
          icon: '🎁',
          isActive: true,
          order: 1,
        });
        await fetchSpecialOffers();
      } else {
        toast.error('Failed to save special offer');
      }
    } catch (error) {
      console.error('Error saving offer:', error);
      toast.error('Failed to save special offer');
    } finally {
      setSavingOffer(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this special offer?')) return;
    
    try {
      const res = await fetch(`/api/offers/${id}`, { method: 'DELETE' });
      
      if (res.ok) {
        toast.success('Special offer deleted');
        await fetchSpecialOffers();
      } else {
        toast.error('Failed to delete special offer');
      }
    } catch (error) {
      console.error('Error deleting special offer:', error);
      toast.error('Failed to delete special offer');
    }
  };

  const handleToggleOfferStatus = async (offer: SpecialOffer) => {
    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      
      if (res.ok) {
        toast.success(`Offer ${!offer.isActive ? 'activated' : 'deactivated'}`);
        await fetchSpecialOffers();
      } else {
        toast.error('Failed to update offer status');
      }
    } catch (error) {
      console.error('Error toggling offer status:', error);
      toast.error('Failed to update offer status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            <span>Special Offers Management</span>
          </h2>
          <p className="text-stone-400 text-sm">Manage special offers shown on the website</p>
        </div>

        <Button onClick={handleAddOffer} className="bg-amber-600 hover:bg-amber-500 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Special Offer
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(isAddingOffer || editingOffer) && (
        <Card className="bg-stone-800 border-amber-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-400 text-base">
              {isAddingOffer ? 'Add Special Offer' : `Edit: ${editingOffer?.title}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-stone-300 text-xs">Title (English) *</Label>
                <Input
                  value={offerFormData.title || ''}
                  onChange={(e) => setOfferFormData({ ...offerFormData, title: e.target.value })}
                  className="bg-stone-700 border-stone-600 text-white"
                  placeholder="e.g., Lunch Special"
                />
              </div>
              <div>
                <Label className="text-stone-300 text-xs">Title (French)</Label>
                <Input
                  value={offerFormData.titleFr || ''}
                  onChange={(e) => setOfferFormData({ ...offerFormData, titleFr: e.target.value })}
                  className="bg-stone-700 border-stone-600 text-white"
                  placeholder="ex: Déjeuner Spécial"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-stone-300 text-xs">Description (English) *</Label>
                <Textarea
                  value={offerFormData.description || ''}
                  onChange={(e) => setOfferFormData({ ...offerFormData, description: e.target.value })}
                  className="bg-stone-700 border-stone-600 text-white"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-stone-300 text-xs">Description (French)</Label>
                <Textarea
                  value={offerFormData.descriptionFr || ''}
                  onChange={(e) => setOfferFormData({ ...offerFormData, descriptionFr: e.target.value })}
                  className="bg-stone-700 border-stone-600 text-white"
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-stone-300 text-xs">Icon</Label>
                <Select
                  value={offerFormData.icon || '🎁'}
                  onValueChange={(v) => setOfferFormData({ ...offerFormData, icon: v })}
                >
                  <SelectTrigger className="bg-stone-700 border-stone-600 text-white">
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-700 border-stone-600">
                    {offerIcons.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={offerFormData.isActive ?? true}
                  onCheckedChange={(v) => setOfferFormData({ ...offerFormData, isActive: v })}
                />
                <Label className="text-stone-300 text-xs">Active (show on website)</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveOffer}
                disabled={savingOffer}
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                {savingOffer ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsAddingOffer(false); setEditingOffer(null); }}
                className="border-stone-600"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {specialOffers.map((offer) => (
          <Card
            key={offer.id}
            className={`bg-stone-800 border rounded-lg overflow-hidden transition-all ${
              offer.isActive
                ? 'border-amber-500/50 hover:border-amber-400'
                : 'border-stone-700 opacity-60'
            }`}
          >
            <div className="h-20 bg-gradient-to-br from-amber-900/30 to-stone-700 flex items-center justify-center">
              <span className="text-4xl">{offer.icon}</span>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium text-sm truncate">{offer.title}</span>
                <Badge className={`${offer.isActive ? 'bg-green-600' : 'bg-stone-600'} text-xs`}>
                  {offer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-stone-400 text-xs line-clamp-2 mb-2">{offer.description}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditOffer(offer)}
                  className="text-blue-400 hover:bg-stone-700 h-7 w-7 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleOfferStatus(offer)}
                  className={`${offer.isActive ? 'text-orange-400' : 'text-green-400'} hover:bg-stone-700 h-7 px-2`}
                  title={offer.isActive ? 'Deactivate' : 'Activate'}
                >
                  {offer.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteOffer(offer.id)}
                  className="text-red-400 hover:bg-stone-700 h-7 w-7 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {specialOffers.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-stone-600 rounded-lg">
          <Gift className="h-12 w-12 text-stone-500 mx-auto mb-3" />
          <p className="text-stone-400">No special offers yet</p>
          <p className="text-stone-500 text-sm">Click "Add Special Offer" to create your first special offer</p>
        </div>
      )}
    </div>
  );
}
