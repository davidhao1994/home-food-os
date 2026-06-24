import { prisma } from "@/lib/prisma";

type EnsureProfileInput = {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export async function ensureProfile({ userId, email, fullName, avatarUrl }: EnsureProfileInput) {
  const fallbackEmail = email ?? `user-${userId}@homefoodos.local`;

  return prisma.profile.upsert({
    where: { id: userId },
    update: {
      email: fallbackEmail,
      fullName: fullName ?? undefined,
      avatarUrl: avatarUrl ?? undefined
    },
    create: {
      id: userId,
      email: fallbackEmail,
      fullName: fullName ?? null,
      avatarUrl: avatarUrl ?? null
    }
  });
}

export function getAuthProfileMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return {
      fullName: null,
      avatarUrl: null
    };
  }

  const fullName =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    null;

  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url.trim()) ||
    (typeof metadata.picture === "string" && metadata.picture.trim()) ||
    null;

  return {
    fullName,
    avatarUrl
  };
}
