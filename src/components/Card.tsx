"use client";
import React from "react";
import { motion } from "framer-motion";
import { hoverLift } from "../lib/motion";

export default function Card({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: string }) {
  return (
    <motion.article
      whileHover={hoverLift}
      className="mobile-card group flex h-full flex-col rounded-2xl bg-white p-6 shadow-md transition duration-200 hover:shadow-xl"
    >
      <h3 className="mobile-card-title mb-3 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
      {subtitle && <p className="mobile-card-copy mb-5 text-base leading-relaxed text-slate-600">{subtitle}</p>}
      {cta && (
        <div className="mt-auto pt-3">
          <a className="card-cta-link inline-flex items-center text-sm font-semibold text-slate-900 transition group-hover:text-slate-700">{cta}</a>
        </div>
      )}
    </motion.article>
  );
}
