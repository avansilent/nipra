"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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

const desktopMenuShellClass =
  "navbar-desktop-menu desktop-nav-links flex w-full min-w-max flex-nowrap items-center justify-start gap-3 overflow-x-auto rounded-full bg-white/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_14px_30px_rgba(15,23,42,0.04)] backdrop-blur-[24px] lg:gap-3.5 lg:p-2.5";

const desktopMenuItemClass =
  "desktop-nav-link inline-flex min-h-[2.8rem] shrink-0 items-center justify-center rounded-full px-5 py-2 text-[0.88rem] font-medium tracking-normal text-slate-600 transition-[background-color,color,box-shadow,transform] duration-150 lg:px-6 lg:text-[0.91rem]";

const desktopMenuItemIdleClass =
  "hover:-translate-y-px hover:bg-white hover:text-slate-950 hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]";

const desktopMenuItemActiveClass = "desktop-nav-link-active bg-white text-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.07)]";

const mobileMenuToggleClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] bg-white/88 text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.05)] transition-[background-color,color,box-shadow,transform] duration-150";

const mobileMenuPanelClass =
  "overflow-hidden rounded-[1.45rem] bg-white/84 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_14px_28px_rgba(15,23,42,0.05)] backdrop-blur-[20px]";

const mobileMenuItemClass =
  "inline-flex w-full min-h-[2.9rem] items-center justify-between rounded-[1.05rem] px-4 py-3 text-left text-[0.88rem] font-medium tracking-normal text-slate-600 transition-[background-color,color,box-shadow,transform] duration-150";

const mobileMenuItemIdleClass =
  "hover:bg-white/96 hover:text-slate-950 hover:shadow-[0_8px_16px_rgba(15,23,42,0.04)]";

const mobileMenuItemActiveClass = "bg-white text-slate-950 shadow-[0_8px_16px_rgba(15,23,42,0.05)]";

export default function Navbar({ siteSettings }: NavbarProps) {
  const { isAuthenticated, logout, role } = useAuth();
  const pathname = usePathname();
  const [mobileMenuState, setMobileMenuState] = useState(() => ({
    isOpen: false,
    pathname,
  }));
  const { allowEntranceMotion, allowHoverMotion, allowRichMotion } = useAdaptiveMotion();
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

    return [
      { href: "/login?type=student", label: "Student Login" },
      { href: "/login?type=admin", label: "Admin Login" },
    ];
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
      initial={allowEntranceMotion ? { y: -8, opacity: 0 } : false}
      animate={allowEntranceMotion ? { y: 0, opacity: 1 } : undefined}
      transition={allowEntranceMotion ? navTransition : undefined}
      className="fixed inset-x-0 top-0 z-50 w-full px-3 pt-3 sm:px-4"
    >
      <div className="mx-auto w-full max-w-[96rem] rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,246,241,0.72))] shadow-[0_18px_38px_rgba(15,23,42,0.05)] backdrop-blur-[26px]">
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

              {isAuthenticated ? (
                <motion.button
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
              <span className="relative block h-4 w-5">
                <span
                  className={`absolute left-0 top-0 h-[1.5px] w-5 rounded-full bg-current transition-all duration-200 ${
                    isMobileMenuOpen ? "top-[7px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-[1.5px] w-5 rounded-full bg-current transition-all duration-200 ${
                    isMobileMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 top-[14px] h-[1.5px] w-5 rounded-full bg-current transition-all duration-200 ${
                    isMobileMenuOpen ? "top-[7px] -rotate-45" : ""
                  }`}
                />
              </span>
            </motion.button>
          </div>

          <AnimatePresence initial={false}>
            {isMobileMenuOpen ? (
              <motion.nav
                id="mobile-navigation-panel"
                aria-label="Mobile navigation"
                initial={{ height: 0, opacity: 0, y: -8 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -8 }}
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
                          <span aria-hidden="true" className="text-base leading-none text-slate-300">
                            ›
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
                        <span aria-hidden="true" className="text-base leading-none text-slate-300">
                          ›
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
