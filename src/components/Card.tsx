"use client";
import React from "react";
import { motion } from "framer-motion";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import { hoverLift } from "../lib/motion";

export default function Card({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: string }) {
  const { allowHoverMotion } = useAdaptiveMotion();

  return (
    <motion.article
      whileHover={allowHoverMotion ? hoverLift : undefined}
      className="mobile-card public-soft-card group flex h-full flex-col p-6 transition duration-200"
    >
      <h3 className="mobile-card-title mb-3 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
      {subtitle && <p className="mobile-card-copy mb-5 text-base leading-relaxed text-slate-600">{subtitle}</p>}
      {cta && (
        <div className="mt-auto pt-3">
          <a className="public-soft-cta inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold">{cta}</a>
        </div>
      )}
    </motion.article>
  );
}
