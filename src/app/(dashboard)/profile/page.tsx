import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignoutButton } from "@/features/auth/signout-button";
import { requireUser } from "@/lib/auth";
import { FAMILY_DEMO_HOUSEHOLD_NAME, isFamilyDemoModeEnabled } from "@/lib/family-demo";
import { prisma } from "@/lib/prisma";
import { getAuthProfileMetadata } from "@/services/profile.service";

export default async function ProfilePage() {
  const user = await requireUser();
  const isDemoMode = isFamilyDemoModeEnabled();
  const metadata = getAuthProfileMetadata(user.user_metadata as Record<string, unknown> | undefined);
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });

  const displayName = profile?.fullName ?? metadata.fullName ?? user.email?.split("@")[0] ?? "User";
  const avatarUrl = profile?.avatarUrl ?? metadata.avatarUrl;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account and session." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="mb-2 flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${displayName} avatar`}
                className="h-14 w-14 rounded-full border object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted text-base font-semibold">
                {initials || "U"}
              </div>
            )}
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-muted-foreground">{isDemoMode ? "Family demo profile" : user.app_metadata?.provider === "google" ? "Google account" : "Email account"}</p>
            </div>
          </div>
          <p>Email: {user.email}</p>
          <p>User ID: {user.id}</p>
          {isDemoMode ? <p>Household: {FAMILY_DEMO_HOUSEHOLD_NAME}</p> : null}
          {!isDemoMode ? <SignoutButton /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
