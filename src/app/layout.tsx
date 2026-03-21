import "./globals.css";
import Navbar from "./Navbar";
import type { Metadata } from "next";
import { Providers } from "./Providers";
import { Inter } from "next/font/google";
import { fetchSiteSettings } from "../lib/siteSettings";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await fetchSiteSettings();

  return {
    title: siteSettings.siteName,
    description: siteSettings.siteDescription,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteSettings = await fetchSiteSettings();

  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-slate-50 text-slate-900 antialiased`}>
        <Providers>
          <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar siteSettings={siteSettings} />
            <main className="flex-1 pt-36">
              {children}
            </main>
            <footer className="w-full bg-white">
              <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
                <div className="inline-flex items-center rounded-full bg-slate-50 px-5 py-2 text-xl font-bold tracking-[-0.04em] text-slate-900 shadow-sm sm:text-2xl">
                  <span className="text-slate-900">{siteSettings.siteName}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{siteSettings.footerNotice}</p>
                <p className="mt-2 text-xs text-slate-500">© {new Date().getFullYear()} {siteSettings.siteName}. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
