"use client";
import React from "react";
import { motion } from "framer-motion";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import { balancedItemReveal, hoverLift, itemReveal, viewportOnce } from "../lib/motion";

type Props = {
  title: string;
  duration?: string;
  tag?: string;
  image?: string;
  popular?: boolean;
  levels?: string[];
  titleClassName?: string;
};

export default function CourseCard({
  title,
  duration,
  tag = "Path",
  image,
  popular = false,
  levels,
  titleClassName,
}: Props) {
  const hours = duration ?? "Self-paced";
  const { allowHoverMotion, allowRichMotion } = useAdaptiveMotion();

  return (
    <motion.article
      variants={allowRichMotion ? itemReveal : balancedItemReveal}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      whileHover={allowHoverMotion ? hoverLift : undefined}
      className="mobile-course-card group relative min-h-[260px] cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md transition duration-200 hover:shadow-xl"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="mobile-course-card-cover flex h-full w-full flex-col items-start justify-end bg-gradient-to-br from-slate-100 via-white to-stone-50 p-6 text-left">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
              {tag}
            </span>
            <p className="mobile-course-card-copy mt-3 max-w-[12rem] text-base font-semibold leading-relaxed text-slate-800">
              Structured learning paths built for momentum and clarity.
            </p>
          </div>
        )}
        {popular && (
          <span className="popular-badge absolute left-4 top-4">Popular</span>
        )}
      </div>

      <div className="mobile-course-card-body flex flex-col gap-4 bg-white px-6 py-6">
        <h3 className={`mobile-course-card-title ${titleClassName ?? "text-xl"} font-semibold leading-tight tracking-tight text-slate-900`}>{title}</h3>

        <p className="mobile-course-card-copy text-base leading-relaxed text-slate-600">{duration ?? "Certification • Self-paced"}</p>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="rounded-full bg-slate-50 px-3 py-1">Certification</span>
          <span className="rounded-full bg-slate-50 px-3 py-1">{hours}</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{tag}</span>
          <a className="text-sm font-semibold text-slate-900 transition hover:text-slate-700" href="#">Explore course</a>
        </div>
      </div>
    </motion.article>
  );
}
