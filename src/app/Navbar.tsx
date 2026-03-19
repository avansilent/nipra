"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAuth } from "./AuthProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/books", label: "Books" },
  { href: "/question-papers", label: "Question Papers" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <motion.nav
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 0.95, 0.28, 1] }}
      className="w-full fixed top-0 left-0 z-50"
    >
      <div className="glass-bar border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0 pr-2">
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.995 }}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 overflow-hidden"
            >
              <Image
                src="/logo.png"
                alt="Nipracademy"
                width={36}
                height={36}
                priority
                className="w-full h-full object-contain"
              />
            </motion.div>
            <span className="inline-flex items-center rounded-[999px] border border-white/25 bg-white/18 px-5.5 py-2.5 text-[2.05rem] sm:text-[2.6rem] font-black leading-[1.05] tracking-[-0.09em] text-[#0f172a] shadow-[0_18px_40px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl transition-all duration-500 ease-out hover:-translate-y-0.5 hover:scale-[1.04] hover:bg-white/26 hover:shadow-[0_24px_54px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.82)]">
              Nipracademy
            </span>
          </Link>

          <div className="flex items-center flex-wrap gap-1.5 flex-1 justify-start">
            {navLinks.map((link) => (
              <motion.div
                key={link.href}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                className="nav-center-link"
              >
                <Link href={link.href} className="nav-link-pill px-3 py-1.5 text-xs sm:text-sm font-semibold">
                  <span className="nav-text">{link.label}</span>
                </Link>
              </motion.div>
            ))}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={logout}
                className="nav-action nav-logout-action items-center px-3.5 py-1.5 rounded-[14px] font-semibold text-xs sm:text-sm flex smooth-hover"
              >
                Logout
              </button>
            ) : (
              <>
                <Link href="/login?type=student" className="inline-flex">
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.985 }}
                    className="nav-action nav-login-student items-center px-3.5 py-1.5 rounded-[14px] font-semibold text-xs sm:text-sm flex"
                  >
                    Student Login
                  </motion.div>
                </Link>
                <Link href="/login?type=admin" className="inline-flex">
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.985 }}
                    className="nav-action nav-login-admin items-center px-3.5 py-1.5 rounded-[14px] font-semibold text-xs sm:text-sm flex"
                  >
                    Admin Login
                  </motion.div>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

