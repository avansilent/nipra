"use client";
import React from "react";

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
  const palette = {
    Entrance: "from-amber-200 via-amber-100 to-white",
    Foundation: "from-sky-200 via-sky-100 to-white",
    Boards: "from-indigo-200 via-indigo-100 to-white",
    Careers: "from-emerald-200 via-emerald-100 to-white",
    "Govt exams": "from-slate-200 via-slate-100 to-white",
  } as Record<string, string>;

  const coverBg = palette[tag] ?? "from-slate-200 via-slate-100 to-white";
  const hours = duration ?? "Self-paced";

  return (
    <article className="group relative overflow-hidden rounded-[14px] border border-slate-300 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.10)] transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[0_12px_30px_rgba(15,23,42,0.16)] cursor-pointer min-h-[240px]">
      <div className="relative aspect-[3/2] overflow-hidden bg-slate-100 border-b border-slate-200">
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
          <div className={`h-full w-full bg-gradient-to-br ${coverBg}`} />
        )}
        <div className="absolute inset-0 bg-white/10" />
        {popular && (
          <span className="popular-badge absolute left-3 top-3 shadow-[0_6px_16px_rgba(0,0,0,0.12)]">Popular</span>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 bg-white">
        <h3 className={`${titleClassName ?? "text-[18px]"} font-semibold text-slate-900 leading-tight tracking-tight`}>{title}</h3>

        <p className="text-[13px] text-slate-600 leading-relaxed">{duration ?? "Certification  Self-paced"}</p>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#b7510b] mt-1">
          <span className="rounded-full bg-[#fff6ea] px-3 py-1 border border-[#f3d3a7]">Certification</span>
          <span className="rounded-full bg-[#fff6ea] px-3 py-1 border border-[#f3d3a7]">{hours}</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="px-3 py-1 rounded-full bg-[#fff4e6] text-[11px] font-semibold text-[#b7510b] border border-[#f2d3a3]">{tag}</span>
          <a className="text-sm font-semibold text-slate-800 hover:text-slate-900" href="#">Explore course </a>
        </div>
      </div>
    </article>
  );
}
