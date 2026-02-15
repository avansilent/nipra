import "./globals.css";
import Navbar from "./Navbar";
import type { Metadata } from "next";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: 'Nipra Academy',
  description: 'A premium, minimal, Apple-style educational SaaS platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-[#1a202c] antialiased">
        <Providers>
          <div className="bg-gradient-to-br from-[#e0f2fe] via-[#f8fafc] to-[#e0f7fa] min-h-screen">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 md:px-12 pt-24">
              {children}
            </main>
            <footer className="w-full mt-16 py-8 text-center text-[#64748b] text-sm bg-white/80 border-t border-[#e2e8f0]">
              © {new Date().getFullYear()} Nipra Academy. All rights reserved.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
