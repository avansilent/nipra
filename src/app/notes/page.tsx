"use client";
import Card from "../../components/Card";
import { motion } from "framer-motion";
import { createStaggerContainer, hoverLift, itemReveal, sectionReveal, viewportOnce } from "../../lib/motion";

const notesGrid = createStaggerContainer(0.12, 0.05);
const noteHighlights = ["Compact summaries", "Chapter-wise revision", "Exam-focused PDFs"];

const sampleNotes = [
  { title: "Calculus — Quick Summary", subtitle: "12 pages • PDF" },
  { title: "Mechanics — Formula Sheet", subtitle: "6 pages • PDF" },
  { title: "Organic Chemistry — Reactions", subtitle: "18 pages • PDF" },
  { title: "Cell Biology — Diagrams", subtitle: "10 pages • PDF" },
];

export default function Notes() {
  return (
    <section className="relative overflow-hidden bg-gray-50 px-6 py-24">
      <div className="pointer-events-none absolute left-0 top-16 h-60 w-60 rounded-full bg-slate-200/55 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-100/45 blur-3xl" />
      <div className="mx-auto max-w-6xl space-y-10">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionReveal}
          whileHover={hoverLift}
          className="rounded-[32px] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(245,248,250,0.95))] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] ring-1 ring-white/80 md:p-12"
        >
          <motion.div initial="hidden" whileInView="show" viewport={viewportOnce} variants={notesGrid} className="max-w-2xl space-y-4">
            <motion.span variants={itemReveal} className="inline-flex items-center rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
              Revision Library
            </motion.span>
            <motion.h1 variants={itemReveal} className="text-3xl font-bold text-gray-900 md:text-4xl">Notes</motion.h1>
            <motion.p variants={itemReveal} className="text-base leading-relaxed text-gray-600 md:text-lg">Concise, well-structured notes for fast revision.</motion.p>
            <motion.div variants={itemReveal} className="flex flex-wrap gap-3 pt-1">
              {noteHighlights.map((item) => (
                <motion.span key={item} whileHover={hoverLift} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_12px_26px_rgba(15,23,42,0.07)]">
                  {item}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={notesGrid}
          className="grid grid-cols-1 gap-8 md:grid-cols-2"
        >
        {sampleNotes.map((n) => (
          <Card key={n.title} title={n.title} subtitle={n.subtitle} cta="Download" />
        ))}
        </motion.div>
      </div>
    </section>
  );
}
