import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Static menu data for seeding
const menuItems = [
  // Appetizers (Entrées)
  { name: "Brochettes de Bœuf", description: "Grilled beef skewers with spicy sauce, served with fresh onions and tomatoes", price: 3500, category: "appetizer", categorySlug: "appetizer", isPopular: true, image: "/item-brochettes.png", isAvailable: true },
  { name: "Accra", description: "Traditional fried fish fritters, crispy outside and tender inside", price: 2500, category: "appetizer", categorySlug: "appetizer", isPopular: false, image: "/item-accra.png", isAvailable: true },
  { name: "Samoussa aux Légumes", description: "Crispy vegetable samosas with mint chutney", price: 2000, category: "appetizer", categorySlug: "appetizer", isPopular: false, image: "/item-samoussa.png", isAvailable: true },
  { name: "Salade d'Avocat", description: "Fresh avocado salad with lime dressing and grilled shrimp", price: 3000, category: "appetizer", categorySlug: "appetizer", isPopular: false, image: "/item-salade-avocat.png", isAvailable: true },
  
  // Main Courses (Plats Principaux)
  { name: "Poulet DG", description: "Signature grilled chicken with fried plantains and sautéed vegetables", price: 5500, category: "main", categorySlug: "main", isPopular: true, image: "/item-poulet-dg.png", isAvailable: true },
  { name: "Poisson Braisé", description: "Perfectly braised whole fish served with golden fries and fresh salad", price: 6000, category: "main", categorySlug: "main", isPopular: true, image: "/item-poisson-braise.png", isAvailable: true },
  { name: "Ndolé", description: "Traditional Cameroonian stew with fish, nuts, and bitter leaves served with miondo", price: 5000, category: "main", categorySlug: "main", isPopular: true, image: "/item-ndole.png", isAvailable: true },
  { name: "Saka Saka", description: "Cassava leaf stew with smoked fish and beef, served with white rice", price: 4500, category: "main", categorySlug: "main", isPopular: false, image: "/item-saka-saka.png", isAvailable: true },
  { name: "Riz Sauce Tomate", description: "Fluffy rice with rich tomato sauce and your choice of protein", price: 4000, category: "main", categorySlug: "main", isPopular: false, image: "/food-main.png", isAvailable: true },
  
  // Grilled Specialties
  { name: "Côte de Bœuf", description: "Premium grilled beef rib with herb butter, fries, and grilled vegetables", price: 8000, category: "grilled", categorySlug: "grilled", isPopular: true, image: "/item-cote-boeuf.png", isAvailable: true },
  { name: "Brochette Mixte", description: "Assorted meat skewers - beef, chicken, and lamb with spicy marinade", price: 6500, category: "grilled", categorySlug: "grilled", isPopular: false, image: "/item-brochette-mixte.png", isAvailable: true },
  { name: "Poulet Grillé", description: "Half grilled chicken marinated in herbs and spices", price: 5000, category: "grilled", categorySlug: "grilled", isPopular: false, image: "/item-poulet-dg.png", isAvailable: true },
  
  // Seafood
  { name: "Crevettes Grillées", description: "Jumbo grilled prawns with garlic butter sauce and lemon", price: 7500, category: "seafood", categorySlug: "seafood", isPopular: true, image: "/item-crevettes.png", isAvailable: true },
  { name: "Filet de Tilapia", description: "Pan-seared tilapia fillet with sautéed vegetables and white wine sauce", price: 6500, category: "seafood", categorySlug: "seafood", isPopular: false, image: "/food-seafood.png", isAvailable: true },
  { name: "Calamars Frits", description: "Crispy fried calamari rings with tartar sauce", price: 5500, category: "seafood", categorySlug: "seafood", isPopular: false, image: "/food-seafood.png", isAvailable: true },
  
  // Vegetarian
  { name: "Légumes Sautés", description: "Mixed seasonal vegetables stir-fried with garlic and ginger", price: 3500, category: "vegetarian", categorySlug: "vegetarian", isPopular: false, image: "/food-vegetarian.png", isAvailable: true },
  { name: "Riz Végétarien", description: "Vegetable fried rice with tofu and cashews", price: 4000, category: "vegetarian", categorySlug: "vegetarian", isPopular: false, image: "/food-vegetarian.png", isAvailable: true },
  
  // Desserts
  { name: "Banane Flambée", description: "Flambéed banana with vanilla ice cream and caramel drizzle", price: 3000, category: "dessert", categorySlug: "dessert", isPopular: true, image: "/item-banane-flambee.png", isAvailable: true },
  { name: "Glace Maison", description: "Homemade ice cream - choice of vanilla, chocolate, or mango", price: 2500, category: "dessert", categorySlug: "dessert", isPopular: false, image: "/food-dessert.png", isAvailable: true },
  { name: "Fruits Tropicaux", description: "Fresh seasonal tropical fruits with mint syrup", price: 2000, category: "dessert", categorySlug: "dessert", isPopular: false, image: "/food-dessert.png", isAvailable: true },
  
  // Beverages
  { name: "Jus de Bissap", description: "Refreshing hibiscus flower juice, sweetened to perfection", price: 1500, category: "beverage", categorySlug: "beverage", isPopular: false, image: "/item-bissap.png", isAvailable: true },
  { name: "Jus de Gingembre", description: "Spicy ginger juice with a hint of lemon", price: 1500, category: "beverage", categorySlug: "beverage", isPopular: false, image: "/food-beverage.png", isAvailable: true },
  { name: "Jus d'Ananas", description: "Fresh pineapple juice, sweet and tangy", price: 1500, category: "beverage", categorySlug: "beverage", isPopular: false, image: "/food-beverage.png", isAvailable: true },
  { name: "Eau Minérale", description: "Premium mineral water - 500ml", price: 1000, category: "beverage", categorySlug: "beverage", isPopular: false, image: "/food-beverage.png", isAvailable: true },
  { name: "Coca-Cola", description: "Classic Coca-Cola - 330ml", price: 1500, category: "beverage", categorySlug: "beverage", isPopular: false, image: "/food-beverage.png", isAvailable: true },
  
  // Cocktails
  { name: "Safari Sunset", description: "Signature cocktail with vodka, passion fruit, and grenadine", price: 4000, category: "cocktail", categorySlug: "cocktail", isPopular: true, image: "/item-safari-sunset.png", isAvailable: true },
  { name: "Mojito Classic", description: "Classic mojito with white rum, mint, lime, and soda", price: 3500, category: "cocktail", categorySlug: "cocktail", isPopular: false, image: "/item-mojito.png", isAvailable: true },
  { name: "Manhattan", description: "Whiskey cocktail with sweet vermouth and bitters", price: 4500, category: "cocktail", categorySlug: "cocktail", isPopular: false, image: "/item-mojito.png", isAvailable: true },
  { name: "Piña Colada", description: "Tropical blend of rum, coconut cream, and pineapple juice", price: 4000, category: "cocktail", categorySlug: "cocktail", isPopular: false, image: "/item-safari-sunset.png", isAvailable: true },
  { name: "Sex on the Beach", description: "Vodka with peach schnapps, orange juice, and cranberry", price: 4000, category: "cocktail", categorySlug: "cocktail", isPopular: false, image: "/item-safari-sunset.png", isAvailable: true },
];

const categories = [
  { name: 'Appetizers', slug: 'appetizer', description: 'Start your meal with our delicious appetizers', displayOrder: 1 },
  { name: 'Main Courses', slug: 'main', description: 'Hearty main dishes prepared with fresh ingredients', displayOrder: 2 },
  { name: 'Grilled Specialties', slug: 'grilled', description: 'Perfectly grilled meats and vegetables', displayOrder: 3 },
  { name: 'Seafood', slug: 'seafood', description: 'Fresh seafood from the Atlantic coast', displayOrder: 4 },
  { name: 'Vegetarian', slug: 'vegetarian', description: 'Delicious vegetarian options', displayOrder: 5 },
  { name: 'Desserts', slug: 'dessert', description: 'Sweet endings to your meal', displayOrder: 6 },
  { name: 'Beverages', slug: 'beverage', description: 'Refreshing drinks and juices', displayOrder: 7 },
  { name: 'Cocktails', slug: 'cocktail', description: 'Handcrafted cocktails and mixed drinks', displayOrder: 8 },
];

export async function GET() {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        message: 'Firebase not initialized. Please check your environment variables.' 
      });
    }

    // Seed categories
    const categoriesBatch = adminDb.batch();
    for (const category of categories) {
      const docRef = adminDb.collection('categories').doc(category.slug);
      categoriesBatch.set(docRef, {
        ...category,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await categoriesBatch.commit();

    // Seed menu items
    const menuBatch = adminDb.batch();
    for (const item of menuItems) {
      const docRef = adminDb.collection('menuItems').doc();
      menuBatch.set(docRef, {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await menuBatch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${categories.length} categories and ${menuItems.length} menu items` 
    });
  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
