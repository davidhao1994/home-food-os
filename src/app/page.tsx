import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFamilyDemoModeEnabled } from "@/lib/family-demo";

export default async function HomePage() {
  if (isFamilyDemoModeEnabled()) {
    redirect("/dashboard");
  }

  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
