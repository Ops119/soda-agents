import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Outfit } from "next/font/google";
import { ConnectSheet } from "@/components/connect-sheet";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers, type SessionView } from "@/components/providers";
import { currentProfile } from "@/lib/current";
import "./globals.css";

export const dynamic = "force-dynamic";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "Soda.agents", template: "%s · Soda.agents" },
  description: "Buy 30-day access and one-off kits for Solana agents. Pay in USDC on devnet.",
  applicationName: "Soda.agents",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Soda.agents", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#07110d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialSession: SessionView | null = null;
  try {
    const current = await currentProfile();
    if (current) {
      initialSession = {
        profileId: current.profile.id,
        wallet: current.profile.walletAddress,
        email: current.profile.email,
        country: current.profile.country,
      };
    }
  } catch (error) {
    console.error(error);
  }

  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:text-lime-ink">
          Skip to content
        </a>
        <Providers
          initialSession={initialSession}
          phantomAppId={process.env.NEXT_PUBLIC_PHANTOM_APP_ID ?? ""}
          rpc={process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com"}
        >
          <div className="flex min-h-screen flex-col">
            <Header />
            <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
              {children}
            </main>
            <Footer />
          </div>
          <ConnectSheet />
        </Providers>
      </body>
    </html>
  );
}
