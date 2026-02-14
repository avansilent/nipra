"use client";
import Link from "next/link";
import Card from "../../components/Card";

const sampleCourses = [
  { title: "Mathematics — Foundation to Advanced", subtitle: "40 lessons • 12 hours" },
  { title: "Physics — Concepts & Problems", subtitle: "32 lessons • 10 hours" },
  { title: "Chemistry — Theory & Practice", subtitle: "28 lessons • 9 hours" },
  { title: "Biology — Everything You Need", subtitle: "24 lessons • 8 hours" },
];

export default function Courses() {
  return (
    <section className="w-full max-w-6xl mx-auto py-20 px-6 md:px-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-poppins">Courses</h1>
          <p className="text-sm md:text-base text-[#64748b]">Curated courses designed by experts and updated regularly.</p>
        </div>
        <Link href="/courses" className="btn px-4 py-2 rounded-xl">All Courses</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {sampleCourses.map((c) => (
          <Card key={c.title} title={c.title} subtitle={c.subtitle} cta="View Course" />
        ))}
      </div>
    </section>
  );
}
