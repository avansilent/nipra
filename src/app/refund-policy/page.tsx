import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Nipracademy",
  description: "Refund and cancellation policy for Nipracademy course admissions and online payments.",
};

const refundSections = [
  {
    title: "Admission and course fees",
    body: "Course admission and learning access fees are generally non-refundable after successful payment verification and student portal activation.",
  },
  {
    title: "Duplicate or failed payments",
    body: "If a duplicate payment, failed transaction debit, or payment mismatch occurs, contact Nipracademy with the payment reference so the team can review the case with the payment provider.",
  },
  {
    title: "Course access issues",
    body: "If payment is successful but student portal access is not activated, Nipracademy will first work to restore access or assign the correct course before considering any refund request.",
  },
  {
    title: "Refund timeline",
    body: "Approved refunds, if any, are processed through the original payment method and may take time depending on the bank, UPI provider, or payment gateway.",
  },
  {
    title: "Contact",
    body: "For refund or payment support, contact Nipracademy with the student name, registered mobile number, course, and payment reference.",
  },
];

export default function RefundPolicyPage() {
  return (
    <section className="legal-page-shell mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="rounded-[28px] border border-slate-200/70 bg-white/96 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Refund Policy</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          This policy explains how Nipracademy reviews admission fee, course fee, and online payment concerns.
        </p>

        <div className="mt-8 space-y-6">
          {refundSections.map((section) => (
            <article key={section.title} className="rounded-[22px] bg-stone-50/80 p-5">
              <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
