"use client";

import { motion } from "framer-motion";

type AdminMetricCardProps = {
  label: string;
  value: string | number;
  helper: string;
};

export default function AdminMetricCard({ label, value, helper }: AdminMetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.35 }}
      className="admin-mobile-metric-card relative overflow-hidden rounded-[30px] bg-white/92 px-6 py-6 shadow-[0_24px_56px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.14),transparent_68%)] blur-2xl" />
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{helper}</p>
    </motion.div>
  );
}