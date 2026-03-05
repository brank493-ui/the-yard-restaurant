import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const menuItems = [
  // Appetizers (Entrées)
  { name: "Brochettes de Bœuf", description: "Grilled beef skewers with spicy sauce, served with fresh onions and tomatoes", price: 3500, category: "appetizer", featured: true },
  { name: "Accra", description: "Traditional fried fish fritters, crispy outside and tender inside", price: 2500, category: "appetizer", featured: false },
  { name: "Samoussa aux Légumes", description: "Crispy vegetable samosas with mint chutney", price: 2000, category: "appetizer", featured: false },
  { name: "Salade d'Avocat", description: "Fresh avocado salad with lime dressing and grilled shrimp", price: 3000, category: "appetizer", featured: false },
  
  // Main Courses (Plats Principaux)
  { name: "Poulet DG", description: "Signature grilled chicken with fried plantains and sautéed vegetables", price: 5500, category: "main", featured: true },
  { name: "Poisson Braisé", description: "Perfectly braised whole fish served with golden fries and fresh salad", price: 6000, category: "main", featured: true },
  { name: "Ndolé", description: "Traditional Cameroonian stew with fish, nuts, and bitter leaves served with miondo", price: 5000, category: "main", featured: true },
  { name: "Saka Saka", description: "Cassava leaf stew with smoked fish and beef, served with white rice", price: 4500, category: "main", featured: false },
  { name: "Riz Sauce Tomate", description: "Fluffy rice with rich tomato sauce and your choice of protein", price: 4000, category: "main", featured: false },
  
  // Grilled Specialties
  { name: "Côte de Bœuf", description: "Premium grilled beef rib with herb butter, fries, and grilled vegetables", price: 8000, category: "grilled", featured: true },
  { name: "Brochette Mixte", description: "Assorted meat skewers - beef, chicken, and lamb with spicy marinade", price: 6500, category: "grilled", featured: false },
  { name: "Poulet Grillé", description: "Half grilled chicken marinated in herbs and spices", price: 5000, category: "grilled", featured: false },
  
  // Seafood
  { name: "Crevettes Grillées", description: "Jumbo grilled prawns with garlic butter sauce and lemon", price: 7500, category: "seafood", featured: true },
  { name: "Filet de Tilapia", description: "Pan-seared tilapia fillet with sautéed vegetables and white wine sauce", price: 6500, category: "seafood", featured: false },
  { name: "Calamars Frits", description: "Crispy fried calamari rings with tartar sauce", price: 5500, category: "seafood", featured: false },
  
  // Vegetarian
  { name: "Légumes Sautés", description: "Mixed seasonal vegetables stir-fried with garlic and ginger", price: 3500, category: "vegetarian", featured: false },
  { name: "Riz Végétarien", description: "Vegetable fried rice with tofu and cashews", price: 4000, category: "vegetarian", featured: false },
  
  // Desserts
  { name: "Banane Flambée", description: "Flambéed banana with vanilla ice cream and caramel drizzle", price: 3000, category: "dessert", featured: true },
  { name: "Glace Maison", description: "Homemade ice cream - choice of vanilla, chocolate, or mango", price: 2500, category: "dessert", featured: false },
  { name: "Fruits Tropicaux", description: "Fresh seasonal tropical fruits with mint syrup", price: 2000, category: "dessert", featured: false },
  
  // Beverages
  { name: "Jus de Bissap", description: "Refreshing hibiscus flower juice, sweetened to perfection", price: 1500, category: "beverage", featured: false },
  { name: "Jus de Gingembre", description: "Spicy ginger juice with a hint of lemon", price: 1500, category: "beverage", featured: false },
  { name: "Jus d'Ananas", description: "Fresh pineapple juice, sweet and tangy", price: 1500, category: "beverage", featured: false },
  { name: "Eau Minérale", description: "Premium mineral water - 500ml", price: 1000, category: "beverage", featured: false },
  { name: "Coca-Cola", description: "Classic Coca-Cola - 330ml", price: 1500, category: "beverage", featured: false },
  
  // Cocktails
  { name: "Safari Sunset", description: "Signature cocktail with vodka, passion fruit, and grenadine", price: 4000, category: "cocktail", featured: true },
  { name: "Mojito Classic", description: "Classic mojito with white rum, mint, lime, and soda", price: 3500, category: "cocktail", featured: false },
  { name: "Manhattan", description: "Whiskey cocktail with sweet vermouth and bitters", price: 4500, category: "cocktail", featured: false },
  { name: "Piña Colada", description: "Tropical blend of rum, coconut cream, and pineapple juice", price: 4000, category: "cocktail", featured: false },
  { name: "Sex on the Beach", description: "Vodka with peach schnapps, orange juice, and cranberry", price: 4000, category: "cocktail", featured: false },
];

async function main() {
  console.log('Seeding menu items...');
  
  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: item
    });
  }
  
  console.log(`Created ${menuItems.length} menu items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
