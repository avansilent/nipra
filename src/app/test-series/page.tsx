"use client";
import Link from "next/link";

export default function TestSeries() {
  return (
    <section className="w-full flex flex-col items-center justify-center text-center py-20">
      <h1 className="text-4xl md:text-5xl font-extrabold font-poppins mb-4">Test Series</h1>
      <p className="text-base md:text-lg text-[#475569] max-w-2xl mb-6">
        Practice with real exam-style test series to boost your confidence and performance. Track your progress and improve.
      </p>
      <Link href="/test-series" className="btn px-6 py-3 rounded-xl">View Test Series</Link>
    </section>
  );
}
