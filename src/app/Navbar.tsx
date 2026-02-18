"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./AuthProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/notes", label: "Notes" },
  { href: "/test-series", label: "Tests" },
  { href: "/question-papers", label: "Papers" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { isAuthenticated, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardHref = role === "admin" ? "/admin/dashboard" : "/student/dashboard";

  return (
    <motion.nav
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 0.95, 0.28, 1] }}
      className="w-full fixed top-0 left-0 z-50"
    >
      <div className="glass-bar border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.995 }}
              className="flex items-center justify-center w-10 h-10"
            >
              <img
                src="/logo.png?v=3"
                alt="Nipra Academy"
                className="w-9 h-9 object-contain"
              />
            </motion.div>
            <span className="font-bold tracking-tight text-[#0b1220] text-lg leading-tight hidden sm:inline">
              Nipra Academy
            </span>
          </Link>

          {/* Desktop Navigation — centered */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map((link) => (
              <motion.div
                key={link.href}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="nav-center-link"
              >
                <Link href={link.href} className="nav-link-pill flex flex-col px-3 py-1.5">
                  <span className="nav-text font-medium text-sm">{link.label}</span>
                  <span className="nav-underline block h-0.5 rounded mt-0.5" />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <>
                <Link href={dashboardHref} className="hidden sm:inline-flex">
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.985 }}
                    className="nav-action items-center px-4 py-2 rounded-full font-semibold text-sm flex"
                  >
                    Dashboard
                  </motion.div>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center px-3 py-2 rounded-full font-semibold text-sm transition nav-action nav-logout-action"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login?type=student" className="hidden sm:inline-flex">
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.985 }}
                    className="nav-action nav-login-student items-center px-4 py-2 rounded-full font-semibold text-sm flex"
                  >
                    Student Login
                  </motion.div>
                </Link>
                <Link href="/login?type=admin" className="hidden md:inline-flex">
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.985 }}
                    className="nav-action nav-login-admin items-center px-4 py-2 rounded-full font-semibold text-sm flex"
                  >
                    Admin Login
                  </motion.div>
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 nav-action"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round">
                {menuOpen ? (
                  <>
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="6" y1="18" x2="18" y2="6" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden glass-bar border-b border-white/30"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-[#0f172a] hover:bg-white/50 transition"
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <div className="flex gap-2 mt-2 sm:hidden">
                  <Link
                    href="/login?type=student"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-full bg-white font-semibold text-sm shadow-sm"
                  >
                    Student Login
                  </Link>
                  <Link
                    href="/login?type=admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-full bg-indigo-600 text-white font-semibold text-sm shadow-sm"
                  >
                    Admin Login
                  </Link>
                </div>
              )}
              {isAuthenticated && (
                <Link
                  href={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="sm:hidden px-3 py-2.5 rounded-xl text-sm font-medium text-[#0f172a] hover:bg-white/50 transition"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

