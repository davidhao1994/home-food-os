"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Authentication error</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Please try again. If this persists, verify your Supabase auth configuration.
      </p>
      <Button className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
