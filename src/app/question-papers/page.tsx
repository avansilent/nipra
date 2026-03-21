"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { buttonHover, createStaggerContainer, hoverLift, itemReveal, sectionReveal, tapPress, viewportOnce } from "../../lib/motion";

const sectionItems = createStaggerContainer(0.1, 0.04);
const paperHighlights = ["Previous years", "Pattern familiarization", "Targeted revision"];

export default function QuestionPapers() {
  return (
    <section className="mobile-public-shell relative overflow-hidden bg-gray-50 px-6 py-24">
      <div className="pointer-events-none absolute left-0 top-16 h-60 w-60 rounded-full bg-slate-200/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-stone-200/50 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionReveal}
          whileHover={hoverLift}
          className="mobile-public-card rounded-[32px] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(245,247,250,0.95))] p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.12)] ring-1 ring-white/80 md:p-12"
        >
          <div className="mx-auto max-w-2xl space-y-4">
            <motion.div initial="hidden" whileInView="show" viewport={viewportOnce} variants={sectionItems}>
              <motion.span variants={itemReveal} className="inline-flex items-center rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                Exam Archive
              </motion.span>
              <motion.h1 variants={itemReveal} className="mobile-public-title text-3xl font-bold text-gray-900 md:text-4xl">Question Papers</motion.h1>
              <motion.p variants={itemReveal} className="text-base leading-relaxed text-gray-600 md:text-lg">
                Access previous year question papers and solutions to prepare effectively for your exams.
              </motion.p>
              <motion.div variants={itemReveal} className="flex flex-wrap items-center justify-center gap-3 pb-2 pt-1">
                {paperHighlights.map((item) => (
                  <motion.span key={item} whileHover={hoverLift} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_12px_26px_rgba(15,23,42,0.07)]">
                    {item}
                  </motion.span>
                ))}
              </motion.div>
              <motion.div variants={itemReveal} whileHover={buttonHover} whileTap={tapPress} className="inline-flex">
                <Link href="/question-papers" className="mobile-public-cta btn rounded-xl px-6 py-3">Browse Papers</Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
