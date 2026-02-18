"use client";
import Link from "next/link";

export default function TestSeries() {
  return (
    <section className="w-full max-w-6xl mx-auto py-16 px-6 text-center">
      <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-[#0f172a] tracking-tight">Test Series</h1>
      <p className="text-base md:text-lg text-[#475569] max-w-2xl mx-auto mb-8">
        Practice with real exam-style test series to boost your confidence and performance. Track your progress and improve.
      </p>
      <Link href="/test-series" className="btn px-6 py-3 rounded-xl">View Test Series</Link>
    </section>
  );
}
