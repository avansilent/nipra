import Link from "next/link";
import { fetchSiteSettings } from "../../lib/siteSettings";

const offers = [
  {
    title: "Academic Excellence",
    description:
      "We provide coaching for school students with a strong focus on concept clarity in Science, Mathematics, and English for CBSE and Bihar Board learners.",
  },
  {
    title: "Experienced Guidance",
    description:
      "Our teachers simplify complex topics and make sure every student understands the fundamentals clearly and confidently.",
  },
  {
    title: "Regular Tests and Practice",
    description:
      "Regular tests, assignments, and doubt-solving sessions help track progress and improve performance consistently.",
  },
  {
    title: "Online and Offline Classes",
    description:
      "Flexible learning options allow students to study in classrooms as well as through digital platforms with the same continuity.",
  },
  {
    title: "Skill Development",
    description:
      "Beyond academics, we emphasize communication skills, confidence building, and overall personality development.",
  },
];

const reasons = [
  "Student-centered teaching approach",
  "Personalized attention for every learner",
  "Focus on concept clarity rather than rote learning",
  "Consistent performance improvement tracking",
  "Positive and motivating study environment",
];

const courses = [
  "Pre-Primary (Nursery to UKG)",
  "Primary (Class 1 to 5)",
  "Middle School (Class 6 to 8)",
  "Secondary Board Preparation (Class 9 and 10)",
  "Senior Secondary Science, Commerce, and Arts streams (Class 11 and 12)",
];

const signals = [
  {
    label: "Learning model",
    value: "Concept-first teaching",
  },
  {
    label: "Delivery",
    value: "Online + Offline batches",
  },
  {
    label: "Coverage",
    value: "Pre-primary to Class 12",
  },
];

const foundations = [
  {
    title: "Mission",
    copy: "Create a learning environment where students understand deeply, apply with confidence, and grow with steady academic discipline.",
  },
  {
    title: "Vision",
    copy: "Build a trusted institute that gives students the knowledge, structure, and confidence needed for academic and career progress.",
  },
];

export default async function AboutPage() {
  const siteSettings = await fetchSiteSettings();

  return (
    <section className="app-page-shell relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_58%)]" />
      <div className="pointer-events-none absolute -left-16 top-24 h-72 w-72 rounded-full bg-stone-200/70 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-slate-200/60 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-8">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative overflow-hidden rounded-[2.55rem] border border-slate-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,246,247,0.94))] p-8 shadow-[0_30px_76px_rgba(15,23,42,0.06)] sm:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(226,232,240,0.95),transparent_70%)] blur-3xl" />
            <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/88 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-600 shadow-[0_10px_24px_rgba(8,17,31,0.05)]">
              About {siteSettings.siteName}
            </span>

            <h1 className="mt-6 max-w-[11ch] text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-slate-950">
              Built for clear teaching, steady progress, and confident students.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-[1.05rem]">
              Nipracademy is a coaching institute in Deo, Aurangabad, Bihar focused on clear teaching, calm guidance, and steady student progress.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500 sm:text-[1.02rem]">
              Students do more than study here. They understand, apply, improve, and build confidence step by step.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/join" className="btn rounded-full px-6 py-3 text-sm font-semibold">
                Start Admission
              </Link>
              <Link href="/#contact" className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white/92 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_14px_30px_rgba(8,17,31,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300">
                Talk to Counselors
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-600">
              {signals.map((signal) => (
                <div key={signal.label} className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">{signal.label}</p>
                  <p className="mt-1 font-medium leading-6 text-slate-700">{signal.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="relative overflow-hidden rounded-[2.35rem] border border-slate-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,245,247,0.92))] p-8 text-slate-950 shadow-[0_28px_72px_rgba(15,23,42,0.06)]">
              <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(226,232,240,0.92),transparent_70%)] blur-3xl" />
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Institution Focus</p>
              <h2 className="mt-4 max-w-[14ch] text-[clamp(1.8rem,3vw,2.7rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-slate-950">
                Academic structure that feels clear, current, and personal.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-[0.98rem]">
                Families come to {siteSettings.siteName} for strong fundamentals, supportive mentorship, and a system that keeps students moving without unnecessary noise.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {foundations.map((item) => (
                  <div key={item.title} className="public-soft-card px-4 py-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.85rem] bg-white/72 p-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">Support line</p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-slate-950">{siteSettings.contactPhone}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Direct counselor support for admissions, batches, and guidance.</p>
              </div>
              <div className="rounded-[1.85rem] bg-white/72 p-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">Learning promise</p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-slate-950">Clearer concepts, steadier progress</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Students are trained for consistency, not just short bursts of exam pressure.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="max-w-3xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">What We Offer</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3vw,2.8rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-slate-950">
              A full academic ecosystem designed for structure, practice, and real student growth.
            </h2>
          </div>

          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer, index) => (
              <article key={offer.title} className="public-soft-card px-5 py-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Capability</p>
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-slate-950">{offer.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{offer.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2.2rem] border border-slate-200/55 bg-white/88 p-7 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-8">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Why Families Choose Us</p>
            <h2 className="mt-4 text-[clamp(1.7rem,2.7vw,2.4rem)] font-semibold leading-[1.04] tracking-[-0.05em] text-slate-950">
              The environment stays disciplined, supportive, and easy to trust.
            </h2>
            <ul className="mt-6 grid gap-3">
              {reasons.map((reason) => (
                <li key={reason} className="public-soft-card flex items-start gap-3 px-4 py-4 text-sm leading-7 text-slate-700">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">+</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2.2rem] border border-slate-200/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,247,248,0.9))] p-7 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-8">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Course Ladder</p>
            <h2 className="mt-4 text-[clamp(1.7rem,2.7vw,2.4rem)] font-semibold leading-[1.04] tracking-[-0.05em] text-slate-950">
              Students can grow through every stage without losing continuity.
            </h2>
            <div className="mt-6 grid gap-3">
              {courses.map((course) => (
                <div key={course} className="public-soft-card px-4 py-4 text-sm font-medium leading-7 text-slate-700">
                  {course}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2.35rem] border border-slate-200/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,247,248,0.92))] p-8 shadow-[0_20px_46px_rgba(15,23,42,0.04)] sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Our Commitment</p>
              <h2 className="mt-4 max-w-[16ch] text-[clamp(2rem,3vw,2.9rem)] font-semibold leading-[1.03] tracking-[-0.06em] text-slate-950">
                A calmer, clearer path for students who need structure and support.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                At {siteSettings.siteName}, we stay committed to guiding students through every stage of the academic journey. The goal is not only better scores, but stronger confidence, clearer understanding, and readiness for future challenges.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500">
                Admission begins with the one-time admission fee. After payment, the team guides families through batch details, the monthly fee plan, and final confirmation without confusion.
              </p>
            </div>

            <div className="rounded-[1.85rem] border border-slate-200/55 bg-white/80 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">Next Step</p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-slate-950">Start with a cleaner admission flow and guided counselor support.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/join" className="btn rounded-full px-6 py-3 text-sm font-semibold">
                  Begin Admission
                </Link>
                <Link href="/#contact" className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_14px_30px_rgba(8,17,31,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300">
                  Talk to the Team
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}