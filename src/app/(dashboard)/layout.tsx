import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { isFamilyDemoModeEnabled } from "@/lib/family-demo";
import { ensureFamilyDemoSetup } from "@/services/family-demo.service";
import { ensureProfile, getAuthProfileMetadata } from "@/services/profile.service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  if (isFamilyDemoModeEnabled()) {
    await ensureFamilyDemoSetup();
    return <AppShell>{children}</AppShell>;
  }

  const metadata = getAuthProfileMetadata(user.user_metadata as Record<string, unknown> | undefined);

  await ensureProfile({
    userId: user.id,
    email: user.email,
    fullName: metadata.fullName,
    avatarUrl: metadata.avatarUrl
  });

  return <AppShell>{children}</AppShell>;
}
