import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/features/auth/signup-form";
import { isFamilyDemoModeEnabled } from "@/lib/family-demo";

export default function SignupPage() {
  if (isFamilyDemoModeEnabled()) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="text-primary underline">Log in</Link>
      </p>
    </div>
  );
}
