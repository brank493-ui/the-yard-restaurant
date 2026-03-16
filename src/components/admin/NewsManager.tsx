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
import { Plus, Pencil, Trash2, Eye, EyeOff, FileText, Loader2 } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image: string;
  active: boolean;
  createdAt: string;
}

export default function NewsManager() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [newsFormData, setNewsFormData] = useState<Partial<NewsItem>>({
    title: '',
    description: '',
    image: '',
    active: true,
  });
  const [savingNews, setSavingNews] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch news from API
  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/news?all=true');
      if (res.ok) {
        const data = await res.json();
        setNewsItems(data);
      } else {
        console.error('Failed to fetch news');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleAddNews = () => {
    setIsAddingNews(true);
    setEditingNews(null);
    setNewsFormData({
      title: '',
      description: '',
      image: '',
      active: true,
    });
  };

  const handleEditNews = (news: NewsItem) => {
    setEditingNews(news);
    setIsAddingNews(false);
    setNewsFormData({
      title: news.title,
      description: news.description,
      image: news.image || '',
      active: news.active,
    });
  };

  const handleSaveNews = async () => {
    if (!newsFormData.title || !newsFormData.description) {
      toast.error('Title and description are required');
      return;
    }

    setSavingNews(true);
    try {
      if (editingNews) {
        // Update existing news
        const res = await fetch(`/api/news/${editingNews.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newsFormData),
        });
        
        if (res.ok) {
          toast.success('News item updated successfully');
          fetchNews();
        } else {
          toast.error('Failed to update news item');
        }
      } else {
        // Create new news
        const res = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newsFormData),
        });
        
        if (res.ok) {
          toast.success('News item created successfully');
          fetchNews();
        } else {
          toast.error('Failed to create news item');
        }
      }
      
      setIsAddingNews(false);
      setEditingNews(null);
    } catch (error) {
      console.error('Error saving news:', error);
      toast.error('Failed to save news item');
    } finally {
      setSavingNews(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;
    
    try {
      const res = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('News item deleted successfully');
        fetchNews();
      } else {
        toast.error('Failed to delete news item');
      }
    } catch (error) {
      console.error('Error deleting news:', error);
      toast.error('Failed to delete news item');
    }
  };

  const handleToggleNewsStatus = async (news: NewsItem) => {
    try {
      const res = await fetch(`/api/news/${news.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !news.active }),
      });
      
      if (res.ok) {
        toast.success(`News item ${news.active ? 'deactivated' : 'activated'} successfully`);
        fetchNews();
      } else {
        toast.error('Failed to update news item status');
      }
    } catch (error) {
      console.error('Error toggling news status:', error);
      toast.error('Failed to update news item status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-400" />
            Latest News Management
          </h2>
          <p className="text-stone-400 text-sm mt-1">Manage news and announcements shown on the website</p>
        </div>
        <Button
          onClick={handleAddNews}
          className="bg-amber-600 hover:bg-amber-500 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add News
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNews || editingNews) && (
        <Card className="bg-stone-800 border-blue-500/50">
          <CardHeader>
            <CardTitle className="text-amber-400">
              {isAddingNews ? 'Add News Item' : `Edit: ${editingNews?.title}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-stone-300">Title *</Label>
              <Input
                value={newsFormData.title || ''}
                onChange={(e) => setNewsFormData({ ...newsFormData, title: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                placeholder="News title..."
              />
            </div>
            <div>
              <Label className="text-stone-300">Description *</Label>
              <Textarea
                value={newsFormData.description || ''}
                onChange={(e) => setNewsFormData({ ...newsFormData, description: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                rows={3}
                placeholder="News description..."
              />
            </div>
            <div>
              <Label className="text-stone-300">Image URL</Label>
              <Input
                value={newsFormData.image || ''}
                onChange={(e) => setNewsFormData({ ...newsFormData, image: e.target.value })}
                className="bg-stone-700 border-stone-600 text-white"
                placeholder="https://example.com/image.jpg"
              />
              {newsFormData.image && (
                <div className="mt-2 h-24 rounded-lg overflow-hidden border border-stone-600">
                  <img
                    src={newsFormData.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newsFormData.active ?? true}
                onCheckedChange={(v) => setNewsFormData({ ...newsFormData, active: v })}
              />
              <Label className="text-stone-300">Active (show on website)</Label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveNews}
                disabled={savingNews}
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                {savingNews ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsAddingNews(false); setEditingNews(null); }}
                className="border-stone-600"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* News List */}
      <div className="space-y-3">
        {newsItems.map((news) => (
          <Card
            key={news.id}
            className={`bg-stone-800 border rounded-lg overflow-hidden transition-all ${
              news.active
                ? 'border-blue-500/50 hover:border-blue-400'
                : 'border-stone-700 opacity-60'
            }`}
          >
            <div className="flex gap-4 p-4">
              {news.image && (
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-stone-700 shrink-0">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium truncate">{news.title}</span>
                  <Badge className={`${news.active ? 'bg-green-600' : 'bg-stone-600'} text-xs`}>
                    {news.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-stone-400 text-sm line-clamp-2">{news.description}</p>
                <p className="text-stone-500 text-xs mt-1">
                  {news.createdAt ? new Date(news.createdAt).toLocaleDateString() : 'No date'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditNews(news)}
                  className="text-blue-400 hover:bg-stone-700 h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleNewsStatus(news)}
                  className={`${news.active ? 'text-orange-400' : 'text-green-400'} hover:bg-stone-700 h-8 w-8 p-0`}
                  title={news.active ? 'Deactivate' : 'Activate'}
                >
                  {news.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteNews(news.id)}
                  className="text-red-400 hover:bg-stone-700 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {newsItems.length === 0 && !loading && (
        <div className="text-center py-12 border-2 border-dashed border-stone-600 rounded-lg">
          <FileText className="h-12 w-12 text-stone-500 mx-auto mb-3" />
          <p className="text-stone-400">No news items yet</p>
          <p className="text-stone-500 text-sm">Click "Add News" to create your first news item</p>
        </div>
      )}
    </div>
  );
}
