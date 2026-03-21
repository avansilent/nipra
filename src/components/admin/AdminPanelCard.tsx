"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type AdminPanelCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function AdminPanelCard({ title, description, action, children }: AdminPanelCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4 }}
      className="admin-mobile-panel relative overflow-hidden rounded-[34px] bg-white/92 p-6 shadow-[0_28px_72px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-7"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/85" />
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(226,232,240,0.8),transparent_70%)] blur-3xl" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}