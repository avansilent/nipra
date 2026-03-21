"use client";

import { motion } from "framer-motion";

type AdminTab = "dashboard" | "students" | "courses" | "content" | "settings";

type AdminSidebarProps = {
  activeTab: AdminTab;
  onSelect: (tab: AdminTab) => void;
  siteName: string;
};

const navItems: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: "dashboard", label: "Dashboard", description: "Overview and quick actions" },
  { id: "students", label: "Students", description: "Manage learners and credentials" },
  { id: "courses", label: "Courses", description: "Course catalog and assignments" },
  { id: "content", label: "Content", description: "Hero, FAQs, testimonials, labels" },
  { id: "settings", label: "Settings", description: "Branding, logo, and contact info" },
];

export default function AdminSidebar({ activeTab, onSelect, siteName }: AdminSidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -18 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-[32px] bg-white/92 p-5 shadow-[0_26px_64px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/85" />
      <div className="pointer-events-none absolute -left-6 top-20 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(226,232,240,0.75),transparent_70%)] blur-2xl" />
      <div className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)]">
        {siteName}
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Admin Navigation</p>
      </div>
      <nav className="mt-4 grid gap-2">
        {navItems.map((item) => {
          const isActive = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`rounded-[24px] px-4 py-3 text-left transition duration-200 ${
                isActive
                  ? "bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(51,65,85,0.94))] text-white shadow-[0_22px_46px_rgba(15,23,42,0.18)]"
                  : "bg-slate-50/90 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)]"
              }`}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className={`mt-1 text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{item.description}</div>
            </button>
          );
        })}
      </nav>
    </motion.aside>
  );
}