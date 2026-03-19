"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultHomeContent } from "../../data/homeContent";
import type { HomeContent } from "../../types/home";

type LandingPageProps = {
  content?: HomeContent;
};

export default function LandingPage({ content = defaultHomeContent }: LandingPageProps) {
  const router = useRouter();

  useEffect(() => {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const loginButton = target.closest("[data-route-login='true']");
      if (loginButton) {
        event.preventDefault();
        router.push("/login");
        return;
      }

      const themeButton = target.closest("[data-theme-toggle='true']");
      if (!themeButton) {
        return;
      }

      event.preventDefault();
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <div className="w-full min-h-screen flex flex-col bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100 font-display transition-colors duration-200 selection:bg-primary selection:text-white">
        <header
          className="fixed top-0 z-50 w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 bg-white/85 dark:bg-slate-900/85"
          style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 overflow-hidden rounded-lg">
                <Image
                  src="/logo.png"
                  alt="Nipracademy"
                  width={40}
                  height={40}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="inline-flex items-center rounded-[999px] border border-white/25 bg-white/18 px-5.5 py-2.5 text-[2.65rem] sm:text-[3.3rem] font-black leading-[1.05] tracking-[-0.09em] text-[#0f172a] shadow-[0_18px_44px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.74)] backdrop-blur-2xl transition-all duration-500 ease-out hover:-translate-y-0.5 hover:scale-[1.04] hover:bg-white/24 hover:shadow-[0_24px_56px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.88)] dark:border-white/15 dark:bg-white/10 dark:text-white">
                Nipracademy
              </h2>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-accent transition-colors text-sm font-medium" href="#programs">Courses</a>
              <a className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-accent transition-colors text-sm font-medium" href="#pricing">Pricing</a>
            </nav>

            <div className="flex items-center gap-4">
              <button
                aria-label="Toggle Dark Mode"
                data-theme-toggle="true"
                className="flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined dark:hidden text-[20px]">light_mode</span>
                <span className="material-symbols-outlined hidden dark:block text-[20px]">dark_mode</span>
              </button>
              <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <Link
                href="/login"
                data-route-login="true"
                className="hidden sm:flex h-10 px-5 items-center justify-center rounded-lg bg-transparent text-slate-900 dark:text-slate-100 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        </header>

        <main className="w-full flex-1 pt-[80px]">
          <section className="min-h-screen flex items-center w-full px-4 py-12 md:px-8 md:py-20 lg:px-12 lg:py-24 bg-[url('https://images.unsplash.com/photo-1610484826967-09c5720778c7?q=80&w=2070&auto=format&fit=crop')] bg-no-repeat bg-cover bg-center relative">
            <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/95" />
            <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex-1">
                <div className="flex flex-col gap-6 text-center md:text-left">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                    <span className="block size-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">New Semester Open</span>
                  </div>
                  <h1 className="group relative w-fit max-w-5xl text-balance text-5xl sm:text-6xl lg:text-[6.5rem] font-black leading-[0.9] tracking-[-0.075em] transition-transform duration-500 hover:-translate-y-1">
                    <span className="absolute -inset-x-6 -inset-y-4 rounded-[32px] bg-white/35 dark:bg-white/8 border border-white/40 dark:border-white/10 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl opacity-90" />
                    <span className="relative block bg-gradient-to-b from-[#050816] via-[#111827] to-[#2b3547] bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-slate-400 drop-shadow-[0_18px_44px_rgba(15,23,42,0.2)]">
                      Learn without
                    </span>
                    <span className="relative mt-3 inline-flex rounded-[28px] border border-[#111827]/10 bg-gradient-to-r from-[#020617] via-[#111827] to-[#334155] px-5 py-2 text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)] transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-[0_30px_80px_rgba(2,6,23,0.42)] dark:border-white/10 dark:from-white dark:via-slate-100 dark:to-slate-300 dark:text-[#020617]">
                      limits
                    </span>
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-lg sm:text-xl font-normal leading-relaxed">
                    Unlock your potential with world-class education accessible from anywhere. Join millions of learners transforming their futures today.
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center md:justify-start pt-4">
                    <button className="h-14 px-8 rounded-xl bg-primary text-white text-base font-bold shadow-lg shadow-primary/30 hover:scale-105 hover:shadow-primary/40 transition-all duration-300 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">school</span>
                      I&apos;m a Student
                    </button>
                    <button className="h-14 px-8 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">cast_for_education</span>
                      I&apos;m a Teacher
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex justify-center md:justify-end">
                <img
                  alt="Students collaborating"
                  className="w-full max-w-md h-auto object-cover rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl shadow-indigo-500/20"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIsQ45UBgvGgYnCoowgPXWyARyk4VV3ZlPjhT-N31Q6rP1PbxP7PN0HNiepWYrWSMYBTTMa6nMy4_TeOww6_n7T6i9XMLxeKVdgZAHzLXejJSfCX9vtIKBrXFjkxsMBR-df5HVi9mTNRSmURj9UW7rFfQ_7JD5ftGA-vuNSc10UJcQniBVt8jCtCthzDe8WSpGO-xwN1AaJLFWXQGXjvgGuFzGWKkNRw7upefMtJHsnO_IQ1wfYQzgq_EmD38y5CdoByh-MyPVdLQ"
                />
              </div>
            </div>
          </section>

          <section className="px-6 py-20 bg-slate-50 dark:bg-slate-900/50 w-full" id="programs">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 w-full">
              <div className="w-full">
                <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-2">Explore Categories</h2>
                <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight">{content.programsHeading}</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-4">{content.programsDescription}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {content.programs.map((program) => (
                <div key={program.id} className="group relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                  <h4 className="text-slate-900 dark:text-white text-xl font-bold">{program.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{program.subtitle}</p>
                  <div className="flex flex-col gap-2">
                    {program.chips.map((chip) => (
                      <div key={chip} className="text-sm text-slate-600 dark:text-slate-300">{chip}</div>
                    ))}
                  </div>
                  <Link href={program.ctaHref} className="mt-auto inline-flex h-10 px-4 items-center justify-center rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all">
                    {program.ctaLabel}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="px-6 py-20 bg-slate-50 dark:bg-slate-900/30 w-full" id="pricing">
            <div className="flex flex-col items-center w-full">
              <div className="text-center w-full mb-16">
                <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-2">Pricing Plans</h2>
                <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-4">Flexible plans for everyone</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                <div className="flex flex-col p-8 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 relative">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Free</h4>
                </div>
                <div className="flex flex-col p-8 rounded-3xl bg-white dark:bg-surface-dark border-2 border-primary relative shadow-2xl shadow-primary/10 z-10 md:-mt-8 md:mb-8">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pro</h4>
                </div>
                <div className="flex flex-col p-8 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 relative">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Enterprise</h4>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
