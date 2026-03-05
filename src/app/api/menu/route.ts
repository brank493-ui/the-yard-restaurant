import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Static menu data - fallback for demo/offline mode
const staticMenuItems = [
  // Appetizers (Entrées)
  { id: "1", name: "Brochettes de Bœuf", description: "Grilled beef skewers with spicy sauce, served with fresh onions and tomatoes", price: 3500, category: "appetizer", categorySlug: "appetizer", featured: true, image: "/item-brochettes.png", available: true },
  { id: "2", name: "Accra", description: "Traditional fried fish fritters, crispy outside and tender inside", price: 2500, category: "appetizer", categorySlug: "appetizer", featured: false, image: "/item-accra.png", available: true },
  { id: "3", name: "Samoussa aux Légumes", description: "Crispy vegetable samosas with mint chutney", price: 2000, category: "appetizer", categorySlug: "appetizer", featured: false, image: "/item-samoussa.png", available: true },
  { id: "4", name: "Salade d'Avocat", description: "Fresh avocado salad with lime dressing and grilled shrimp", price: 3000, category: "appetizer", categorySlug: "appetizer", featured: false, image: "/item-salade-avocat.png", available: true },
  
  // Main Courses (Plats Principaux)
  { id: "5", name: "Poulet DG", description: "Signature grilled chicken with fried plantains and sautéed vegetables", price: 5500, category: "main", categorySlug: "main", featured: true, image: "/item-poulet-dg.png", available: true },
  { id: "6", name: "Poisson Braisé", description: "Perfectly braised whole fish served with golden fries and fresh salad", price: 6000, category: "main", categorySlug: "main", featured: true, image: "/item-poisson-braise.png", available: true },
  { id: "7", name: "Ndolé", description: "Traditional Cameroonian stew with fish, nuts, and bitter leaves served with miondo", price: 5000, category: "main", categorySlug: "main", featured: true, image: "/item-ndole.png", available: true },
  { id: "8", name: "Saka Saka", description: "Cassava leaf stew with smoked fish and beef, served with white rice", price: 4500, category: "main", categorySlug: "main", featured: false, image: "/item-saka-saka.png", available: true },
  { id: "9", name: "Riz Sauce Tomate", description: "Fluffy rice with rich tomato sauce and your choice of protein", price: 4000, category: "main", categorySlug: "main", featured: false, image: "/food-main.png", available: true },
  
  // Grilled Specialties
  { id: "10", name: "Côte de Bœuf", description: "Premium grilled beef rib with herb butter, fries, and grilled vegetables", price: 8000, category: "grilled", categorySlug: "grilled", featured: true, image: "/item-cote-boeuf.png", available: true },
  { id: "11", name: "Brochette Mixte", description: "Assorted meat skewers - beef, chicken, and lamb with spicy marinade", price: 6500, category: "grilled", categorySlug: "grilled", featured: false, image: "/item-brochette-mixte.png", available: true },
  { id: "12", name: "Poulet Grillé", description: "Half grilled chicken marinated in herbs and spices", price: 5000, category: "grilled", categorySlug: "grilled", featured: false, image: "/item-poulet-dg.png", available: true },
  
  // Seafood
  { id: "13", name: "Crevettes Grillées", description: "Jumbo grilled prawns with garlic butter sauce and lemon", price: 7500, category: "seafood", categorySlug: "seafood", featured: true, image: "/item-crevettes.png", available: true },
  { id: "14", name: "Filet de Tilapia", description: "Pan-seared tilapia fillet with sautéed vegetables and white wine sauce", price: 6500, category: "seafood", categorySlug: "seafood", featured: false, image: "/food-seafood.png", available: true },
  { id: "15", name: "Calamars Frits", description: "Crispy fried calamari rings with tartar sauce", price: 5500, category: "seafood", categorySlug: "seafood", featured: false, image: "/food-seafood.png", available: true },
  
  // Vegetarian
  { id: "16", name: "Légumes Sautés", description: "Mixed seasonal vegetables stir-fried with garlic and ginger", price: 3500, category: "vegetarian", categorySlug: "vegetarian", featured: false, image: "/food-vegetarian.png", available: true },
  { id: "17", name: "Riz Végétarien", description: "Vegetable fried rice with tofu and cashews", price: 4000, category: "vegetarian", categorySlug: "vegetarian", featured: false, image: "/food-vegetarian.png", available: true },
  
  // Desserts
  { id: "18", name: "Banane Flambée", description: "Flambéed banana with vanilla ice cream and caramel drizzle", price: 3000, category: "dessert", categorySlug: "dessert", featured: true, image: "/item-banane-flambee.png", available: true },
  { id: "19", name: "Glace Maison", description: "Homemade ice cream - choice of vanilla, chocolate, or mango", price: 2500, category: "dessert", categorySlug: "dessert", featured: false, image: "/food-dessert.png", available: true },
  { id: "20", name: "Fruits Tropicaux", description: "Fresh seasonal tropical fruits with mint syrup", price: 2000, category: "dessert", categorySlug: "dessert", featured: false, image: "/food-dessert.png", available: true },
  
  // Beverages
  { id: "21", name: "Jus de Bissap", description: "Refreshing hibiscus flower juice, sweetened to perfection", price: 1500, category: "beverage", categorySlug: "beverage", featured: false, image: "/item-bissap.png", available: true },
  { id: "22", name: "Jus de Gingembre", description: "Spicy ginger juice with a hint of lemon", price: 1500, category: "beverage", categorySlug: "beverage", featured: false, image: "/food-beverage.png", available: true },
  { id: "23", name: "Jus d'Ananas", description: "Fresh pineapple juice, sweet and tangy", price: 1500, category: "beverage", categorySlug: "beverage", featured: false, image: "/food-beverage.png", available: true },
  { id: "24", name: "Eau Minérale", description: "Premium mineral water - 500ml", price: 1000, category: "beverage", categorySlug: "beverage", featured: false, image: "/food-beverage.png", available: true },
  { id: "25", name: "Coca-Cola", description: "Classic Coca-Cola - 330ml", price: 1500, category: "beverage", categorySlug: "beverage", featured: false, image: "/food-beverage.png", available: true },
  
  // Cocktails
  { id: "26", name: "Safari Sunset", description: "Signature cocktail with vodka, passion fruit, and grenadine", price: 4000, category: "cocktail", categorySlug: "cocktail", featured: true, image: "/item-safari-sunset.png", available: true },
  { id: "27", name: "Mojito Classic", description: "Classic mojito with white rum, mint, lime, and soda", price: 3500, category: "cocktail", categorySlug: "cocktail", featured: false, image: "/item-mojito.png", available: true },
  { id: "28", name: "Manhattan", description: "Whiskey cocktail with sweet vermouth and bitters", price: 4500, category: "cocktail", categorySlug: "cocktail", featured: false, image: "/item-mojito.png", available: true },
  { id: "29", name: "Piña Colada", description: "Tropical blend of rum, coconut cream, and pineapple juice", price: 4000, category: "cocktail", categorySlug: "cocktail", featured: false, image: "/item-safari-sunset.png", available: true },
  { id: "30", name: "Sex on the Beach", description: "Vodka with peach schnapps, orange juice, and cranberry", price: 4000, category: "cocktail", categorySlug: "cocktail", featured: false, image: "/item-safari-sunset.png", available: true },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true'; // For admin to see all items
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      // Firebase not configured, return static data
      return NextResponse.json(staticMenuItems);
    }

    // Try to fetch from Firestore
    let query = adminDb.collection('menuItems');
    
    if (!showAll) {
      query = query.where('isAvailable', '==', true) as typeof query;
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty && !showAll) {
      // No data in Firestore, seed it with static data
      const batch = adminDb.batch();
      staticMenuItems.forEach((item) => {
        const docRef = adminDb.collection('menuItems').doc(item.id);
        batch.set(docRef, {
          ...item,
          isAvailable: true,
          isPopular: item.featured,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      await batch.commit();
      return NextResponse.json(staticMenuItems);
    }

    const menuItems = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        categorySlug: data.categorySlug || data.category,
        featured: data.isPopular || false,
        image: data.image,
        available: data.isAvailable,
      };
    });

    return NextResponse.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu:', error);
    // Fallback to static data on error
    return NextResponse.json(staticMenuItems);
  }
}

export async function POST(request: Request) {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const data = await request.json();
    
    const menuItem = {
      ...data,
      isAvailable: true,
      isPopular: data.featured || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('menuItems').add(menuItem);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...menuItem 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    );
  }
}
