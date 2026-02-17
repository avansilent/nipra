"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const { isAuthenticated, role, logout } = useAuth();
  const isAdmin = role === "admin";

  return (
    <motion.nav
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 0.95, 0.28, 1] }}
      className="w-full fixed top-0 left-0 z-50"
    >
      <div className="glass-bar border-b border-white/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">
          {/* Brand */}
          <Link href="/" className="flex flex-row items-center gap-3 shrink-0 whitespace-nowrap" style={{ display: 'flex' }}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.995 }} className="flex items-center justify-center" style={{ width: 44, height: 44, minWidth: 44 }}>
              <img src="/logo.png?v=3" alt="Nipra Academy" style={{ width: 40, height: 40, objectFit: 'contain', display: 'block', verticalAlign: 'middle' }} />
            </motion.div>
            <motion.span whileHover={{ x: 2 }} className="font-heading font-bold tracking-tight text-black leading-none" style={{ fontSize: 20, display: 'inline-block', color: '#0b1220', marginLeft: 6, lineHeight: '22px', verticalAlign: 'middle' }}>Nipra Academy</motion.span>
          </Link>

          {/* Navigation - center (always horizontal) */}
          <div className="flex items-center gap-14 ml-12 flex-wrap">
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="nav-center-link px-2 py-1">
              <Link href="/" className="nav-link-pill flex flex-col">
                <span className="nav-text font-medium">Home</span>
                <span className="nav-underline block h-0.5 rounded mt-1"></span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="nav-center-link px-2 py-1">
              <Link href="/courses" className="nav-link-pill flex flex-col">
                <span className="nav-text font-medium">Courses</span>
                <span className="nav-underline block h-0.5 rounded mt-1"></span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="nav-center-link px-2 py-1">
              <Link href="/notes" className="nav-link-pill flex flex-col">
                <span className="nav-text font-medium">Notes</span>
                <span className="nav-underline block h-0.5 rounded mt-1"></span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="nav-center-link px-2 py-1">
              <Link href="/test-series" className="nav-link-pill flex flex-col">
                <span className="nav-text font-medium">Tests</span>
                <span className="nav-underline block h-0.5 rounded mt-1"></span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="nav-center-link px-2 py-1">
              <Link href="/question-papers" className="nav-link-pill flex flex-col">
                <span className="nav-text font-medium">Paper Books</span>
                <span className="nav-underline block h-0.5 rounded mt-1"></span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="nav-center-link px-2 py-1">
              <Link href="/books" className="nav-link-pill flex flex-col">
                <span className="nav-text font-medium">Books</span>
                <span className="nav-underline block h-0.5 rounded mt-1"></span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="nav-center-link px-2 py-1">
              <Link href="/contact" className="nav-link-pill flex flex-col">
                <span className="nav-text font-medium">Contact</span>
                <span className="nav-underline block h-0.5 rounded mt-1"></span>
              </Link>
            </motion.div>
          </div>

          {/* Right utilities */}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/login?type=student" className="inline-flex">
              <motion.div
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                className="nav-action nav-login-student items-center px-4 py-2 rounded-full bg-white text-slate-900 font-semibold shadow-lg flex"
              >
                Student Login
              </motion.div>
            </Link>
            <Link href="/login?type=admin" className="inline-flex">
              <motion.div
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                className="nav-action nav-login-admin items-center px-4 py-2 rounded-full bg-white text-slate-900 font-semibold shadow-lg flex"
              >
                Admin Login
              </motion.div>
            </Link>

            {isAuthenticated && (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center px-3 py-2 rounded-full font-semibold transition nav-action nav-logout-action"
              >
                Log out
              </button>
            )}

            {/* Search icon (keeps UI minimal) */}
            <motion.button aria-label="Search" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center justify-center w-10 h-10 nav-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M21 21l-4.35-4.35" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="11" cy="11" r="5" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

