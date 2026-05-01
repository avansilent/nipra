"use client";

import Image from "next/image";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
  "flex w-full flex-wrap items-center justify-center gap-1 rounded-[1.35rem] bg-white/78 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_14px_30px_rgba(15,23,42,0.04)] backdrop-blur-[24px] xl:w-auto xl:flex-nowrap xl:justify-start xl:rounded-full";

const desktopMenuItemClass =
  "inline-flex min-h-[2.62rem] items-center justify-center rounded-full px-4 py-2 text-[0.87rem] font-medium tracking-normal text-slate-600 transition-[background-color,color,box-shadow,transform] duration-150 lg:px-5 lg:text-[0.91rem]";

const desktopMenuItemIdleClass =
  "hover:bg-white/96 hover:text-slate-950 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]";

const desktopMenuItemActiveClass = "bg-white text-slate-950 shadow-[0_10px_20px_rgba(15,23,42,0.05)]";

const mobileMenuShellClass =
  "mobile-nav-inline-row flex flex-wrap items-stretch justify-center gap-1.5 rounded-[1.35rem] bg-white/78 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_24px_rgba(15,23,42,0.04)] backdrop-blur-[20px]";

const mobileMenuItemWrapClass = "min-w-0 grow basis-[9.5rem] sm:basis-auto sm:grow-0 sm:shrink-0";

const mobileMenuItemClass =
  "inline-flex w-full min-h-[2.3rem] items-center justify-center rounded-full px-3 py-2 text-center text-[0.78rem] font-medium leading-tight tracking-normal text-slate-600 transition-[background-color,color,box-shadow,transform] duration-150 whitespace-normal sm:w-auto sm:min-h-[2.45rem] sm:px-3.5 sm:text-[0.8rem] sm:leading-normal sm:whitespace-nowrap";

const mobileMenuItemIdleClass =
  "hover:bg-white/96 hover:text-slate-950 hover:shadow-[0_8px_16px_rgba(15,23,42,0.04)]";

const mobileMenuItemActiveClass = "bg-white text-slate-950 shadow-[0_8px_16px_rgba(15,23,42,0.05)]";

export default function Navbar({ siteSettings }: NavbarProps) {
  const { isAuthenticated, logout, role } = useAuth();
  const pathname = usePathname();
  const { allowEntranceMotion, allowHoverMotion, allowRichMotion } = useAdaptiveMotion();
  const logoSrc = useMemo(() => resolveLogoSrc(siteSettings.logoUrl), [siteSettings.logoUrl]);

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

  return (
    <motion.header
      initial={allowEntranceMotion ? { y: -8, opacity: 0 } : false}
      animate={allowEntranceMotion ? { y: 0, opacity: 1 } : undefined}
      transition={allowEntranceMotion ? navTransition : undefined}
      className="fixed inset-x-0 top-0 z-50 w-full px-3 pt-3 sm:px-4"
    >
      <div className="mx-auto w-full max-w-[96rem] rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,246,241,0.72))] shadow-[0_18px_38px_rgba(15,23,42,0.05)] backdrop-blur-[26px]">
        <div className="hidden min-h-[4.3rem] gap-3 px-4 py-3 md:flex md:flex-col md:items-stretch xl:flex-row xl:items-center xl:gap-5 xl:px-5 xl:py-2.5 lg:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center justify-center gap-3.5 xl:justify-start">
            <motion.div
              whileHover={hoverMotion}
              whileTap={tapMotion}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] bg-white/94 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
            >
              <Image src={logoSrc} alt={siteSettings.siteName} width={40} height={40} className="block h-10 w-10 object-contain" />
            </motion.div>

            <span className="truncate text-[1.22rem] font-semibold tracking-[-0.035em] text-slate-950 lg:text-[1.32rem]">
              {siteSettings.siteName}
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="w-full min-w-0 xl:ml-auto xl:w-auto">
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

        <div className="px-3 pb-3 pt-3 md:hidden">
          <div className="flex items-center gap-3 pb-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <motion.div
                whileHover={hoverMotion}
                whileTap={tapMotion}
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] bg-white/94 shadow-[0_8px_16px_rgba(15,23,42,0.04)]"
              >
                <Image src={logoSrc} alt={siteSettings.siteName} width={40} height={40} className="block h-10 w-10 object-contain" />
              </motion.div>

              <span className="truncate text-[1.08rem] font-semibold tracking-[-0.03em] text-slate-950">
                {siteSettings.siteName}
              </span>
            </Link>
          </div>

          <nav aria-label="Mobile navigation">
            <div className={mobileMenuShellClass}>
              {inlineLinks.map((link) => (
                <motion.div key={link.href} whileHover={hoverMotion} whileTap={tapMotion} className={mobileMenuItemWrapClass}>
                  <Link
                    href={link.href}
                    className={`${mobileMenuItemClass} ${
                      isActiveNavLink(link.href) ? mobileMenuItemActiveClass : mobileMenuItemIdleClass
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              {isAuthenticated ? (
                <motion.button
                  type="button"
                  whileHover={hoverMotion}
                  whileTap={tapMotion}
                  onClick={() => void logout()}
                  className={`${mobileMenuItemWrapClass} ${mobileMenuItemClass} ${mobileMenuItemIdleClass}`}
                >
                  Logout
                </motion.button>
              ) : null}
            </div>
          </nav>
        </div>
      </div>
    </motion.header>
  );
}
