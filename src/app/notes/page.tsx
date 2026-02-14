"use client";
import Card from "../../components/Card";

const sampleNotes = [
  { title: "Calculus — Quick Summary", subtitle: "12 pages • PDF" },
  { title: "Mechanics — Formula Sheet", subtitle: "6 pages • PDF" },
  { title: "Organic Chemistry — Reactions", subtitle: "18 pages • PDF" },
  { title: "Cell Biology — Diagrams", subtitle: "10 pages • PDF" },
];

export default function Notes() {
  return (
    <section className="w-full max-w-6xl mx-auto py-20 px-6 md:px-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-poppins">Notes</h1>
          <p className="text-sm md:text-base text-[#64748b]">Concise, well-structured notes for fast revision.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {sampleNotes.map((n) => (
          <Card key={n.title} title={n.title} subtitle={n.subtitle} cta="Download" />
        ))}
      </div>
    </section>
  );
}
