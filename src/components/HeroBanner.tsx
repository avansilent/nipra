"use client";
import React from "react";
import Link from "next/link";

export default function HeroBanner() {
  return (
    <section className="w-full">
      <div className="w-full hero-premium text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-16 flex items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-block hero-badge rounded-full px-4 py-1 text-sm font-semibold mb-4">World-class learning programs</div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">Complete Academic Journey</h2>
            <p className="mt-4 text-sm md:text-base max-w-lg text-white/90">From foundation to senior secondary, build concepts, confidence, and competitive readiness with expert-led guidance.</p>

            <div className="mt-6 flex items-center gap-4">
              <Link href="/courses" className="inline-block hero-cta bg-white text-[#034d47] font-semibold rounded-md px-5 py-3 shadow">Explore Programs</Link>
              <Link href="/login" className="inline-block hero-cta text-white/90 border border-white/30 rounded-md px-4 py-2 text-sm">Talk to us</Link>
            </div>
          </div>

          <div className="hidden md:block flex-1 relative">
            <div className="w-full h-44 md:h-52 lg:h-64 rounded-lg overflow-hidden border border-white/15 bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(0,0,0,0.02))]">
              {/* Decorative overlay to mimic the right-side image area */}
              <div className="absolute inset-0 z-10 pointer-events-none" />
              <div className="absolute right-6 bottom-6 w-28 h-28 rounded-full bg-white/6 blur-sm transform rotate-6" />
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {/* simple dots to suggest carousel */}
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className={`w-3 h-3 rounded-full ${i === 1 ? "bg-white" : "bg-white/30"} inline-block`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
