import { redirect } from "next/navigation";
import { AppAuthUser, getFamilyDemoUser, isFamilyDemoModeEnabled } from "@/lib/family-demo";
import { createClient } from "@/lib/supabase-server";
import { ensureFamilyDemoSetup } from "@/services/family-demo.service";

export async function getCurrentUser() {
  if (isFamilyDemoModeEnabled()) {
    await ensureFamilyDemoSetup();
    return getFamilyDemoUser();
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const currentUser: AppAuthUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata as Record<string, unknown> | undefined) ?? {},
    app_metadata: (user.app_metadata as Record<string, unknown> | undefined) ?? {}
  };

  return currentUser;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
