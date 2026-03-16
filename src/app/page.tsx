'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useMenu, MenuItem as MenuItemType } from '@/contexts/MenuContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { RegisterModal } from '@/components/auth/RegisterModal';
import { UserMenu } from '@/components/auth/UserMenu';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { AdminDashboard } from '@/components/admin/MenuManagement';
import { MenuItemModal } from '@/components/order/MenuItemModal';
import { CheckoutModal } from '@/components/order/CheckoutModal';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { BookOpen, CreditCard } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';

interface Order {
  id: string;
  customerName: string;
  phone: string;
  type: string;
  totalAmount: number;
  status: string;
  items: CartItem[];
  createdAt: string;
}

interface Review {
  id: string;
  name: string;
  email?: string;
  rating: number;
  text: string;
  date: string;
  avatar: string;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image: string;
  createdAt: string;
  active: boolean;
}

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
}

// Translations
const translations = {
  en: {
    nav: { home: 'Home', menu: 'Menu', gallery: 'Gallery', reviews: 'Reviews', about: 'About', contact: 'Contact', reserveTable: 'Reserve Table', events: 'Events' },
    hero: { badge: '⭐ #2 Restaurant in Douala', tagline: 'Experience fine dining excellence in the heart of Douala. African & International cuisine crafted with passion.', viewMenu: 'View Menu', orderNow: 'Order Online', rating: 'Rating', reviews: 'Reviews', inDouala: 'In Douala', scroll: '↓ Scroll' },
    featured: { title: "Chef's", subtitle: 'Recommendations', description: 'Our most popular dishes, crafted to perfection', featured: 'Featured', addToCart: 'Add to Cart' },
    specials: { title: 'Special', subtitle: 'Offers', description: 'Limited time deals and promotions', lunchSpecial: 'Lunch Special', lunchDesc: '20% off all main courses from 12pm-3pm on weekdays', happyHour: 'Happy Hour', happyDesc: 'Buy 1 Get 1 Free on cocktails from 5pm-7pm', familyDeal: 'Family Deal', familyDesc: '4-person meal with appetizers, mains & dessert - 25,000 XAF', weekend: 'Weekend Brunch', weekendDesc: 'Free dessert with any breakfast order on weekends' },
    news: { title: 'Latest', subtitle: 'News', description: 'Stay updated with our latest announcements and events' },
    menu: { title: 'Our', subtitle: 'Menu', description: 'Explore our full selection of delicious dishes and drinks', all: 'All', cart: 'Cart', items: 'items', checkout: 'Checkout', orderSummary: 'Order Summary', total: 'Total', yourName: 'Your Name', phone: 'Phone', orderType: 'Order Type', pickup: 'Pickup', delivery: 'Delivery', deliveryAddress: 'Delivery Address', placeOrder: 'Place Order', add: '+ Add', loading: 'Loading menu...', viewDetails: 'View Details', removeFromCart: 'Remove', quantity: 'Qty' },
    categories: { appetizer: 'Appetizers', main: 'Main Courses', grilled: 'Grilled Specialties', seafood: 'Seafood', vegetarian: 'Vegetarian', dessert: 'Desserts', beverage: 'Beverages', cocktail: 'Cocktails' },
    reservation: { title: 'Make a Reservation', description: 'Book your table at The Yard', name: 'Name', email: 'Email', phone: 'Phone', guests: 'Guests', guest: 'guest', guestsPlural: 'guests', date: 'Date', time: 'Time', selectTime: 'Select time', specialRequests: 'Special Requests', confirm: 'Confirm Reservation', confirmed: 'Reservation confirmed! We will contact you shortly.', failed: 'Failed to submit reservation', occasion: 'Occasion', occasions: ['Birthday', 'Anniversary', 'Business', 'Date Night', 'Other'] },
    events: { title: 'Private Events', subtitle: '& Catering', description: 'Host your special occasions with us', bookEvent: 'Book an Event', eventType: 'Event Type', eventTypes: ['Corporate Dinner', 'Wedding Reception', 'Birthday Party', 'Private Dining', 'Business Meeting'], guestCount: 'Expected Guests', budget: 'Budget Range', details: 'Event Details', submit: 'Submit Inquiry', success: 'Event inquiry submitted! We will contact you within 24 hours.' },
    order: { title: 'Complete Your Order', success: 'Order placed successfully!', failed: 'Failed to place order', orderId: 'Order ID', trackOrder: 'Track Order', estimatedTime: 'Estimated Time', orderStatus: 'Status', statusPending: 'Pending', statusPreparing: 'Preparing', statusReady: 'Ready for Pickup', statusDelivered: 'Delivered' },
    tracking: { title: 'Order Tracking', yourOrders: 'Your Recent Orders', noOrders: 'No orders yet', placeFirst: 'Place your first order!' },
    reviews: { title: 'Customer', subtitle: 'Reviews', description: 'What our guests say about us', writeReview: 'Write a Review', rating: 'Rating', submitReview: 'Submit Review', reviewSuccess: 'Thank you for your review!' },
    gallery: { title: 'Photo', subtitle: 'Gallery', description: 'Explore our restaurant ambiance and dishes' },
    newsletter: { title: 'Stay Updated', description: 'Subscribe for special offers and updates', placeholder: 'Enter your email', subscribe: 'Subscribe', success: 'Thank you for subscribing!' },
    contact: { title: 'Contact', subtitle: 'Us', sendMessage: 'Send us a Message', name: 'Name', email: 'Email', message: 'Message', send: 'Send Message', success: 'Message sent successfully!', failed: 'Failed to send message', location: '📍 Location', contact: '📞 Contact', phoneLabel: 'Phone:', emailLabel: 'Email:', whatsapp: 'WhatsApp Us' },
    about: { title: 'Our', subtitle: 'Story', para1: "Welcome to The Yard, Douala's premier dining destination where culinary excellence meets warm hospitality. Nestled in the heart of the city, our restaurant offers a unique blend of traditional Cameroonian flavors and international cuisine, all crafted with the freshest local ingredients.", para2: 'Our passionate chefs bring years of expertise to every dish, creating memorable dining experiences that celebrate the rich culinary heritage of Cameroon while embracing modern gastronomic techniques.', fineDining: 'Fine Dining', fullBar: 'Full Bar', terrace: 'Terrace', tripAdvisorRating: 'TripAdvisor Rating' },
    hours: { title: 'Opening', subtitle: 'Hours', monThu: 'Monday - Thursday', friSat: 'Friday - Saturday', sunday: 'Sunday' },
    footer: { tagline: 'Restaurant • Bar • Terrace', rights: '© 2025 The Yard Restaurant. All rights reserved.', followUs: 'Follow Us' },
  },
  fr: {
    nav: { home: 'Accueil', menu: 'Menu', gallery: 'Galerie', reviews: 'Avis', about: 'À Propos', contact: 'Contact', reserveTable: 'Réserver', events: 'Événements' },
    hero: { badge: '⭐ #2 Restaurant à Douala', tagline: 'Découvrez l\'excellence gastronomique au cœur de Douala. Cuisine africaine et internationale préparée avec passion.', viewMenu: 'Voir le Menu', orderNow: 'Commander', rating: 'Note', reviews: 'Avis', inDouala: 'À Douala', scroll: '↓ Défiler' },
    featured: { title: 'Recommandations', subtitle: 'du Chef', description: 'Nos plats les plus populaires, préparés à la perfection', featured: 'Vedette', addToCart: 'Ajouter au Panier' },
    specials: { title: 'Offres', subtitle: 'Spéciales', description: 'Promotions et offres à durée limitée', lunchSpecial: 'Déjeuner Spécial', lunchDesc: '20% de réduction sur tous les plats principaux de 12h-15h en semaine', happyHour: 'Happy Hour', happyDesc: 'Achetez 1 obtenez 1 gratuit sur les cocktails de 17h-19h', familyDeal: 'Offre Famille', familyDesc: 'Repas pour 4 avec entrées, plats et dessert - 25 000 XAF', weekend: 'Brunch du Week-end', weekendDesc: 'Dessert gratuit avec toute commande de petit-déjeuner le week-end' },
    news: { title: 'Dernières', subtitle: 'Nouvelles', description: 'Restez informé de nos dernières annonces et événements' },
    menu: { title: 'Notre', subtitle: 'Menu', description: 'Explorez notre sélection complète de plats et boissons délicieux', all: 'Tout', cart: 'Panier', items: 'articles', checkout: 'Commander', orderSummary: 'Résumé de la Commande', total: 'Total', yourName: 'Votre Nom', phone: 'Téléphone', orderType: 'Type de Commande', pickup: 'À Emporter', delivery: 'Livraison', deliveryAddress: 'Adresse de Livraison', placeOrder: 'Passer la Commande', add: '+ Ajouter', loading: 'Chargement du menu...', viewDetails: 'Voir Détails', removeFromCart: 'Retirer', quantity: 'Qté' },
    categories: { appetizer: 'Entrées', main: 'Plats Principaux', grilled: 'Spécialités Grillées', seafood: 'Fruits de Mer', vegetarian: 'Végétarien', dessert: 'Desserts', beverage: 'Boissons', cocktail: 'Cocktails' },
    reservation: { title: 'Faire une Réservation', description: 'Réservez votre table au Yard', name: 'Nom', email: 'Email', phone: 'Téléphone', guests: 'Invités', guest: 'invité', guestsPlural: 'invités', date: 'Date', time: 'Heure', selectTime: 'Choisir l\'heure', specialRequests: 'Demandes Spéciales', confirm: 'Confirmer la Réservation', confirmed: 'Réservation confirmée! Nous vous contacterons bientôt.', failed: 'Échec de la réservation', occasion: 'Occasion', occasions: ['Anniversaire', 'Anniversaire de mariage', 'Affaires', 'Dîner romantique', 'Autre'] },
    events: { title: 'Événements Privés', subtitle: '& Traiteur', description: 'Organisez vos occasions spéciales avec nous', bookEvent: 'Réserver un Événement', eventType: 'Type d\'Événement', eventTypes: ['Dîner d\'Entreprise', 'Réception de Mariage', 'Fête d\'Anniversaire', 'Dîner Privé', 'Réunion d\'Affaires'], guestCount: 'Invités Prévus', budget: 'Fourchette de Budget', details: 'Détails de l\'Événement', submit: 'Soumettre la Demande', success: 'Demande envoyée! Nous vous contacterons sous 24h.' },
    order: { title: 'Finaliser Votre Commande', success: 'Commande passée avec succès!', failed: 'Échec de la commande', orderId: 'ID Commande', trackOrder: 'Suivre la Commande', estimatedTime: 'Temps Estimé', orderStatus: 'Statut', statusPending: 'En attente', statusPreparing: 'En préparation', statusReady: 'Prêt pour récupération', statusDelivered: 'Livré' },
    tracking: { title: 'Suivi de Commande', yourOrders: 'Vos Commandes Récentes', noOrders: 'Aucune commande', placeFirst: 'Passez votre première commande!' },
    reviews: { title: 'Avis', subtitle: 'Clients', description: 'Ce que nos invités disent de nous', writeReview: 'Écrire un Avis', rating: 'Note', submitReview: 'Soumettre l\'Avis', reviewSuccess: 'Merci pour votre avis!' },
    gallery: { title: 'Galerie', subtitle: 'Photos', description: 'Explorez notre ambiance et nos plats' },
    newsletter: { title: 'Restez Informé', description: 'Abonnez-vous pour les offres spéciales', placeholder: 'Entrez votre email', subscribe: 'S\'abonner', success: 'Merci de vous être abonné!' },
    contact: { title: 'Contactez', subtitle: '-Nous', sendMessage: 'Envoyez-nous un Message', name: 'Nom', email: 'Email', message: 'Message', send: 'Envoyer le Message', success: 'Message envoyé avec succès!', failed: 'Échec de l\'envoi du message', location: '📍 Adresse', contact: '📞 Contact', phoneLabel: 'Tél:', emailLabel: 'Email:', whatsapp: 'WhatsApp' },
    about: { title: 'Notre', subtitle: 'Histoire', para1: 'Bienvenue au Yard, la destination gastronomique premium de Douala où l\'excellence culinaire rencontre une hospitalité chaleureuse. Niché au cœur de la ville, notre restaurant offre un mélange unique de saveurs camerounaises traditionnelles et de cuisine internationale, le tout préparé avec les ingrédients locaux les plus frais.', para2: 'Nos chefs passionnés apportent des années d\'expertise à chaque plat, créant des expériences gastronomiques mémorables qui célèbrent le riche patrimoine culinaire du Cameroun tout en embrassant les techniques gastronomiques modernes.', fineDining: 'Gastronomie', fullBar: 'Bar Complet', terrace: 'Terrasse', tripAdvisorRating: 'Note TripAdvisor' },
    hours: { title: 'Heures', subtitle: 'd\'Ouverture', monThu: 'Lundi - Jeudi', friSat: 'Vendredi - Samedi', sunday: 'Dimanche' },
    footer: { tagline: 'Restaurant • Bar • Terrasse', rights: '© 2025 The Yard Restaurant. Tous droits réservés.', followUs: 'Suivez-nous' },
  },
};

const categoryIcons: Record<string, string> = { appetizer: '🥗', main: '🍽️', grilled: '🔥', seafood: '🦐', vegetarian: '🥬', dessert: '🍰', beverage: '🥤', cocktail: '🍸' };

// Sample reviews for fallback
const sampleReviews: Review[] = [
  { id: '1', name: 'Marie L.', rating: 5, text: 'Absolutely amazing experience! The Poulet DG was cooked to perfection. The ambiance is elegant and the staff very professional.', date: '2025-01-15', avatar: '👩' },
  { id: '2', name: 'Jean-Pierre M.', rating: 5, text: 'Best restaurant in Douala without a doubt! The Ndolé reminded me of my grandmother\'s cooking. Authentic and delicious.', date: '2025-01-10', avatar: '👨' },
  { id: '3', name: 'Sarah K.', rating: 4, text: 'Great cocktails and lovely terrace. Perfect for a date night. The Safari Sunset is a must-try!', date: '2025-01-08', avatar: '👩‍🦰' },
  { id: '4', name: 'David O.', rating: 5, text: 'Exceptional service and the grilled seafood platter was outstanding. Will definitely be back!', date: '2025-01-05', avatar: '👨‍💼' },
];

export default function Home() {
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const t = translations[lang];
  
  // Auth state
  const { user, userData, loading: authLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  
  // Unified cart hook - syncs with server and user dashboard
  const { 
    cart, 
    addToCart: addToServerCart, 
    updateQuantity,
    removeItem: removeFromCart, 
    clearCart, 
    itemCount: cartItemCount 
  } = useCart();
  
  // Shared menu context - syncs with admin dashboard
  const { menuItems, featuredItems, loading: menuLoading } = useMenu();
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>(sampleReviews);
  
  // News state
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  
  const [resDialogOpen, setResDialogOpen] = useState(false);
  const [resForm, setResForm] = useState({ name: '', email: '', phone: '', date: '', time: '', guests: '2', specialRequest: '', occasion: '' });
  
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [newsletterEmail, setNewsletterEmail] = useState('');
  
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ name: '', email: '', phone: '', eventType: '', guestCount: '', budget: '', details: '', preferredDate: '' });

  const [reviewForm, setReviewForm] = useState({ name: '', email: '', rating: '5', text: '' });
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  
  // Gallery state
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  
  // Special Offers state
  const [specialOffers, setSpecialOffers] = useState<{
    id: string;
    title: string;
    titleFr?: string;
    description: string;
    descriptionFr?: string;
    icon: string;
    isActive: boolean;
  }[]>([]);
  
  // Real-time listeners reference
  const unsubscribersRef = useRef<Unsubscribe[]>([]);

  // Derived cart values
  const cartItems = cart?.items || [];
  const cartTotal = cart?.totalAmount || 0;

  // Fallback fetch for non-menu data (demo mode)
  const fetchNonMenuData = useCallback(async () => {
    try {
      const [reviewsRes, newsRes, galleryRes, offersRes] = await Promise.all([
        fetch('/api/reviews'),
        fetch('/api/news'),
        fetch('/api/gallery'),
        fetch('/api/offers'),
      ]);
      
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        if (reviewsData.length > 0) {
          setReviews(reviewsData);
        }
      }
      
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setNewsItems(newsData);
      }
      
      if (galleryRes.ok) {
        const galleryData = await galleryRes.json();
        setGalleryImages(galleryData);
      }
      
      if (offersRes.ok) {
        const offersData = await offersRes.json();
        setSpecialOffers(offersData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, []);

  // Fetch non-menu data on mount
  useEffect(() => {
    fetchNonMenuData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time gallery, news, and reviews listener (menu is handled by MenuContext)
  useEffect(() => {
    if (!db) {
      return;
    }
    
    // Clean up previous listeners
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
    
    // Gallery listener - real-time sync
    const galleryQuery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    unsubscribersRef.current.push(onSnapshot(galleryQuery, (snapshot) => {
      const images = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as GalleryImage[];
      setGalleryImages(images);
    }));
    
    // News listener
    const newsQuery = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    unsubscribersRef.current.push(onSnapshot(newsQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as NewsItem[];
      setNewsItems(items);
    }));
    
    // Reviews listener
    const reviewsQuery = query(collection(db, 'reviews'), orderBy('date', 'desc'));
    unsubscribersRef.current.push(onSnapshot(reviewsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
      if (data.length > 0) {
        setReviews(data);
      }
    }));
    
    // Special Offers listener
    const offersQuery = query(collection(db, 'specialOffers'), orderBy('order', 'asc'));
    unsubscribersRef.current.push(onSnapshot(offersQuery, (snapshot) => {
      const offersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Filter only active offers
      const activeOffers = offersData.filter((offer: Record<string, unknown>) => offer.isActive !== false);
      setSpecialOffers(activeOffers);
    }));
    
    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for adding to cart using the unified hook
  const addToCart = (item: MenuItemType, quantity: number = 1, notes?: string) => {
    addToServerCart(item, quantity, notes);
  };

  // Handler for opening item modal
  const openItemModal = (item: MenuItemType) => {
    setSelectedItem(item);
    setItemModalOpen(true);
  };

  // Handler for order complete
  const handleOrderComplete = () => {
    clearCart();
    setProfileOpen(true);
  };

  // Filter menu by category (featuredItems comes from MenuContext)
  const filteredMenu = activeCategory === 'all' ? menuItems : menuItems.filter(item => item.category === activeCategory);

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resForm) });
      if (res.ok) { toast.success(t.reservation.confirmed); setResDialogOpen(false); setResForm({ name: '', email: '', phone: '', date: '', time: '', guests: '2', specialRequest: '', occasion: '' }); }
    } catch { toast.error(t.reservation.failed); }
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm) });
      if (res.ok) { toast.success(t.contact.success); setContactForm({ name: '', email: '', message: '' }); }
    } catch { toast.error(t.contact.failed); }
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(t.newsletter.success);
    setNewsletterEmail('');
  };

  const handleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          userId: user?.uid || null,
        }),
      });
      if (res.ok) {
        toast.success(t.events.success);
        setEventDialogOpen(false);
        setEventForm({ name: '', email: '', phone: '', eventType: '', guestCount: '', budget: '', details: '', preferredDate: '' });
      } else {
        toast.error('Failed to submit event inquiry');
      }
    } catch {
      toast.error('Failed to submit event inquiry');
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(t.reviews.reviewSuccess);
        setReviewForm({ name: '', email: '', rating: '5', text: '' });
        // Refresh reviews
        const reviewsRes = await fetch('/api/reviews');
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData);
        }
      } else {
        toast.error('Failed to submit review');
      }
    } catch {
      toast.error('Failed to submit review');
    }
  };

  const timeSlots = [];
  for (let h = 12; h <= 22; h++) { timeSlots.push(`${h}:00`); if (h < 22) timeSlots.push(`${h}:30`); }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'delivered': return 'bg-stone-500';
      default: return 'bg-stone-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-stone-900/95 backdrop-blur-sm z-50 border-b border-amber-500/20">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌿</span>
            <div>
              <h1 className="text-2xl font-bold text-amber-400 font-serif">The Yard</h1>
              <p className="text-xs text-stone-400">{t.footer.tagline}</p>
            </div>
          </div>
          <div className="hidden lg:flex gap-5 text-sm">
            <a href="#home" className="hover:text-amber-400 transition-colors">{t.nav.home}</a>
            <a href="#menu" className="hover:text-amber-400 transition-colors">{t.nav.menu}</a>
            <a href="#gallery" className="hover:text-amber-400 transition-colors">{t.nav.gallery}</a>
            <a href="#reviews" className="hover:text-amber-400 transition-colors">{t.nav.reviews}</a>
            <a href="#about" className="hover:text-amber-400 transition-colors">{t.nav.about}</a>
            <a href="#contact" className="hover:text-amber-400 transition-colors">{t.nav.contact}</a>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="icon" onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20" title={lang === 'en' ? 'Français' : 'English'}>
              <span className="text-lg">{lang === 'en' ? '🇫🇷' : '🇬🇧'}</span>
            </Button>
            {/* Cart button with badge - shows for all users */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => user ? setProfileOpen(true) : setLoginOpen(true)} 
              className="relative border-amber-500/50 text-amber-400 hover:bg-amber-500/20" 
              title={user ? "My Dashboard" : "Login to view cart"}
            >
              <BookOpen className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </Button>
            {/* Auth Section */}
            {authLoading ? (
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <UserMenu 
                onShowProfile={() => setProfileOpen(true)} 
                onShowAdmin={() => setAdminOpen(true)} 
              />
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setLoginOpen(true)} 
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
              >
                🔐 Login
              </Button>
            )}
            <Dialog open={resDialogOpen} onOpenChange={setResDialogOpen}>
              <DialogTrigger asChild><Button className="bg-amber-600 hover:bg-amber-500 text-white">{t.nav.reserveTable}</Button></DialogTrigger>
              <DialogContent className="bg-stone-800 border-amber-500/30 text-white max-w-md">
                <DialogHeader><DialogTitle className="text-amber-400">{t.reservation.title}</DialogTitle><DialogDescription className="text-stone-400">{t.reservation.description}</DialogDescription></DialogHeader>
                <form onSubmit={handleReservation} className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-stone-300">{t.reservation.name} *</Label><Input value={resForm.name} onChange={e => setResForm({...resForm, name: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                    <div><Label className="text-stone-300">{t.reservation.email} *</Label><Input type="email" value={resForm.email} onChange={e => setResForm({...resForm, email: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-stone-300">{t.reservation.phone} *</Label><Input value={resForm.phone} onChange={e => setResForm({...resForm, phone: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                    <div><Label className="text-stone-300">{t.reservation.guests} *</Label><Select value={resForm.guests} onValueChange={v => setResForm({...resForm, guests: v})}><SelectTrigger className="bg-stone-700 border-stone-600"><SelectValue /></SelectTrigger><SelectContent className="bg-stone-700">{[1,2,3,4,5,6,7,8,9,10,15,20].map(n => (<SelectItem key={n} value={String(n)}>{n} {n === 1 ? t.reservation.guest : t.reservation.guestsPlural}</SelectItem>))}</SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-stone-300">{t.reservation.date} *</Label><Input type="date" value={resForm.date} onChange={e => setResForm({...resForm, date: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                    <div><Label className="text-stone-300">{t.reservation.time} *</Label><Select value={resForm.time} onValueChange={v => setResForm({...resForm, time: v})}><SelectTrigger className="bg-stone-700 border-stone-600"><SelectValue placeholder={t.reservation.selectTime} /></SelectTrigger><SelectContent className="bg-stone-700">{timeSlots.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div>
                  </div>
                  <div><Label className="text-stone-300">{t.reservation.occasion}</Label><Select value={resForm.occasion} onValueChange={v => setResForm({...resForm, occasion: v})}><SelectTrigger className="bg-stone-700 border-stone-600"><SelectValue placeholder="--" /></SelectTrigger><SelectContent className="bg-stone-700">{t.reservation.occasions.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent></Select></div>
                  <div><Label className="text-stone-300">{t.reservation.specialRequests}</Label><Textarea value={resForm.specialRequest} onChange={e => setResForm({...resForm, specialRequest: e.target.value})} className="bg-stone-700 border-stone-600" rows={2} /></div>
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500">{t.reservation.confirm}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/restaurant-hero.png" alt="The Yard" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/50 to-transparent" />
        </div>
        <div className="relative z-10 text-center px-4">
          <Badge className="mb-4 bg-amber-600/80 text-white text-sm">{t.hero.badge}</Badge>
          <h1 className="text-5xl md:text-8xl font-bold mb-4 font-serif"><span className="text-amber-400">The Yard</span></h1>
          <p className="text-lg md:text-2xl text-stone-300 mb-8 max-w-2xl mx-auto">{t.hero.tagline}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="#menu"><Button size="lg" className="bg-amber-600 hover:bg-amber-500 text-white px-8">{t.hero.viewMenu}</Button></a>
            <Button size="lg" variant="outline" className="border-amber-500 text-amber-400 hover:bg-amber-500/20" onClick={() => setResDialogOpen(true)}>{t.nav.reserveTable}</Button>
          </div>
          <div className="mt-12 flex justify-center gap-8 text-stone-400">
            <div className="text-center"><div className="text-3xl font-bold text-amber-400">4.7</div><div className="text-sm">{t.hero.rating}</div></div>
            <div className="text-center"><div className="text-3xl font-bold text-amber-400">119</div><div className="text-sm">{t.hero.reviews}</div></div>
            <div className="text-center"><div className="text-3xl font-bold text-amber-400">#2</div><div className="text-sm">{t.hero.inDouala}</div></div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"><a href="#specials" className="text-amber-400">{t.hero.scroll}</a></div>
      </section>

      {/* News & Announcements Banner */}
      {newsItems.length > 0 && (
        <section className="py-12 bg-gradient-to-r from-amber-900/50 to-stone-900 border-y border-amber-500/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-2 font-serif"><span className="text-amber-400">{t.news.title}</span> {t.news.subtitle}</h2>
            <p className="text-center text-stone-400 mb-8">{t.news.description}</p>
            <Carousel className="w-full">
              <CarouselContent>
                {newsItems.filter(n => n.active).map((news) => (
                  <CarouselItem key={news.id} className="md:basis-1/2 lg:basis-1/3">
                    <Card className="bg-stone-800/60 border-amber-500/30 h-full">
                      <CardContent className="p-4">
                        {news.image && (
                          <div className="h-32 mb-3 rounded-lg overflow-hidden">
                            <img src={news.image} alt={news.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <h3 className="text-amber-400 font-bold mb-1">{news.title}</h3>
                        <p className="text-stone-400 text-sm line-clamp-2">{news.description}</p>
                        <p className="text-stone-500 text-xs mt-2">{new Date(news.createdAt).toLocaleDateString()}</p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 bg-stone-700 border-amber-500/30 text-amber-400 hover:bg-stone-600" />
              <CarouselNext className="right-2 bg-stone-700 border-amber-500/30 text-amber-400 hover:bg-stone-600" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Special Offers */}
      <section id="specials" className="py-16 bg-gradient-to-r from-amber-900/30 to-stone-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2 font-serif"><span className="text-amber-400">{t.specials.title}</span> {t.specials.subtitle}</h2>
          <p className="text-center text-stone-400 mb-8">{t.specials.description}</p>
          {specialOffers.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {specialOffers.map((offer) => (
                <Card key={offer.id} className="bg-stone-800/80 border-amber-500/30 hover:border-amber-500 transition-all">
                  <CardContent className="p-4 text-center">
                    <div className="text-4xl mb-2">{offer.icon || '🎁'}</div>
                    <h3 className="text-amber-400 font-bold mb-1">
                      {lang === 'fr' && offer.titleFr ? offer.titleFr : offer.title}
                    </h3>
                    <p className="text-stone-400 text-sm">
                      {lang === 'fr' && offer.descriptionFr ? offer.descriptionFr : offer.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fallback to hardcoded offers if no dynamic offers */}
              {[[t.specials.lunchSpecial, t.specials.lunchDesc, '🍽️'], [t.specials.happyHour, t.specials.happyDesc, '🍸'], [t.specials.familyDeal, t.specials.familyDesc, '👨‍👩‍👧‍👦'], [t.specials.weekend, t.specials.weekendDesc, '🥐']].map(([title, desc, icon], i) => (
                <Card key={i} className="bg-stone-800/80 border-amber-500/30 hover:border-amber-500 transition-all">
                  <CardContent className="p-4 text-center">
                    <div className="text-4xl mb-2">{icon}</div>
                    <h3 className="text-amber-400 font-bold mb-1">{title}</h3>
                    <p className="text-stone-400 text-sm">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Items */}
      <section id="featured" className="py-20 bg-stone-800/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-2 font-serif"><span className="text-amber-400">{t.featured.title}</span> {t.featured.subtitle}</h2>
          <p className="text-center text-stone-400 mb-12">{t.featured.description}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredItems.slice(0, 6).map((item) => (
              <Card key={item.id} className="bg-stone-800/80 border-amber-500/20 overflow-hidden group hover:border-amber-500/50 transition-all cursor-pointer" onClick={() => openItemModal(item)}>
                <div className="relative h-48 overflow-hidden">
                  <img src={item.image || `/food-${item.category}.png`} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-3 right-3"><Badge className="bg-amber-600">{t.featured.featured}</Badge></div>
                </div>
                <CardHeader><CardTitle className="text-amber-400">{item.name}</CardTitle><CardDescription className="text-stone-400 line-clamp-2">{item.description}</CardDescription></CardHeader>
                <CardContent className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-white">{item.price.toLocaleString()} XAF</span>
                  <Button onClick={(e) => { e.stopPropagation(); openItemModal(item); }} className="bg-amber-600 hover:bg-amber-500">Select</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-2 font-serif">{t.menu.title} <span className="text-amber-400">{t.menu.subtitle}</span></h2>
          <p className="text-center text-stone-400 mb-8">{t.menu.description}</p>
          
          {/* Cart Summary - Simple inline display */}
          {cartItems.length > 0 && (
            <div className="bg-stone-800/60 border border-amber-500/30 rounded-lg p-3 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                <div>
                  <span className="text-amber-400 font-bold">{t.menu.cart}: {cartItemCount} {t.menu.items}</span>
                  <span className="text-white font-bold ml-3">{cartTotal.toLocaleString()} XAF</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => user ? setProfileOpen(true) : null} 
                  variant="outline"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                >
                  View Cart
                </Button>
                <Button 
                  onClick={() => setCheckoutModalOpen(true)} 
                  className="bg-amber-600 hover:bg-amber-500"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Checkout
                </Button>
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Button variant={activeCategory === 'all' ? 'default' : 'outline'} onClick={() => setActiveCategory('all')} className={activeCategory === 'all' ? 'bg-amber-600 hover:bg-amber-500' : 'border-amber-500/30 text-stone-300'}>{t.menu.all}</Button>
            {Object.entries(t.categories).map(([key, label]) => (<Button key={key} variant={activeCategory === key ? 'default' : 'outline'} onClick={() => setActiveCategory(key)} className={activeCategory === key ? 'bg-amber-600 hover:bg-amber-500' : 'border-amber-500/30 text-stone-300'}>{categoryIcons[key]} {label}</Button>))}
          </div>

          {menuLoading ? (<div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full mx-auto"></div><p className="mt-4 text-stone-400">{t.menu.loading}</p></div>) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMenu.map((item) => (
                <Card key={item.id} className="bg-stone-800/60 border-stone-700 hover:border-amber-500/50 transition-all overflow-hidden cursor-pointer group" onClick={() => openItemModal(item)}>
                  <div className="relative h-40 overflow-hidden">
                    <img src={item.image || `/food-${item.category}.png`} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <Badge variant="outline" className="absolute top-2 right-2 border-amber-500/50 text-amber-400 bg-stone-900/80">{categoryIcons[item.category]}</Badge>
                  </div>
                  <CardHeader className="pb-1 pt-3"><CardTitle className="text-base text-white">{item.name}</CardTitle></CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <p className="text-stone-400 text-xs line-clamp-2 mb-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-amber-400">{item.price.toLocaleString()} XAF</span>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); openItemModal(item); }} className="bg-amber-600 hover:bg-amber-500">Select</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Menu Item Modal */}
      <MenuItemModal
        item={selectedItem}
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
        onAddToCart={addToCart}
        categoryIcons={categoryIcons}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        cart={cartItems}
        cartTotal={cartTotal}
        user={user}
        userData={userData}
        onOrderComplete={handleOrderComplete}
      />

      {/* Gallery Section */}
      <section id="gallery" className="py-20 bg-stone-800/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-2 font-serif">{t.gallery.title} <span className="text-amber-400">{t.gallery.subtitle}</span></h2>
          <p className="text-center text-stone-400 mb-12">{t.gallery.description}</p>
          
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {galleryImages.slice(0, 8).map((img, i) => (
                <div key={img.id} className={`overflow-hidden rounded-lg ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                  <img 
                    src={img.url} 
                    alt={img.title} 
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.png';
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['restaurant-hero', 'gallery-terrace', 'gallery-bar', 'gallery-private', 'gallery-chef', 'food-main', 'food-seafood', 'food-dessert'].map((img, i) => (
                <div key={i} className={`overflow-hidden rounded-lg ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                  <img src={`/${img}.png`} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Private Events */}
      <section id="events" className="py-20 bg-gradient-to-r from-amber-900/20 to-stone-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-2 font-serif">{t.events.title} <span className="text-amber-400">{t.events.subtitle}</span></h2>
          <p className="text-center text-stone-400 mb-12">{t.events.description}</p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[[t.events.eventTypes[0], 'Capacity: 50 guests', '🏢'], [t.events.eventTypes[1], 'Full catering available', '💒'], [t.events.eventTypes[2], 'Private rooms available', '🎂']].map(([title, desc, icon], i) => (
              <Card key={i} className="bg-stone-800/60 border-amber-500/20 text-center">
                <CardContent className="p-6">
                  <div className="text-5xl mb-4">{icon}</div>
                  <h3 className="text-xl font-bold text-amber-400 mb-2">{title}</h3>
                  <p className="text-stone-400">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogTrigger asChild><Button className="bg-amber-600 hover:bg-amber-500 mx-auto block">{t.events.bookEvent}</Button></DialogTrigger>
            <DialogContent className="bg-stone-800 border-amber-500/30 text-white max-w-md">
              <DialogHeader><DialogTitle className="text-amber-400">{t.events.bookEvent}</DialogTitle></DialogHeader>
              <form onSubmit={handleEvent} className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-stone-300">{t.contact.name} *</Label><Input value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                  <div><Label className="text-stone-300">{t.contact.email} *</Label><Input type="email" value={eventForm.email} onChange={e => setEventForm({...eventForm, email: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                </div>
                <div><Label className="text-stone-300">{t.contact.phone}</Label><Input value={eventForm.phone} onChange={e => setEventForm({...eventForm, phone: e.target.value})} className="bg-stone-700 border-stone-600" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-stone-300">{t.events.eventType} *</Label><Select value={eventForm.eventType} onValueChange={v => setEventForm({...eventForm, eventType: v})}><SelectTrigger className="bg-stone-700 border-stone-600"><SelectValue placeholder="--" /></SelectTrigger><SelectContent className="bg-stone-700">{t.events.eventTypes.map(e => (<SelectItem key={e} value={e}>{e}</SelectItem>))}</SelectContent></Select></div>
                  <div><Label className="text-stone-300">{t.events.guestCount}</Label><Input type="number" value={eventForm.guestCount} onChange={e => setEventForm({...eventForm, guestCount: e.target.value})} className="bg-stone-700 border-stone-600" /></div>
                </div>
                <div><Label className="text-stone-300">{t.events.details}</Label><Textarea value={eventForm.details} onChange={e => setEventForm({...eventForm, details: e.target.value})} className="bg-stone-700 border-stone-600" rows={3} /></div>
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500">{t.events.submit}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-2 font-serif">{t.reviews.title} <span className="text-amber-400">{t.reviews.subtitle}</span></h2>
          <p className="text-center text-stone-400 mb-12">{t.reviews.description}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {reviews.slice(0, 8).map((review) => (
              <Card key={review.id} className="bg-stone-800/60 border-stone-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{review.avatar}</span>
                    <div><p className="font-bold text-white">{review.name}</p><div className="flex">{[...Array(5)].map((_, i) => <span key={i} className={i < review.rating ? 'text-amber-400' : 'text-stone-600'}>★</span>)}</div></div>
                  </div>
                  <p className="text-stone-300 text-sm">{review.text}</p>
                  <p className="text-stone-500 text-xs mt-2">{review.date}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" className="border-amber-500 text-amber-400 mx-auto block">✍️ {t.reviews.writeReview}</Button></DialogTrigger>
            <DialogContent className="bg-stone-800 border-amber-500/30 text-white">
              <DialogHeader><DialogTitle className="text-amber-400">{t.reviews.writeReview}</DialogTitle></DialogHeader>
              <form onSubmit={handleReview} className="space-y-3 mt-4">
                <div><Label className="text-stone-300">{t.contact.name}</Label><Input value={reviewForm.name} onChange={e => setReviewForm({...reviewForm, name: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                <div><Label className="text-stone-300">{t.contact.email}</Label><Input type="email" value={reviewForm.email} onChange={e => setReviewForm({...reviewForm, email: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                <div><Label className="text-stone-300">{t.reviews.rating}</Label><Select value={reviewForm.rating} onValueChange={v => setReviewForm({...reviewForm, rating: v})}><SelectTrigger className="bg-stone-700 border-stone-600"><SelectValue /></SelectTrigger><SelectContent className="bg-stone-700">{[5,4,3,2,1].map(n => (<SelectItem key={n} value={String(n)}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</SelectItem>))}</SelectContent></Select></div>
                <div><Label className="text-stone-300">{t.contact.message}</Label><Textarea value={reviewForm.text} onChange={e => setReviewForm({...reviewForm, text: e.target.value})} required className="bg-stone-700 border-stone-600" rows={3} /></div>
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500">{t.reviews.submitReview}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-stone-800/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 font-serif">{t.about.title} <span className="text-amber-400">{t.about.subtitle}</span></h2>
              <p className="text-stone-300 mb-4 leading-relaxed">{t.about.para1}</p>
              <p className="text-stone-300 mb-6 leading-relaxed">{t.about.para2}</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-stone-700/50 rounded-lg p-4"><div className="text-3xl mb-2">🍽️</div><div className="text-amber-400 font-bold">{t.about.fineDining}</div></div>
                <div className="bg-stone-700/50 rounded-lg p-4"><div className="text-3xl mb-2">🍹</div><div className="text-amber-400 font-bold">{t.about.fullBar}</div></div>
                <div className="bg-stone-700/50 rounded-lg p-4"><div className="text-3xl mb-2">🌳</div><div className="text-amber-400 font-bold">{t.about.terrace}</div></div>
              </div>
            </div>
            <div className="relative"><img src="/restaurant-hero.png" alt="The Yard" className="rounded-lg shadow-2xl" /><div className="absolute -bottom-6 -right-6 bg-amber-600 rounded-lg p-4 text-white text-center"><div className="text-3xl font-bold">4.7</div><div className="text-xs">{t.about.tripAdvisorRating}</div></div></div>
          </div>
        </div>
      </section>

      {/* Opening Hours */}
      <section className="py-16 bg-stone-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 font-serif">{t.hours.title} <span className="text-amber-400">{t.hours.subtitle}</span></h2>
          <div className="max-w-md mx-auto bg-stone-800/50 rounded-lg p-6">
            <div className="flex justify-between py-3 border-b border-stone-700"><span className="text-stone-300">{t.hours.monThu}</span><span className="text-white font-bold">12:00 - 23:00</span></div>
            <div className="flex justify-between py-3 border-b border-stone-700"><span className="text-stone-300">{t.hours.friSat}</span><span className="text-white font-bold">12:00 - 00:00</span></div>
            <div className="flex justify-between py-3"><span className="text-stone-300">{t.hours.sunday}</span><span className="text-white font-bold">12:00 - 22:00</span></div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-gradient-to-r from-amber-900/30 to-stone-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2 font-serif">{t.newsletter.title}</h2>
          <p className="text-stone-400 mb-6">{t.newsletter.description}</p>
          <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input type="email" value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} placeholder={t.newsletter.placeholder} required className="bg-stone-700 border-stone-600 flex-1" />
            <Button type="submit" className="bg-amber-600 hover:bg-amber-500">{t.newsletter.subscribe}</Button>
          </form>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-stone-800/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 font-serif">{t.contact.title} <span className="text-amber-400">{t.contact.subtitle}</span></h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <Card className="bg-stone-800/60 border-amber-500/20">
                <CardHeader><CardTitle className="text-amber-400">{t.contact.sendMessage}</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleContact} className="space-y-4">
                    <div><Label className="text-stone-300">{t.contact.name}</Label><Input value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                    <div><Label className="text-stone-300">{t.contact.email}</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} required className="bg-stone-700 border-stone-600" /></div>
                    <div><Label className="text-stone-300">{t.contact.message}</Label><Textarea value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} required className="bg-stone-700 border-stone-600" rows={4} /></div>
                    <div className="flex gap-3"><Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500">{t.contact.send}</Button><a href="https://wa.me/237671490733" target="_blank" rel="noopener noreferrer"><Button type="button" variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/20">💬 {t.contact.whatsapp}</Button></a></div>
                  </form>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="bg-stone-800/60 border-amber-500/20"><CardContent className="p-4"><h3 className="text-lg font-bold text-amber-400 mb-2">{t.contact.location}</h3><p className="text-stone-300 text-sm">737 Rue Batibois<br/>Douala, Littoral Region<br/>Cameroun</p></CardContent></Card>
              <Card className="bg-stone-800/60 border-amber-500/20"><CardContent className="p-4"><h3 className="text-lg font-bold text-amber-400 mb-2">{t.contact.contact}</h3><p className="text-stone-300 text-sm">{t.contact.phoneLabel} +237 671 490 733<br/>{t.contact.emailLabel} info@theyard-douala.com</p></CardContent></Card>
              <Card className="bg-stone-800/60 border-amber-500/20 overflow-hidden"><CardContent className="p-0"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3980.7565!2d9.7013382!3d4.0277921!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x106113268a365ed1%3A0x36e297b3af87f1a2!2sThe%20Yard!5e0!3m2!1sen!2scm" width="100%" height="180" style={{border: 0}} allowFullScreen loading="lazy" /></CardContent></Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 border-t border-amber-500/20 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3"><span className="text-2xl">🌿</span><div><h3 className="text-lg font-bold text-amber-400 font-serif">The Yard</h3><p className="text-xs text-stone-400">{t.footer.tagline}</p></div></div>
            <div className="flex gap-4 text-stone-400 text-sm">{['Facebook', 'Instagram', 'TripAdvisor'].map(s => <a key={s} href="#" className="hover:text-amber-400 transition-colors">{s}</a>)}</div>
            <p className="text-stone-500 text-xs">{t.footer.rights}</p>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <LoginModal 
        open={loginOpen} 
        onOpenChange={setLoginOpen} 
        onSwitchToRegister={() => { setLoginOpen(false); setRegisterOpen(true); }}
      />
      <RegisterModal 
        open={registerOpen} 
        onOpenChange={setRegisterOpen} 
        onSwitchToLogin={() => { setRegisterOpen(false); setLoginOpen(true); }}
      />
      <UserProfileModal 
        open={profileOpen} 
        onOpenChange={setProfileOpen}
      />
      <AdminDashboard 
        open={adminOpen} 
        onOpenChange={setAdminOpen}
      />
    </div>
  );
}
