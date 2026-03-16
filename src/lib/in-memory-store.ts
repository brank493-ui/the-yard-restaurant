/**
 * In-memory store for demo mode when Firebase is not configured
 * This allows the restaurant admin to test features without setting up Firebase
 */

// Menu item interface
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categorySlug: string;
  image: string;
  isAvailable: boolean;
  featured: boolean;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Gallery image interface
export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

// Special Offer interface
export interface SpecialOffer {
  id: string;
  title: string;
  titleFr?: string;
  description: string;
  descriptionFr?: string;
  icon: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Initial menu data
const initialMenuItems: MenuItem[] = [
  // Appetizers (Entrées)
  { id: "1", name: "Brochettes de Bœuf", description: "Grilled beef skewers with spicy sauce, served with fresh onions and tomatoes", price: 3500, category: "appetizer", categorySlug: "appetizer", featured: true, isPopular: true, image: "/item-brochettes.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "2", name: "Accra", description: "Traditional fried fish fritters, crispy outside and tender inside", price: 2500, category: "appetizer", categorySlug: "appetizer", featured: false, isPopular: false, image: "/item-accra.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "3", name: "Samoussa aux Légumes", description: "Crispy vegetable samosas with mint chutney", price: 2000, category: "appetizer", categorySlug: "appetizer", featured: false, isPopular: false, image: "/item-samoussa.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "4", name: "Salade d'Avocat", description: "Fresh avocado salad with lime dressing and grilled shrimp", price: 3000, category: "appetizer", categorySlug: "appetizer", featured: false, isPopular: false, image: "/item-salade-avocat.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  
  // Main Courses (Plats Principaux)
  { id: "5", name: "Poulet DG", description: "Signature grilled chicken with fried plantains and sautéed vegetables", price: 5500, category: "main", categorySlug: "main", featured: true, isPopular: true, image: "/item-poulet-dg.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "6", name: "Poisson Braisé", description: "Perfectly braised whole fish served with golden fries and fresh salad", price: 6000, category: "main", categorySlug: "main", featured: true, isPopular: true, image: "/item-poisson-braise.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "7", name: "Ndolé", description: "Traditional Cameroonian stew with fish, nuts, and bitter leaves served with miondo", price: 5000, category: "main", categorySlug: "main", featured: true, isPopular: true, image: "/item-ndole.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "8", name: "Saka Saka", description: "Cassava leaf stew with smoked fish and beef, served with white rice", price: 4500, category: "main", categorySlug: "main", featured: false, isPopular: false, image: "/item-saka-saka.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "9", name: "Riz Sauce Tomate", description: "Fluffy rice with rich tomato sauce and your choice of protein", price: 4000, category: "main", categorySlug: "main", featured: false, isPopular: false, image: "/food-main.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  
  // Grilled Specialties
  { id: "10", name: "Côte de Bœuf", description: "Premium grilled beef rib with herb butter, fries, and grilled vegetables", price: 8000, category: "grilled", categorySlug: "grilled", featured: true, isPopular: true, image: "/item-cote-boeuf.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "11", name: "Brochette Mixte", description: "Assorted meat skewers - beef, chicken, and lamb with spicy marinade", price: 6500, category: "grilled", categorySlug: "grilled", featured: false, isPopular: false, image: "/item-brochette-mixte.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "12", name: "Poulet Grillé", description: "Half grilled chicken marinated in herbs and spices", price: 5000, category: "grilled", categorySlug: "grilled", featured: false, isPopular: false, image: "/item-poulet-dg.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  
  // Seafood
  { id: "13", name: "Crevettes Grillées", description: "Jumbo grilled prawns with garlic butter sauce and lemon", price: 7500, category: "seafood", categorySlug: "seafood", featured: true, isPopular: true, image: "/item-crevettes.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "14", name: "Filet de Tilapia", description: "Pan-seared tilapia fillet with sautéed vegetables and white wine sauce", price: 6500, category: "seafood", categorySlug: "seafood", featured: false, isPopular: false, image: "/food-seafood.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "15", name: "Calamars Frits", description: "Crispy fried calamari rings with tartar sauce", price: 5500, category: "seafood", categorySlug: "seafood", featured: false, isPopular: false, image: "/food-seafood.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  
  // Vegetarian
  { id: "16", name: "Légumes Sautés", description: "Mixed seasonal vegetables stir-fried with garlic and ginger", price: 3500, category: "vegetarian", categorySlug: "vegetarian", featured: false, isPopular: false, image: "/food-vegetarian.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "17", name: "Riz Végétarien", description: "Vegetable fried rice with tofu and cashews", price: 4000, category: "vegetarian", categorySlug: "vegetarian", featured: false, isPopular: false, image: "/food-vegetarian.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  
  // Desserts
  { id: "18", name: "Banane Flambée", description: "Flambéed banana with vanilla ice cream and caramel drizzle", price: 3000, category: "dessert", categorySlug: "dessert", featured: true, isPopular: true, image: "/item-banane-flambee.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "19", name: "Glace Maison", description: "Homemade ice cream - choice of vanilla, chocolate, or mango", price: 2500, category: "dessert", categorySlug: "dessert", featured: false, isPopular: false, image: "/food-dessert.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "20", name: "Fruits Tropicaux", description: "Fresh seasonal tropical fruits with mint syrup", price: 2000, category: "dessert", categorySlug: "dessert", featured: false, isPopular: false, image: "/food-dessert.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  
  // Beverages
  { id: "21", name: "Jus de Bissap", description: "Refreshing hibiscus flower juice, sweetened to perfection", price: 1500, category: "beverage", categorySlug: "beverage", featured: false, isPopular: false, image: "/item-bissap.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "22", name: "Jus de Gingembre", description: "Spicy ginger juice with a hint of lemon", price: 1500, category: "beverage", categorySlug: "beverage", featured: false, isPopular: false, image: "/food-beverage.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "23", name: "Jus d'Ananas", description: "Fresh pineapple juice, sweet and tangy", price: 1500, category: "beverage", categorySlug: "beverage", featured: false, isPopular: false, image: "/food-beverage.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "24", name: "Eau Minérale", description: "Premium mineral water - 500ml", price: 1000, category: "beverage", categorySlug: "beverage", featured: false, isPopular: false, image: "/food-beverage.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "25", name: "Coca-Cola", description: "Classic Coca-Cola - 330ml", price: 1500, category: "beverage", categorySlug: "beverage", featured: false, isPopular: false, image: "/food-beverage.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  
  // Cocktails
  { id: "26", name: "Safari Sunset", description: "Signature cocktail with vodka, passion fruit, and grenadine", price: 4000, category: "cocktail", categorySlug: "cocktail", featured: true, isPopular: true, image: "/item-safari-sunset.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "27", name: "Mojito Classic", description: "Classic mojito with white rum, mint, lime, and soda", price: 3500, category: "cocktail", categorySlug: "cocktail", featured: false, isPopular: false, image: "/item-mojito.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "28", name: "Manhattan", description: "Whiskey cocktail with sweet vermouth and bitters", price: 4500, category: "cocktail", categorySlug: "cocktail", featured: false, isPopular: false, image: "/item-mojito.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "29", name: "Piña Colada", description: "Tropical blend of rum, coconut cream, and pineapple juice", price: 4000, category: "cocktail", categorySlug: "cocktail", featured: false, isPopular: false, image: "/item-safari-sunset.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "30", name: "Sex on the Beach", description: "Vodka with peach schnapps, orange juice, and cranberry", price: 4000, category: "cocktail", categorySlug: "cocktail", featured: false, isPopular: false, image: "/item-safari-sunset.png", isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
];

// Initial gallery data
const initialGalleryImages: GalleryImage[] = [
  { id: "g1", url: "/restaurant-hero.png", title: "Restaurant Interior", category: "interior", createdAt: new Date(), updatedAt: new Date() },
  { id: "g2", url: "/item-poulet-dg.png", title: "Poulet DG", category: "food", createdAt: new Date(), updatedAt: new Date() },
  { id: "g3", url: "/item-ndole.png", title: "Ndolé Traditionnel", category: "food", createdAt: new Date(), updatedAt: new Date() },
  { id: "g4", url: "/item-brochettes.png", title: "Brochettes Grillées", category: "food", createdAt: new Date(), updatedAt: new Date() },
  { id: "g5", url: "/item-safari-sunset.png", title: "Safari Sunset Cocktail", category: "food", createdAt: new Date(), updatedAt: new Date() },
  { id: "g6", url: "/item-crevettes.png", title: "Crevettes Grillées", category: "food", createdAt: new Date(), updatedAt: new Date() },
];

// Initial special offers data
const initialSpecialOffers: SpecialOffer[] = [
  { 
    id: "so1", 
    title: "Lunch Special", 
    titleFr: "Déjeuner Spécial",
    description: "20% off all main courses from 12pm-3pm on weekdays", 
    descriptionFr: "20% de réduction sur tous les plats principaux de 12h-15h en semaine",
    icon: "🍽️", 
    isActive: true, 
    order: 1,
    createdAt: new Date(), 
    updatedAt: new Date() 
  },
  { 
    id: "so2", 
    title: "Happy Hour", 
    titleFr: "Happy Hour",
    description: "Buy 1 Get 1 Free on cocktails from 5pm-7pm", 
    descriptionFr: "Achetez 1 obtenez 1 gratuit sur les cocktails de 17h-19h",
    icon: "🍸", 
    isActive: true, 
    order: 2,
    createdAt: new Date(), 
    updatedAt: new Date() 
  },
  { 
    id: "so3", 
    title: "Family Deal", 
    titleFr: "Offre Famille",
    description: "4-person meal with appetizers, mains & dessert - 25,000 XAF", 
    descriptionFr: "Repas pour 4 avec entrées, plats et dessert - 25 000 XAF",
    icon: "👨‍👩‍👧‍👦", 
    isActive: true, 
    order: 3,
    createdAt: new Date(), 
    updatedAt: new Date() 
  },
  { 
    id: "so4", 
    title: "Weekend Brunch", 
    titleFr: "Brunch du Week-end",
    description: "Free dessert with any breakfast order on weekends", 
    descriptionFr: "Dessert gratuit avec toute commande de petit-déjeuner le week-end",
    icon: "🥐", 
    isActive: true, 
    order: 4,
    createdAt: new Date(), 
    updatedAt: new Date() 
  },
];

// Global in-memory store (singleton)
class InMemoryStore {
  private static instance: InMemoryStore;
  private menuItems: MenuItem[];
  private galleryImages: GalleryImage[];
  private specialOffers: SpecialOffer[];
  
  private constructor() {
    // Deep clone initial data
    this.menuItems = JSON.parse(JSON.stringify(initialMenuItems));
    this.galleryImages = JSON.parse(JSON.stringify(initialGalleryImages));
    this.specialOffers = JSON.parse(JSON.stringify(initialSpecialOffers));
  }
  
  static getInstance(): InMemoryStore {
    if (!InMemoryStore.instance) {
      InMemoryStore.instance = new InMemoryStore();
    }
    return InMemoryStore.instance;
  }
  
  // Menu operations
  getMenuItems(all: boolean = false): MenuItem[] {
    if (all) {
      return [...this.menuItems];
    }
    return this.menuItems.filter(item => item.isAvailable);
  }
  
  getMenuItem(id: string): MenuItem | undefined {
    return this.menuItems.find(item => item.id === id);
  }
  
  createMenuItem(data: Partial<MenuItem>): MenuItem {
    const id = `menu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const featured = data.featured === true || data.isPopular === true;
    const newItem: MenuItem = {
      id,
      name: data.name || '',
      description: data.description || '',
      price: data.price || 0,
      category: data.category || 'main',
      categorySlug: data.categorySlug || data.category || 'main',
      image: data.image || '',
      isAvailable: data.isAvailable !== false,
      featured,
      isPopular: featured,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.menuItems.unshift(newItem);
    return newItem;
  }
  
  updateMenuItem(id: string, data: Partial<MenuItem>): MenuItem | null {
    const index = this.menuItems.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    const featured = data.featured === true || data.isPopular === true;
    this.menuItems[index] = {
      ...this.menuItems[index],
      ...data,
      featured,
      isPopular: featured,
      updatedAt: new Date(),
    };
    return this.menuItems[index];
  }
  
  deleteMenuItem(id: string): boolean {
    const index = this.menuItems.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.menuItems.splice(index, 1);
    return true;
  }
  
  // Gallery operations
  getGalleryImages(): GalleryImage[] {
    return [...this.galleryImages];
  }
  
  getGalleryImage(id: string): GalleryImage | undefined {
    return this.galleryImages.find(img => img.id === id);
  }
  
  createGalleryImage(data: Partial<GalleryImage>): GalleryImage {
    const id = `gallery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newImage: GalleryImage = {
      id,
      url: data.url || '',
      title: data.title || '',
      category: data.category || 'food',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.galleryImages.unshift(newImage);
    return newImage;
  }
  
  updateGalleryImage(id: string, data: Partial<GalleryImage>): GalleryImage | null {
    const index = this.galleryImages.findIndex(img => img.id === id);
    if (index === -1) return null;
    
    this.galleryImages[index] = {
      ...this.galleryImages[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.galleryImages[index];
  }
  
  deleteGalleryImage(id: string): boolean {
    const index = this.galleryImages.findIndex(img => img.id === id);
    if (index === -1) return false;
    this.galleryImages.splice(index, 1);
    return true;
  }
  
  // Special Offers operations
  getSpecialOffers(all: boolean = false): SpecialOffer[] {
    const sorted = [...this.specialOffers].sort((a, b) => a.order - b.order);
    if (all) {
      return sorted;
    }
    return sorted.filter(offer => offer.isActive);
  }
  
  getSpecialOffer(id: string): SpecialOffer | undefined {
    return this.specialOffers.find(offer => offer.id === id);
  }
  
  createSpecialOffer(data: Partial<SpecialOffer>): SpecialOffer {
    const id = `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const maxOrder = Math.max(0, ...this.specialOffers.map(o => o.order));
    const newOffer: SpecialOffer = {
      id,
      title: data.title || '',
      titleFr: data.titleFr || data.title || '',
      description: data.description || '',
      descriptionFr: data.descriptionFr || data.description || '',
      icon: data.icon || '🎁',
      isActive: data.isActive !== false,
      order: data.order ?? (maxOrder + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.specialOffers.push(newOffer);
    return newOffer;
  }
  
  updateSpecialOffer(id: string, data: Partial<SpecialOffer>): SpecialOffer | null {
    const index = this.specialOffers.findIndex(offer => offer.id === id);
    if (index === -1) return null;
    
    this.specialOffers[index] = {
      ...this.specialOffers[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.specialOffers[index];
  }
  
  deleteSpecialOffer(id: string): boolean {
    const index = this.specialOffers.findIndex(offer => offer.id === id);
    if (index === -1) return false;
    this.specialOffers.splice(index, 1);
    return true;
  }
  
  // Reset to initial data (for testing)
  reset() {
    this.menuItems = JSON.parse(JSON.stringify(initialMenuItems));
    this.galleryImages = JSON.parse(JSON.stringify(initialGalleryImages));
    this.specialOffers = JSON.parse(JSON.stringify(initialSpecialOffers));
  }
}

// Export singleton getter
export function getInMemoryStore(): InMemoryStore {
  return InMemoryStore.getInstance();
}
