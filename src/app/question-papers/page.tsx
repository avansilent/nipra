"use client";
import Link from "next/link";

export default function QuestionPapers() {
  return (
    <section className="w-full flex flex-col items-center justify-center text-center py-20">
      <h1 className="text-4xl md:text-5xl font-extrabold font-poppins mb-4">Question Papers</h1>
      <p className="text-base md:text-lg text-[#475569] max-w-2xl mb-6">
        Access previous year question papers and solutions to prepare effectively for your exams.
      </p>
      <Link href="/question-papers" className="btn px-6 py-3 rounded-xl">Browse Papers</Link>
    </section>
  );
}
