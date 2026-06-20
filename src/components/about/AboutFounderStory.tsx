import { Space_Grotesk } from "next/font/google";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

type AboutFounderStoryProps = {
  siteName: string;
  contactPhone: string;
  contactAddress: string;
};

const stats = ["Est. 2024", "Deo, Bihar", "CBSE + Bihar Board", "Class 1–12"];

const features = [
  {
    title: "Concept Clarity",
    description: "Every topic explained from basics. No student is left confused.",
    iconPath: "M5 6.5h8.5A3.5 3.5 0 0 1 17 10v8H8.5A3.5 3.5 0 0 0 5 21.5v-15Zm12 3.5h2a2 2 0 0 1 2 2v9.5A3.5 3.5 0 0 0 17.5 18H17v-8Z",
  },
  {
    title: "Regular Practice",
    description: "Weekly tests and revision cycles keep students exam-ready.",
    iconPath: "M8 4h8l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Zm1.5 7.5 1.75 1.75L15 9.5M9 17h6",
  },
  {
    title: "Personal Guidance",
    description: "Small batches mean every student gets direct attention.",
    iconPath: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0M18 8.5l2 2 3-3",
  },
];

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

function getPhoneHref(phone: string) {
  const digits = normalizePhoneNumber(phone);
  return digits ? `tel:${digits}` : "/contact";
}

function getWhatsAppHref(phone: string) {
  const digits = normalizePhoneNumber(phone);
  if (!digits) {
    return "/contact";
  }

  const internationalDigits = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${internationalDigits}`;
}

function FeatureIcon({ path }: { path: string }) {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)]">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d={path} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function AboutFounderStory({ siteName, contactPhone, contactAddress }: AboutFounderStoryProps) {
  const phone = contactPhone.trim() || "7324868574";
  const address = contactAddress.trim() || "Deo, Aurangabad, Bihar";

  return (
    <section className="app-page-shell relative overflow-hidden bg-white pt-3 sm:pt-4 lg:pt-6" style={{ marginTop: "-5.5rem" }}>
      <div className="pointer-events-none absolute left-0 top-16 h-56 w-56 rounded-full bg-stone-200/35 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-28 h-64 w-64 rounded-full bg-slate-200/25 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:px-12 lg:pb-20 lg:pt-16">
        <div className="rounded-[36px] bg-white/96 px-6 py-10 text-center shadow-[0_18px_44px_rgba(36,32,28,0.06)] sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          <span className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white">
            About {siteName}
          </span>

          <h1
            className={`${displayFont.className} mx-auto mt-6 max-w-4xl text-[clamp(2.3rem,5vw,5rem)] font-semibold leading-[0.95] tracking-[-0.08em] text-slate-950`}
            style={{ textWrap: "balance" }}
          >
            Clear concepts. Steady practice. Personal guidance.
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-[1rem] leading-8 text-slate-600 sm:text-[1.08rem]" style={{ textWrap: "pretty" }}>
            Nipracademy is a structured coaching academy in Deo, Aurangabad Bihar — built for Class 1 to 12 students who want real learning, not just exam tricks.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat} className="rounded-[28px] bg-stone-50/88 px-5 py-5 text-center shadow-[0_12px_30px_rgba(36,32,28,0.04)]">
              <p className="text-[0.84rem] font-semibold uppercase tracking-[0.12em] text-slate-800">{stat}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[32px] bg-white/96 p-6 shadow-[0_16px_38px_rgba(36,32,28,0.05)]">
              <FeatureIcon path={feature.iconPath} />
              <h2 className={`${displayFont.className} mt-5 text-2xl font-semibold tracking-[-0.05em] text-slate-950`}>{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[36px] bg-slate-950 px-6 py-9 text-center shadow-[0_18px_44px_rgba(15,23,42,0.14)] sm:px-10 sm:py-11">
          <p className="mx-auto max-w-4xl text-[1.25rem] font-medium leading-9 tracking-[-0.03em] text-white sm:text-2xl sm:leading-10" style={{ textWrap: "balance" }}>
            Good coaching is not pressure or noise. It is a clear explanation, a steady schedule, and a teacher who notices when a student is stuck. That is the Nipracademy way.
          </p>
        </div>

        <div className="mt-6 rounded-[36px] bg-stone-50/90 p-6 shadow-[0_14px_36px_rgba(36,32,28,0.05)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">Contact</span>
              <h2 className={`${displayFont.className} mt-4 text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-4xl`}>
                Visit or talk to us.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Speak with the Nipracademy team for course guidance, admission support, and batch details.
              </p>
            </div>

            <div className="grid gap-3">
              <a href={getPhoneHref(phone)} className="rounded-[26px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(36,32,28,0.04)] transition hover:-translate-y-0.5">
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Phone</span>
                <strong className="mt-2 block text-lg text-slate-950">{phone}</strong>
              </a>

              <a
                href={getWhatsAppHref(phone)}
                target={getWhatsAppHref(phone).startsWith("https://") ? "_blank" : undefined}
                rel={getWhatsAppHref(phone).startsWith("https://") ? "noreferrer" : undefined}
                className="rounded-[26px] bg-slate-950 px-5 py-4 text-white shadow-[0_14px_30px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-900"
              >
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">WhatsApp</span>
                <strong className="mt-2 block text-lg">Message on WhatsApp</strong>
              </a>

              <div className="rounded-[26px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(36,32,28,0.04)]">
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Address</span>
                <strong className="mt-2 block text-lg leading-7 text-slate-950">{address}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
