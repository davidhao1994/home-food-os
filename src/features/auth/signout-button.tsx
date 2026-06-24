"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

export function SignoutButton() {
  const router = useRouter();
  const isFamilyDemoMode = process.env.NEXT_PUBLIC_FAMILY_DEMO_MODE === "true";

  const signOut = async () => {
    if (isFamilyDemoMode) {
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button variant="secondary" onClick={signOut} disabled={isFamilyDemoMode}>
      {isFamilyDemoMode ? "Demo mode active" : "Sign Out"}
    </Button>
  );
}
