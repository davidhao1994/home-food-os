import { PrismaClient, ItemCategory, StorageLocation, RecipeDifficulty } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  await prisma.profile.upsert({
    where: { id: demoUserId },
    update: {},
    create: {
      id: demoUserId,
      email: "demo@homefoodos.com",
      fullName: "Demo User"
    }
  });

  await prisma.inventoryItem.createMany({
    data: [
      {
        userId: demoUserId,
        name: "Chicken Breast",
        quantity: 1.2,
        unit: "kg",
        category: ItemCategory.MEAT,
        storageLocation: StorageLocation.FREEZER,
        expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      },
      {
        userId: demoUserId,
        name: "Spinach",
        quantity: 300,
        unit: "g",
        category: ItemCategory.VEGETABLES,
        storageLocation: StorageLocation.REFRIGERATOR,
        expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId: demoUserId,
        name: "Greek Yogurt",
        quantity: 4,
        unit: "cups",
        category: ItemCategory.DAIRY,
        storageLocation: StorageLocation.REFRIGERATOR,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ],
    skipDuplicates: true
  });

  const recipe = await prisma.recipe.upsert({
    where: { id: "10000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000001",
      name: "High-Protein Chicken Bowl",
      description: "A quick macro-balanced bowl for weeknight dinners.",
      cuisine: "High Protein",
      cookTime: 25,
      difficulty: RecipeDifficulty.EASY,
      calories: 540,
      protein: 44,
      carbs: 36,
      fat: 18
    }
  });

  await prisma.recipeIngredient.createMany({
    data: [
      { recipeId: recipe.id, name: "Chicken Breast", quantity: 300, unit: "g", category: ItemCategory.MEAT },
      { recipeId: recipe.id, name: "Rice", quantity: 1, unit: "cup", category: ItemCategory.GRAINS },
      { recipeId: recipe.id, name: "Spinach", quantity: 100, unit: "g", category: ItemCategory.VEGETABLES }
    ],
    skipDuplicates: true
  });

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
