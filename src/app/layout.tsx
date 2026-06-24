import type { Metadata } from "next";
import "@/app/globals.css";
import { PwaInstallPrompt } from "@/components/shared/pwa-install-prompt";
import { Providers } from "@/components/shared/providers";
import { PwaRegister } from "@/components/shared/pwa-register";

export const metadata: Metadata = {
  title: "Home Food OS",
  description: "Household food operating system for inventory, shopping, meals, and nutrition"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <PwaRegister />
          <PwaInstallPrompt />
          {children}
        </Providers>
      </body>
    </html>
  );
}
