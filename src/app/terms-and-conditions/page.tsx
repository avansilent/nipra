import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Nipracademy",
  description: "Terms and Conditions for using Nipracademy services.",
};

async function readTermsHtml() {
  const termsPath = path.join(process.cwd(), "public", "terms html.txt");
  const html = await readFile(termsPath, "utf8");

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<(iframe|object|embed|form|input|button|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|form|input|button|svg|math)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\s(srcdoc|formaction)\s*=\s*(["']).*?\2/gi, "")
    .replace(/javascript:/gi, "");
}

export default async function TermsAndConditionsPage() {
  const termsHtml = await readTermsHtml();

  return (
    <section className="legal-page-shell mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="rounded-[28px] border border-slate-200/70 bg-white/96 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <div
          className="legal-document min-w-0 overflow-hidden"
          dangerouslySetInnerHTML={{ __html: termsHtml }}
        />
      </div>
    </section>
  );
}
