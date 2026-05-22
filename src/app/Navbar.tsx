"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./AuthProvider";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import { motionEase } from "../lib/motion";
import { resolveLogoSrc } from "../lib/branding";
import type { SiteSettings } from "../types/site";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/courses", label: "Courses" },
  { href: "/books", label: "Books" },
  { href: "/notes", label: "Notes" },
  { href: "/#contact", label: "Contact" },
];

type NavbarProps = {
  siteSettings: SiteSettings;
};

type InlineLink = {
  href: string;
  label: string;
};

type ThemeMode = "light" | "dark";

const themeStorageKey = "nipra-theme-v2";

const desktopMenuShellClass =
  "site-nav-menu navbar-desktop-menu desktop-nav-links flex w-full min-w-max flex-nowrap items-center justify-start gap-3 overflow-x-auto rounded-full bg-white/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_14px_30px_rgba(15,23,42,0.04)] backdrop-blur-[24px] lg:gap-3.5 lg:p-2.5";

const desktopMenuItemClass =
  "desktop-nav-link inline-flex min-h-[2.8rem] shrink-0 items-center justify-center rounded-full px-5 py-2 text-[0.88rem] font-medium tracking-normal text-slate-600 transition-[background-color,color,box-shadow,transform] duration-150 lg:px-6 lg:text-[0.91rem]";

const desktopMenuItemIdleClass =
  "hover:-translate-y-px hover:bg-white hover:text-slate-950 hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]";

const desktopMenuItemActiveClass = "desktop-nav-link-active bg-white text-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.07)]";

const mobileMenuToggleClass =
  "site-mobile-menu-toggle group relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-white text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-white/80 transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.09)]";

const mobileMenuPanelClass =
  "site-mobile-menu-panel overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(15,23,42,0.1)]";

const mobileMenuItemClass =
  "site-mobile-menu-item inline-flex w-full min-h-[2.75rem] items-center justify-between rounded-[0.95rem] px-3.5 py-2.5 text-left text-[0.88rem] font-medium tracking-normal text-slate-600 transition-[background-color,color,box-shadow,transform] duration-200 ease-out";

const mobileMenuItemIdleClass =
  "bg-slate-50 hover:bg-white hover:text-slate-950";

const mobileMenuItemActiveClass = "site-mobile-menu-item-active bg-slate-950 text-white shadow-[0_10px_22px_rgba(15,23,42,0.12)]";

const desktopThemeToggleClass =
  "theme-toggle-button desktop-nav-link inline-flex min-h-[2.8rem] shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2 text-[0.88rem] font-medium tracking-normal text-slate-600 transition-[background-color,color,box-shadow,transform] duration-150 lg:px-5 lg:text-[0.91rem]";

const mobileThemeToggleClass =
  "theme-toggle-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-white/80 transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5";

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type MotionButtonProps = ComponentProps<typeof motion.button>;

function ThemeToggleButton({
  compact = false,
  onToggle,
  hoverMotion,
  tapMotion,
}: {
  compact?: boolean;
  onToggle: () => void;
  hoverMotion: MotionButtonProps["whileHover"];
  tapMotion: MotionButtonProps["whileTap"];
}) {
  return (
    <motion.button
      type="button"
      whileHover={hoverMotion}
      whileTap={tapMotion}
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className={compact ? mobileThemeToggleClass : `${desktopThemeToggleClass} ${desktopMenuItemIdleClass}`}
    >
      <span
        aria-hidden="true"
        className="theme-toggle-track relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-slate-200 p-0.5 transition-colors duration-300"
      >
        <span className="theme-toggle-dot h-4 w-4 translate-x-0 rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.18)] transition-transform duration-300" />
      </span>
      {compact ? null : <span>Theme</span>}
    </motion.button>
  );
}

export default function Navbar({ siteSettings }: NavbarProps) {
  const { isAuthenticated, logout, role } = useAuth();
  const pathname = usePathname();
  const [mobileMenuState, setMobileMenuState] = useState(() => ({
    isOpen: false,
    pathname,
  }));
  const { allowHoverMotion, allowRichMotion } = useAdaptiveMotion();
  const logoSrc = useMemo(() => resolveLogoSrc(siteSettings.logoUrl), [siteSettings.logoUrl]);
  const isMobileMenuOpen = mobileMenuState.isOpen && mobileMenuState.pathname === pathname;

  const actionLinks = useMemo<InlineLink[]>(() => {
    if (isAuthenticated) {
      return [
        {
          href: role === "admin" ? "/admin/dashboard" : "/student/dashboard",
          label: role === "admin" ? "Admin" : "Student",
        },
      ];
    }

    return [{ href: "/login", label: "Login" }];
  }, [isAuthenticated, role]);

  const inlineLinks = useMemo(() => [...navLinks, ...actionLinks], [actionLinks]);

  const isActiveNavLink = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    if (href.startsWith("/#") || href.includes("?")) {
      return false;
    }

    return pathname === href;
  };

  const hoverMotion = allowHoverMotion
    ? {
        y: 0,
        scale: 1,
        transition: {
          duration: allowRichMotion ? 0.3 : 0.24,
          ease: motionEase,
        },
      }
    : undefined;

  const tapMotion = allowHoverMotion
    ? {
        scale: 0.999,
        transition: {
          duration: 0.18,
          ease: motionEase,
        },
      }
    : { scale: 0.998 };

  const navTransition = allowRichMotion
    ? { duration: 0.34, ease: motionEase }
    : { duration: 0.24, ease: motionEase };

  const closeMobileMenu = () => {
    setMobileMenuState((current) => {
      if (!current.isOpen && current.pathname === pathname) {
        return current;
      }

      return {
        isOpen: false,
        pathname,
      };
    });
  };

  const toggleTheme = () => {
    const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(themeStorageKey, nextTheme);
    } catch {
      // Theme still applies for the current page even if storage is blocked.
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuState((current) => {
      const isOpenForPath = current.isOpen && current.pathname === pathname;

      return {
        isOpen: !isOpenForPath,
        pathname,
      };
    });
  };

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuState((current) => {
          if (!current.isOpen && current.pathname === pathname) {
            return current;
          }

          return {
            isOpen: false,
            pathname,
          };
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobileMenuOpen, pathname]);

  return (
    <motion.header
      initial={false}
      className="fixed inset-x-0 top-0 z-50 w-full px-3 pt-3 sm:px-4"
    >
      <div className="site-nav-shell mx-auto w-full max-w-[96rem] rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,246,241,0.72))] shadow-[0_18px_38px_rgba(15,23,42,0.05)] backdrop-blur-[26px]">
        <div className="navbar-desktop-shell hidden min-h-[4.3rem] items-center gap-4 px-4 py-2.5 md:flex lg:px-6 xl:gap-5 xl:px-5">
          <Link href="/" className="navbar-desktop-brand flex min-w-0 shrink-0 items-center justify-start gap-3.5">
            <motion.div
              whileHover={hoverMotion}
              whileTap={tapMotion}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] bg-white/94 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
            >
              <Image src={logoSrc} alt={siteSettings.siteName} width={40} height={40} priority className="block h-10 w-10 object-contain" />
            </motion.div>

            <span className="truncate text-[1.22rem] font-semibold tracking-[-0.035em] text-slate-950 lg:text-[1.32rem]">
              {siteSettings.siteName}
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="navbar-desktop-nav desktop-nav-row min-w-0 flex-1 overflow-hidden xl:ml-auto xl:flex-none">
            <div className={desktopMenuShellClass}>
              {inlineLinks.map((link) => (
                <motion.div key={link.href} whileHover={hoverMotion} whileTap={tapMotion} className="shrink-0">
                  <Link
                    href={link.href}
                    className={`${desktopMenuItemClass} ${
                      isActiveNavLink(link.href) ? desktopMenuItemActiveClass : desktopMenuItemIdleClass
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <ThemeToggleButton onToggle={toggleTheme} hoverMotion={hoverMotion} tapMotion={tapMotion} />

              {isAuthenticated ? (
                <motion.button
                  type="button"
                  whileHover={hoverMotion}
                  whileTap={tapMotion}
                  onClick={() => void logout()}
                  className={`${desktopMenuItemClass} ${desktopMenuItemIdleClass}`}
                >
                  Logout
                </motion.button>
              ) : null}
            </div>
          </nav>
        </div>

        <div className="navbar-mobile-shell px-3 pb-3 pt-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" onClick={closeMobileMenu} className="flex min-w-0 flex-1 items-center gap-3">
              <motion.div
                whileHover={hoverMotion}
                whileTap={tapMotion}
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] bg-white/94 shadow-[0_8px_16px_rgba(15,23,42,0.04)]"
              >
                <Image src={logoSrc} alt={siteSettings.siteName} width={40} height={40} priority className="block h-10 w-10 object-contain" />
              </motion.div>

              <span className="truncate text-[1.08rem] font-semibold tracking-[-0.03em] text-slate-950">
                {siteSettings.siteName}
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggleButton compact onToggle={toggleTheme} hoverMotion={hoverMotion} tapMotion={tapMotion} />
              <motion.button
                type="button"
                whileHover={hoverMotion}
                whileTap={tapMotion}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation-panel"
                aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={toggleMobileMenu}
                className={mobileMenuToggleClass}
              >
                <span className="site-mobile-menu-toggle-bg absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))]" aria-hidden="true" />
                <span className="relative block h-[0.875rem] w-[1.125rem]">
                  <span
                    className={`absolute left-0 top-[3px] h-[1.5px] w-[1.125rem] rounded-full bg-current transition-all duration-300 ease-out ${
                      isMobileMenuOpen ? "top-[6px] rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-[10px] h-[1.5px] w-[1.125rem] rounded-full bg-current transition-all duration-300 ease-out ${
                      isMobileMenuOpen ? "top-[6px] -rotate-45" : ""
                    }`}
                  />
                </span>
              </motion.button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isMobileMenuOpen ? (
              <motion.nav
                id="mobile-navigation-panel"
                aria-label="Mobile navigation"
                initial={{ height: 0, opacity: 0, y: -6, scale: 0.98 }}
                animate={{ height: "auto", opacity: 1, y: 0, scale: 1 }}
                exit={{ height: 0, opacity: 0, y: -6, scale: 0.98 }}
                transition={navTransition}
                className="overflow-hidden pt-3"
              >
                <div className={mobileMenuPanelClass}>
                  <div className="flex flex-col gap-1.5">
                    {inlineLinks.map((link) => (
                      <motion.div key={link.href} whileHover={hoverMotion} whileTap={tapMotion}>
                        <Link
                          href={link.href}
                          onClick={closeMobileMenu}
                          className={`${mobileMenuItemClass} ${
                            isActiveNavLink(link.href) ? mobileMenuItemActiveClass : mobileMenuItemIdleClass
                          }`}
                        >
                          <span>{link.label}</span>
                          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-current text-[0] opacity-25">
                            &gt;
                          </span>
                        </Link>
                      </motion.div>
                    ))}

                    {isAuthenticated ? (
                      <motion.button
                        type="button"
                        whileHover={hoverMotion}
                        whileTap={tapMotion}
                        onClick={() => {
                          closeMobileMenu();
                          void logout();
                        }}
                        className={`${mobileMenuItemClass} ${mobileMenuItemIdleClass}`}
                      >
                        <span>Logout</span>
                        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-current text-[0] opacity-25">
                          &gt;
                        </span>
                      </motion.button>
                    ) : null}
                  </div>
                </div>
              </motion.nav>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
