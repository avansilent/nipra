import "./globals.css";
import Navbar from "./Navbar";
import type { Metadata } from "next";
import { Providers } from "./Providers";
import { Space_Grotesk, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: 'Nipra Academy',
  description: 'A premium, minimal, Apple-style educational SaaS platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} min-h-screen text-[#1a202c] antialiased`}>
        <Providers>
          <div className="bg-gradient-to-br from-[#e0f2fe] via-[#f8fafc] to-[#e0f7fa] min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 pt-24">
              {children}
            </main>
            <footer className="w-full py-10 text-center bg-white/80 border-t border-[#e2e8f0]">
              <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="font-semibold text-[#0f172a] mb-2">Nipra Academy</div>
                <p className="text-xs text-[#94a3b8]">© {new Date().getFullYear()} Nipra Academy. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
