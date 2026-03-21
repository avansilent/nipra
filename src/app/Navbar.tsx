"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "./AuthProvider";
import type { SiteSettings } from "../types/site";
import { buttonHover, motionEase, tapPress } from "../lib/motion";

const navLinks = [
  { href: "/", label: "Home" },
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

  return (
    <motion.nav
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: motionEase }}
      className="w-full fixed top-0 left-0 z-50"
    >
      <div className="glass-bar">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-10 px-6 py-5 sm:px-8 lg:gap-16 lg:px-10 lg:py-6">
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

          <div className="flex min-w-0 flex-1 items-center justify-end gap-5 lg:gap-8">
            <div className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto whitespace-nowrap px-4 sm:px-8 lg:px-12">
              <div className="flex items-center gap-5 rounded-full bg-white/60 px-2 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:gap-6 sm:px-3 lg:gap-8 lg:px-4">
              {navLinks.map((link) => (
                <motion.div
                  key={link.href}
                  whileHover={buttonHover}
                  whileTap={tapPress}
                  className="nav-center-link shrink-0"
                >
                  <Link href={link.href} className="nav-link-pill px-3 py-2.5 text-sm font-medium tracking-[0.02em] text-slate-700 hover:text-slate-900 sm:px-4 lg:px-5">
                    <span className="nav-text">{link.label}</span>
                  </Link>
                </motion.div>
              ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 lg:gap-5">
              <Link href="/#contact" className="inline-flex shrink-0">
                <motion.div
                  whileHover={buttonHover}
                  whileTap={tapPress}
                  className="nav-action nav-login-admin flex items-center rounded-lg px-4 py-2 text-sm font-medium"
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
                        className="nav-action nav-login-admin flex items-center rounded-lg px-4 py-2 text-sm font-medium"
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
                        className="nav-action nav-login-student flex items-center rounded-lg px-4 py-2 text-sm font-medium"
                      >
                        Dashboard
                      </motion.div>
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="nav-action nav-logout-action flex items-center rounded-lg px-4 py-2 text-sm font-medium smooth-hover"
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
                      className="nav-action nav-login-student flex items-center rounded-lg px-4 py-2 text-sm font-medium"
                    >
                      Student Login
                    </motion.div>
                  </Link>
                  <Link href="/login?type=admin" className="inline-flex shrink-0">
                    <motion.div
                      whileHover={buttonHover}
                      whileTap={tapPress}
                      className="nav-action nav-login-admin flex items-center rounded-lg px-4 py-2 text-sm font-medium"
                    >
                      Admin Login
                    </motion.div>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

