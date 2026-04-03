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
  const logoIcon = siteSettings.logoUrl?.trim() || "/logo.png";

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
        { url: "/icon", type: "image/png", sizes: "512x512" },
        { url: logoIcon, type: "image/png" },
      ],
      shortcut: [
        { url: "/icon", type: "image/png", sizes: "512x512" },
        { url: logoIcon, type: "image/png" },
      ],
      apple: [
        { url: "/apple-icon", type: "image/png", sizes: "180x180" },
        { url: logoIcon, type: "image/png" },
      ],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteSettings = await fetchSiteSettings();
  const performanceCompatScript = `
    (function () {
      var perf = window.performance || {};
      var proto = perf && typeof Object.getPrototypeOf === "function"
        ? Object.getPrototypeOf(perf)
        : null;

      function defineNoop(target, key, value) {
        if (!target || typeof target[key] === "function") {
          return;
        }

        try {
          Object.defineProperty(target, key, {
            configurable: true,
            writable: true,
            value: value,
          });
        } catch (_error) {
          try {
            target[key] = value;
          } catch (_assignError) {
            // Ignore write failures on locked browser objects.
          }
        }
      }

      defineNoop(perf, "getEntriesByName", function () {
        return [];
      });
      defineNoop(proto, "getEntriesByName", function () {
        return [];
      });

      defineNoop(perf, "mark", function () {});
      defineNoop(proto, "mark", function () {});

      defineNoop(perf, "measure", function (name) {
        return { name: name || "", entryType: "measure", startTime: 0, duration: 0 };
      });
      defineNoop(proto, "measure", function (name) {
        return { name: name || "", entryType: "measure", startTime: 0, duration: 0 };
      });

      defineNoop(perf, "clearMarks", function () {});
      defineNoop(proto, "clearMarks", function () {});

      defineNoop(perf, "clearMeasures", function () {});
      defineNoop(proto, "clearMeasures", function () {});

      if (!window.performance) {
        window.performance = perf;
      }
    })();
  `;

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: performanceCompatScript }} />
      </head>
      <body className={`${inter.variable} min-h-screen text-slate-900 antialiased`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar siteSettings={siteSettings} />
            <main className="site-main-shell flex-1">
              {children}
            </main>
            <footer className="mobile-site-footer w-full">
              <div className="mobile-site-footer-inner mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
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
