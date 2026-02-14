"use client";
import Link from "next/link";
import { motion } from "framer-motion";

const items = [
  { href: "/courses", label: "Courses" },
  { href: "/notes", label: "Notes" },
  { href: "/test-series", label: "Tests" },
  { href: "/question-papers", label: "Papers" },
];

export default function QuickLinks() {
  return (
    <div className="w-full max-w-4xl mx-auto px-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {items.map((item) => (
          <motion.div
            key={item.href}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              href={item.href} 
              className="px-4 py-1.5 rounded-full bg-white/85 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all text-[11px] md:text-xs font-medium tracking-[0.12em] uppercase text-slate-600"
            >
              {item.label}
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
