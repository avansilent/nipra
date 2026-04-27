"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAdaptiveMotion } from "../../hooks/useAdaptiveMotion";
import { balancedItemReveal, balancedSectionReveal, buttonHover, createStaggerContainer, hoverLift, itemReveal, sectionReveal, tapPress, viewportOnce } from "../../lib/motion";

const sectionItems = createStaggerContainer(0.1, 0.04);
const seriesHighlights = ["Timed practice", "Exam stamina", "Performance focus"];

export default function TestSeries() {
  const { allowHoverMotion, allowRichMotion } = useAdaptiveMotion();
  const sectionVariants = allowRichMotion ? sectionReveal : balancedSectionReveal;
  const itemVariants = allowRichMotion ? itemReveal : balancedItemReveal;
  const hoverMotion = allowHoverMotion ? hoverLift : undefined;
  const buttonMotion = allowHoverMotion ? buttonHover : undefined;

  return (
    <section className="mobile-public-shell public-utility-shell relative overflow-hidden px-6 py-24">
      <div className="pointer-events-none absolute left-0 top-16 h-60 w-60 rounded-full bg-stone-200/48 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-slate-200/52 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionVariants}
          whileHover={hoverMotion}
          className="mobile-public-card public-utility-card rounded-[2rem] p-8 text-center md:p-12"
        >
          <div className="mx-auto max-w-2xl space-y-4">
            <motion.div initial="hidden" whileInView="show" viewport={viewportOnce} variants={sectionItems}>
              <motion.span variants={itemVariants} className="public-utility-kicker">
                Practice Engine
              </motion.span>
              <motion.h1 variants={itemVariants} className="mobile-public-title text-3xl font-semibold tracking-[-0.05em] text-slate-950 md:text-4xl">Test Series</motion.h1>
              <motion.p variants={itemVariants} className="public-utility-copy text-base leading-relaxed md:text-lg">
                Practice with real exam-style test series to boost your confidence and performance. Track your progress and improve.
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-3 pb-2 pt-1">
                {seriesHighlights.map((item) => (
                  <motion.span key={item} whileHover={hoverMotion} className="public-utility-chip">
                    {item}
                  </motion.span>
                ))}
              </motion.div>
              <motion.div variants={itemVariants} whileHover={buttonMotion} whileTap={tapPress} className="inline-flex">
                <Link href="/test-series" className="mobile-public-cta btn rounded-full px-6 py-3">View Test Series</Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
