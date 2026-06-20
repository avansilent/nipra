import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Nipracademy",
  description: "Privacy Policy for Nipracademy students, parents, admissions, payments, and learning portal access.",
};

const privacySections = [
  {
    title: "Information we collect",
    body: "We collect the details needed to manage admissions, learning access, communication, and payments. This may include student name, parent or guardian contact details, phone number, email, class, selected course, payment status, and portal activity.",
  },
  {
    title: "How we use information",
    body: "We use student and parent information to provide course access, share class updates, manage study materials, verify payments, support live classes, and improve the learning experience.",
  },
  {
    title: "Payments and verification",
    body: "Payments are processed through secure payment partners such as Razorpay. Nipracademy does not store full card, UPI, or banking credentials on this website.",
  },
  {
    title: "Student portal security",
    body: "Student materials, classes, videos, and account details are intended only for enrolled students. Users should keep login access private and notify Nipracademy if they suspect unauthorized access.",
  },
  {
    title: "Contact",
    body: "For privacy questions or data correction requests, contact Nipracademy through the official phone number or support channel listed on the website.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <section className="legal-page-shell mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="rounded-[28px] border border-slate-200/70 bg-white/96 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          This policy explains how Nipracademy handles student, parent, admission, payment, and learning portal information.
        </p>

        <div className="mt-8 space-y-6">
          {privacySections.map((section) => (
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
