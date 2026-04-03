"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./AuthProvider";
import type { SiteSettings } from "../types/site";
import { buttonHover, motionEase, tapPress } from "../lib/motion";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/courses", label: "Courses" },
  { href: "/books", label: "Books" },
  { href: "/notes", label: "Notes" },
  { href: "/#contact", label: "Contact" },
];

type NavbarProps = {
  siteSettings: SiteSettings;
};

export default function Navbar({ siteSettings }: NavbarProps) {
  const { isAuthenticated, logout, role } = useAuth();
  const pathname = usePathname();
  const [isMobileViewport, setIsMobileViewport] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileActions = useMemo(() => {
    if (isAuthenticated) {
      return [
        role === "admin" ? { href: "/admin/dashboard", label: "Admin Panel", tone: "admin" as const } : null,
        role === "student" ? { href: "/student/dashboard", label: "Dashboard", tone: "student" as const } : null,
      ].filter(Boolean) as Array<{ href: string; label: string; tone: "admin" | "student" }>;
    }

    return [
      { href: "/login?type=student", label: "Student Login", tone: "student" as const },
      { href: "/login?type=admin", label: "Admin Login", tone: "admin" as const },
    ];
  }, [isAuthenticated, role]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const handleViewportChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileViewport(event.matches);

      if (!event.matches) {
        setMobileMenuOpen(false);
      }
    };

    handleViewportChange(mediaQuery);

    const listener = (event: MediaQueryListEvent) => handleViewportChange(event);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
    } else {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, []);

  const isActiveNavLink = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    if (href.startsWith("/#")) {
      return pathname === "/";
    }

    return pathname === href;
  };

  return (
    <motion.nav
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: motionEase }}
      className="w-full fixed top-0 left-0 z-50"
    >
      <div className="glass-bar">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-0 lg:py-0">
          {isMobileViewport ? (
            <>
              <div className="mobile-nav-shell flex items-center justify-between">
                <Link href="/" className="mobile-nav-brand flex min-w-0 items-center gap-3">
                  <div className="mobile-nav-logo flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
                    <img
                      src={siteSettings.logoUrl || "/logo.png"}
                      alt={siteSettings.siteName}
                      width="36"
                      height="36"
                      className="block h-8 w-8 object-contain"
                    />
                  </div>
                  <span className="mobile-nav-brand-text truncate text-[1.15rem] font-semibold tracking-[-0.05em] text-slate-900">
                    {siteSettings.siteName}
                  </span>
                </Link>

                <motion.button
                  type="button"
                  aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-navigation-menu"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  whileTap={{ scale: 0.96 }}
                  className={`mobile-menu-trigger inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/96 text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${mobileMenuOpen ? "is-open" : ""}`}
                >
                  <span className="sr-only">Toggle navigation</span>
                  <span className="mobile-menu-trigger-surface" aria-hidden="true" />
                  <span className={`mobile-menu-icon ${mobileMenuOpen ? "is-open" : ""}`} aria-hidden="true">
                    <span className="mobile-menu-line" />
                    <span className="mobile-menu-line" />
                    <span className="mobile-menu-line" />
                  </span>
                </motion.button>
              </div>

              <AnimatePresence initial={false}>
                {mobileMenuOpen ? (
                  <motion.div
                    id="mobile-navigation-menu"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14, ease: motionEase }}
                    className="mobile-menu-panel mt-4 overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(247,248,250,0.96))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
                  >
                    <div className="space-y-2">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`mobile-menu-link flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                            isActiveNavLink(link.href)
                              ? "mobile-menu-link-active text-white"
                              : "mobile-menu-link-inactive bg-white/75 text-slate-700"
                          }`}
                        >
                          <span className="mobile-menu-link-label">{link.label}</span>
                        </Link>
                      ))}
                    </div>

                        <div className="mobile-menu-actions mt-4 grid gap-3 border-t border-slate-200/70 pt-4">
                      <Link
                        href="/#contact"
                            className="mobile-menu-action mobile-menu-action-primary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                      >
                        Book Free Demo
                      </Link>

                      {mobileActions.map((action) => (
                        <Link
                          key={action.href}
                          href={action.href}
                          className={`mobile-menu-action inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold ${
                            action.tone === "student"
                              ? "mobile-menu-action-student bg-sky-50 text-sky-700 ring-1 ring-sky-100"
                              : "mobile-menu-action-admin bg-slate-100 text-slate-800 ring-1 ring-slate-200"
                          }`}
                        >
                          {action.label}
                        </Link>
                      ))}

                      {isAuthenticated ? (
                        <button
                          type="button"
                          onClick={() => void logout()}
                          className="mobile-menu-action mobile-menu-action-neutral inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          Logout
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>
          ) : isMobileViewport === false ? (
            <div className="desktop-nav-row mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-5 lg:px-10 lg:py-6">
              <Link href="/" className="flex shrink-0 items-center gap-3 pr-2 lg:pr-4">
                <motion.div
                  whileHover={buttonHover}
                  whileTap={tapPress}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm"
                >
                  <img
                    src={siteSettings.logoUrl || "/logo.png"}
                    alt={siteSettings.siteName}
                    width="36"
                    height="36"
                    className="block h-8 w-8 object-contain"
                  />
                </motion.div>
                <span className="inline-flex items-center px-1 py-1 text-[1.35rem] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[1.65rem]">
                  {siteSettings.siteName}
                </span>
              </Link>

              <div className="desktop-nav-main flex min-w-0 flex-1 items-center justify-end gap-6 lg:gap-8">
                <div className="desktop-nav-links flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 px-2 lg:px-6">
                  {navLinks.map((link) => (
                    <motion.div
                      key={link.href}
                      whileHover={buttonHover}
                      whileTap={tapPress}
                      className="nav-center-link shrink-0"
                    >
                      <Link href={link.href} className={`desktop-nav-link nav-link-pill px-3 py-2.5 text-sm font-medium tracking-[0.02em] text-slate-700 hover:text-slate-900 sm:px-4 lg:px-5 ${isActiveNavLink(link.href) ? "desktop-nav-link-active" : ""}`}>
                        <span className="nav-text">{link.label}</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="desktop-nav-actions flex shrink-0 items-center gap-3">
                  <Link href="/#contact" className="inline-flex shrink-0">
                    <motion.div
                      whileHover={buttonHover}
                      whileTap={tapPress}
                      className="desktop-nav-action desktop-nav-action-primary flex items-center rounded-full px-4 py-2 text-sm font-medium"
                    >
                      Book Free Demo
                    </motion.div>
                  </Link>

                  {isAuthenticated ? (
                    <>
                      {role === "admin" ? (
                        <Link href="/admin/dashboard" className="inline-flex shrink-0">
                          <motion.div
                            whileHover={buttonHover}
                            whileTap={tapPress}
                            className="desktop-nav-action desktop-nav-action-secondary flex items-center rounded-full px-4 py-2 text-sm font-medium"
                          >
                            Admin Panel
                          </motion.div>
                        </Link>
                      ) : null}
                      {role === "student" ? (
                        <Link href="/student/dashboard" className="inline-flex shrink-0">
                          <motion.div
                            whileHover={buttonHover}
                            whileTap={tapPress}
                            className="desktop-nav-action desktop-nav-action-secondary flex items-center rounded-full px-4 py-2 text-sm font-medium"
                          >
                            Dashboard
                          </motion.div>
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void logout()}
                        className="desktop-nav-action desktop-nav-action-secondary flex items-center rounded-full px-4 py-2 text-sm font-medium smooth-hover"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login?type=student" className="inline-flex shrink-0">
                        <motion.div
                          whileHover={buttonHover}
                          whileTap={tapPress}
                          className="desktop-nav-action desktop-nav-action-secondary flex items-center rounded-full px-4 py-2 text-sm font-medium"
                        >
                          Student Login
                        </motion.div>
                      </Link>
                      <Link href="/login?type=admin" className="inline-flex shrink-0">
                        <motion.div
                          whileHover={buttonHover}
                          whileTap={tapPress}
                          className="desktop-nav-action desktop-nav-action-secondary flex items-center rounded-full px-4 py-2 text-sm font-medium"
                        >
                          Admin Login
                        </motion.div>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </motion.nav>
  );
}

