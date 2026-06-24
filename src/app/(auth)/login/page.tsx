import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { isFamilyDemoModeEnabled } from "@/lib/family-demo";

export default function LoginPage() {
  if (isFamilyDemoModeEnabled()) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Need an account? <Link href="/signup" className="text-primary underline">Sign up</Link>
      </p>
    </div>
  );
}
