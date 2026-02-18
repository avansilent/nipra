"use client";
import Link from "next/link";

export default function QuestionPapers() {
  return (
    <section className="w-full max-w-6xl mx-auto py-16 px-6 text-center">
      <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-[#0f172a] tracking-tight">Question Papers</h1>
      <p className="text-base md:text-lg text-[#475569] max-w-2xl mx-auto mb-8">
        Access previous year question papers and solutions to prepare effectively for your exams.
      </p>
      <Link href="/question-papers" className="btn px-6 py-3 rounded-xl">Browse Papers</Link>
    </section>
  );
}
