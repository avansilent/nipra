"use client";

import type { ReactNode } from "react";

type AdminPanelCardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export default function AdminPanelCard({
  title,
  description,
  eyebrow,
  action,
  children,
  className,
  bodyClassName,
}: AdminPanelCardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[30px] border border-stone-200/70 bg-white/96 p-6 shadow-[0_22px_54px_rgba(36,32,28,0.06)] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(214,203,191,0.5),transparent_72%)] blur-3xl" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">{eyebrow}</p> : null}
          <h2 className="mt-2 text-[1.6rem] font-semibold tracking-[-0.04em] text-slate-950">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 lg:pt-1">{action}</div> : null}
      </div>
      <div className={`mt-6 ${bodyClassName ?? ""}`}>{children}</div>
    </section>
  );
}