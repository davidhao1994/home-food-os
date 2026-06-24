import {
  ItemCategory,
  PrismaClient,
  ShoppingPriority,
  StorageLocation
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000010";
const DEMO_HOUSEHOLD_NAME = "Dave & Husband Home";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  await prisma.profile.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      email: "family-demo@homefoodos.local",
      fullName: "Dave & Husband"
    },
    create: {
      id: DEMO_USER_ID,
      email: "family-demo@homefoodos.local",
      fullName: "Dave & Husband"
    }
  });

  await prisma.household.upsert({
    where: { id: DEMO_HOUSEHOLD_ID },
    update: {
      name: DEMO_HOUSEHOLD_NAME,
      ownerId: DEMO_USER_ID
    },
    create: {
      id: DEMO_HOUSEHOLD_ID,
      name: DEMO_HOUSEHOLD_NAME,
      ownerId: DEMO_USER_ID
    }
  });

  await prisma.householdMember.upsert({
    where: {
      householdId_userId: {
        householdId: DEMO_HOUSEHOLD_ID,
        userId: DEMO_USER_ID
      }
    },
    update: { role: "owner" },
    create: {
      householdId: DEMO_HOUSEHOLD_ID,
      userId: DEMO_USER_ID,
      role: "owner"
    }
  });

  await prisma.inventoryConsumption.deleteMany({
    where: { userId: DEMO_USER_ID }
  });

  await prisma.inventoryItem.deleteMany({
    where: { userId: DEMO_USER_ID }
  });

  await prisma.shoppingListItem.deleteMany({
    where: { userId: DEMO_USER_ID }
  });

  await prisma.inventoryItem.createMany({
    data: [
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Eggs",
        quantity: 12,
        unit: "count",
        category: ItemCategory.EGGS,
        storageLocation: StorageLocation.REFRIGERATOR,
        expirationDate: daysFromNow(10)
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Milk",
        quantity: 1,
        unit: "gallon",
        category: ItemCategory.DAIRY,
        storageLocation: StorageLocation.REFRIGERATOR,
        expirationDate: daysFromNow(5)
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Chicken breast",
        quantity: 2,
        unit: "lb",
        category: ItemCategory.MEAT,
        storageLocation: StorageLocation.FREEZER,
        expirationDate: daysFromNow(30)
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Tofu",
        quantity: 2,
        unit: "packs",
        category: ItemCategory.OTHER,
        storageLocation: StorageLocation.REFRIGERATOR,
        expirationDate: daysFromNow(7)
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Broccoli",
        quantity: 2,
        unit: "heads",
        category: ItemCategory.VEGETABLES,
        storageLocation: StorageLocation.REFRIGERATOR,
        expirationDate: daysFromNow(4)
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Rice",
        quantity: 5,
        unit: "lb",
        category: ItemCategory.GRAINS,
        storageLocation: StorageLocation.PANTRY,
        expirationDate: daysFromNow(365)
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Greek yogurt",
        quantity: 4,
        unit: "cups",
        category: ItemCategory.DAIRY,
        storageLocation: StorageLocation.REFRIGERATOR,
        expirationDate: daysFromNow(6)
      }
    ]
  });

  await prisma.shoppingListItem.createMany({
    data: [
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Bananas",
        quantity: 1,
        unit: "item",
        category: ItemCategory.FRUITS,
        priority: ShoppingPriority.MEDIUM
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Salmon",
        quantity: 1,
        unit: "item",
        category: ItemCategory.SEAFOOD,
        priority: ShoppingPriority.MEDIUM
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Spinach",
        quantity: 1,
        unit: "item",
        category: ItemCategory.VEGETABLES,
        priority: ShoppingPriority.MEDIUM
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Soy sauce",
        quantity: 1,
        unit: "item",
        category: ItemCategory.CONDIMENTS,
        priority: ShoppingPriority.MEDIUM
      },
      {
        userId: DEMO_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: "Frozen vegetables",
        quantity: 1,
        unit: "item",
        category: ItemCategory.FROZEN_FOODS,
        priority: ShoppingPriority.MEDIUM
      }
    ]
  });

  console.log("Family demo data reset complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
