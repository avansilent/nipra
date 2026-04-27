"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAdaptiveMotion } from "../../hooks/useAdaptiveMotion";
import { balancedItemReveal, balancedSectionReveal, buttonHover, createStaggerContainer, hoverLift, itemReveal, sectionReveal, tapPress, viewportOnce } from "../../lib/motion";

const dashboardItems = createStaggerContainer(0.1, 0.04);

const dashboardHighlights = [
  { label: "Courses", value: "Guided paths" },
  { label: "Notes", value: "Fast revision" },
  { label: "Progress", value: "Daily clarity" },
];

export default function Dashboard() {
  const { allowHoverMotion, allowRichMotion } = useAdaptiveMotion();
  const sectionVariants = allowRichMotion ? sectionReveal : balancedSectionReveal;
  const itemVariants = allowRichMotion ? itemReveal : balancedItemReveal;
  const hoverMotion = allowHoverMotion ? hoverLift : undefined;
  const buttonMotion = allowHoverMotion ? buttonHover : undefined;

  return (
    <section className="mobile-public-shell public-utility-shell relative overflow-hidden px-6 py-24">
      <div className="pointer-events-none absolute left-0 top-10 h-64 w-64 rounded-full bg-slate-200/52 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-stone-200/46 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionVariants}
          whileHover={hoverMotion}
          className="mobile-public-card public-utility-card relative overflow-hidden rounded-[2rem] p-8 text-center md:p-12"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_70%)]" />
          <motion.div variants={dashboardItems} initial="hidden" whileInView="show" viewport={viewportOnce} className="mx-auto max-w-3xl space-y-5">
            <motion.span variants={itemVariants} className="public-utility-kicker">
              Student Workspace
            </motion.span>
            <motion.h1 variants={itemVariants} className="mobile-public-title text-4xl font-semibold tracking-[-0.05em] text-slate-950 md:text-5xl">
              Everything important stays in one calm dashboard
            </motion.h1>
            <motion.p variants={itemVariants} className="public-utility-copy text-base leading-relaxed md:text-lg">
              Track your courses, keep revision materials close, and move through your academic routine with more focus and less clutter.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-3">
              {dashboardHighlights.map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={hoverMotion}
                  className="public-soft-card px-4 py-3 text-left"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                </motion.div>
              ))}
            </motion.div>
            <motion.div variants={itemVariants} className="mobile-public-actions flex flex-wrap items-center justify-center gap-4 pt-2">
              <motion.div whileHover={buttonMotion} whileTap={tapPress} className="inline-flex">
                <Link href="/courses" className="mobile-public-cta btn rounded-full px-6 py-3">
                  Go to Courses
                </Link>
              </motion.div>
              <motion.div whileHover={buttonMotion} whileTap={tapPress} className="inline-flex">
                <Link href="/student/dashboard" className="public-utility-secondary-action mobile-public-cta rounded-full px-6 py-3 text-sm font-semibold">
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
