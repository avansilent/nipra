"use client";
import Link from "next/link";

export default function BooksPage() {
  return (
    <section className="w-full max-w-6xl mx-auto py-16 px-6 text-center">
      <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-[#0f172a] tracking-tight">Books</h1>
      <p className="text-base md:text-lg text-[#475569] max-w-2xl mx-auto mb-8">
        Browse recommended books and study material curated for your classes and exam goals.
      </p>
      <Link href="/courses" className="btn px-6 py-3 rounded-xl">Explore Courses</Link>
    </section>
  );
}
