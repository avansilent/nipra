import "./globals.css";
import Navbar from "./Navbar";
import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "./Providers";
import { Inter } from "next/font/google";
import { fetchSiteSettings } from "../lib/siteSettings";
import { resolveLogoSrc } from "../lib/branding";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await fetchSiteSettings();
  const logoIcon = resolveLogoSrc(siteSettings.logoUrl);

  return {
    applicationName: siteSettings.siteName,
    title: siteSettings.siteName,
    description: siteSettings.siteDescription,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: siteSettings.siteName,
    },
    icons: {
      icon: [
        { url: logoIcon },
        { url: "/icon", type: "image/png", sizes: "512x512" },
      ],
      shortcut: [
        { url: logoIcon },
        { url: "/icon", type: "image/png", sizes: "512x512" },
      ],
      apple: [
        { url: logoIcon },
        { url: "/apple-icon", type: "image/png", sizes: "180x180" },
      ],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteSettings = await fetchSiteSettings();
  const navbarSiteSettings = {
    siteName: siteSettings.siteName,
    logoUrl: siteSettings.logoUrl,
  };

  return (
    <html lang="en" data-performance-mode="full" suppressHydrationWarning>
      <head>
        <Script src="/site-boot.js" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.variable} min-h-screen w-full text-slate-900 antialiased`}>
        <Providers>
          <div className="flex min-h-screen w-full flex-col">
            <Navbar siteSettings={navbarSiteSettings} />
            <main className="site-main-shell w-full flex-1">
              {children}
            </main>
            <footer className="mobile-site-footer w-full">
              <div className="mobile-site-footer-inner w-full px-4 py-6 text-center sm:px-6 lg:px-8">
                <p className="text-xs text-slate-500">&copy; 2026 Nipracademy. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
