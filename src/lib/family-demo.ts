export type AppAuthUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};

export const FAMILY_DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
export const FAMILY_DEMO_HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000010";
export const FAMILY_DEMO_HOUSEHOLD_NAME = "Dave & Husband Home";

export function isFamilyDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_FAMILY_DEMO_MODE === "true";
}

export function getFamilyDemoUser(): AppAuthUser {
  return {
    id: FAMILY_DEMO_USER_ID,
    email: "family-demo@homefoodos.local",
    user_metadata: {
      full_name: "Dave & Husband"
    },
    app_metadata: {
      provider: "family-demo"
    }
  };
}