"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { buttonHover, createStaggerContainer, hoverLift, itemReveal, sectionReveal, tapPress, viewportOnce } from "../../lib/motion";

const dashboardItems = createStaggerContainer(0.1, 0.04);

const dashboardHighlights = [
  { label: "Courses", value: "Guided paths" },
  { label: "Notes", value: "Fast revision" },
  { label: "Progress", value: "Daily clarity" },
];

export default function Dashboard() {
  return (
    <section className="mobile-public-shell relative overflow-hidden bg-gray-50 px-6 py-24">
      <div className="pointer-events-none absolute left-0 top-10 h-64 w-64 rounded-full bg-slate-200/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-stone-200/50 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionReveal}
          whileHover={hoverLift}
          className="mobile-public-card relative overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(244,247,250,0.95))] p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.12)] ring-1 ring-white/80 md:p-12"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_70%)]" />
          <motion.div variants={dashboardItems} initial="hidden" whileInView="show" viewport={viewportOnce} className="mx-auto max-w-3xl space-y-5">
            <motion.span variants={itemReveal} className="inline-flex items-center rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
              Student Workspace
            </motion.span>
            <motion.h1 variants={itemReveal} className="mobile-public-title text-4xl font-bold tracking-[-0.05em] text-gray-900 md:text-5xl">
              Everything important stays in one calm dashboard
            </motion.h1>
            <motion.p variants={itemReveal} className="text-base leading-relaxed text-gray-600 md:text-lg">
              Track your courses, keep revision materials close, and move through your academic routine with more focus and less clutter.
            </motion.p>
            <motion.div variants={itemReveal} className="flex flex-wrap items-center justify-center gap-3">
              {dashboardHighlights.map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={hoverLift}
                  className="rounded-2xl bg-white/90 px-4 py-3 text-left shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                </motion.div>
              ))}
            </motion.div>
            <motion.div variants={itemReveal} className="mobile-public-actions flex flex-wrap items-center justify-center gap-4 pt-2">
              <motion.div whileHover={buttonHover} whileTap={tapPress} className="inline-flex">
                <Link href="/courses" className="mobile-public-cta btn rounded-xl px-6 py-3">
                  Go to Courses
                </Link>
              </motion.div>
              <motion.div whileHover={buttonHover} whileTap={tapPress} className="inline-flex">
                <Link href="/student/dashboard" className="mobile-public-cta rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition hover:bg-slate-50">
                  Open Student Dashboard
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
