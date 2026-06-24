import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { ensureProfile, getAuthProfileMetadata } from "@/services/profile.service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const metadata = getAuthProfileMetadata(user.user_metadata as Record<string, unknown> | undefined);

    await ensureProfile({
      userId: user.id,
      email: user.email,
      fullName: metadata.fullName,
      avatarUrl: metadata.avatarUrl
    });
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
