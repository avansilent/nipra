"use client";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col text-[#1a202c] font-sans w-full">
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <section className="w-full flex flex-col items-center justify-center text-center pt-24 pb-16 px-4 md:px-0">
          <h1 className="text-4xl md:text-6xl font-extrabold font-poppins mb-6 text-[#1a202c] tracking-tight">
            Dashboard
          </h1>
          <p className="text-lg md:text-xl font-inter font-light mb-10 max-w-2xl text-[#374151]">
            Welcome to your dashboard. Track your progress, manage your courses, and access all your resources in one place.
          </p>
          <button className="btn font-inter px-8 py-3 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#38b2ac] text-white font-semibold shadow hover:from-[#2563eb] hover:to-[#38b2ac] transition-all duration-200">
            Go to Courses
          </button>
        </section>
      </main>
    </div>
  );
}
