"use client";
import React from "react";

export default function Card({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: string }) {
  return (
    <article className="bg-white rounded-2xl shadow-md p-6 border border-[#e6eefb] hover:shadow-xl transition-shadow duration-200">
      <h3 className="text-lg font-semibold font-poppins text-[#0f172a] mb-2">{title}</h3>
      {subtitle && <p className="text-sm text-[#64748b] mb-4">{subtitle}</p>}
      {cta && (
        <div className="mt-3">
          <a className="inline-block text-[#2563eb] font-medium hover:underline">{cta}</a>
        </div>
      )}
    </article>
  );
}
