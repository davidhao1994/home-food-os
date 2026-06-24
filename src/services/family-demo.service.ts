import { prisma } from "@/lib/prisma";
import {
  FAMILY_DEMO_HOUSEHOLD_ID,
  FAMILY_DEMO_HOUSEHOLD_NAME,
  FAMILY_DEMO_USER_ID,
  isFamilyDemoModeEnabled
} from "@/lib/family-demo";
import { ensureProfile } from "@/services/profile.service";

let setupPromise: Promise<void> | null = null;

async function setupFamilyDemoData() {
  await ensureProfile({
    userId: FAMILY_DEMO_USER_ID,
    email: "family-demo@homefoodos.local",
    fullName: "Dave & Husband",
    avatarUrl: null
  });

  await prisma.household.upsert({
    where: { id: FAMILY_DEMO_HOUSEHOLD_ID },
    update: {
      name: FAMILY_DEMO_HOUSEHOLD_NAME,
      ownerId: FAMILY_DEMO_USER_ID
    },
    create: {
      id: FAMILY_DEMO_HOUSEHOLD_ID,
      name: FAMILY_DEMO_HOUSEHOLD_NAME,
      ownerId: FAMILY_DEMO_USER_ID
    }
  });

  await prisma.householdMember.upsert({
    where: {
      householdId_userId: {
        householdId: FAMILY_DEMO_HOUSEHOLD_ID,
        userId: FAMILY_DEMO_USER_ID
      }
    },
    update: { role: "owner" },
    create: {
      householdId: FAMILY_DEMO_HOUSEHOLD_ID,
      userId: FAMILY_DEMO_USER_ID,
      role: "owner"
    }
  });
}

export async function ensureFamilyDemoSetup() {
  if (!isFamilyDemoModeEnabled()) {
    return;
  }

  if (!setupPromise) {
    setupPromise = setupFamilyDemoData();
  }

  await setupPromise;
}

export async function resolveHouseholdIdForUser(userId: string) {
  if (isFamilyDemoModeEnabled()) {
    return FAMILY_DEMO_HOUSEHOLD_ID;
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    select: { householdId: true },
    orderBy: { createdAt: "asc" }
  });

  return membership?.householdId ?? null;
}