"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultHomeContent } from "../../data/homeContent";
import { DEFAULT_LOGO_SRC } from "../../lib/branding";
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
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap"
        rel="stylesheet"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <div className="w-full min-h-screen flex flex-col bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100 font-display transition-colors duration-200 selection:bg-primary selection:text-white">
        <header
          className="fixed top-0 z-50 w-full px-4 py-4 sm:px-6 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 bg-white/85 dark:bg-slate-900/85"
          style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
        >
          <div className="w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 overflow-hidden rounded-[1.15rem]">
                <Image
                  src={DEFAULT_LOGO_SRC}
                  alt="Nipracademy"
                  width={40}
                  height={40}
                  priority
                  className="h-10 w-10 object-contain"
                />
              </div>
              <h2 className="luxury-pill inline-flex items-center whitespace-nowrap rounded-full px-6 py-3 text-[1.7rem] sm:text-[2.25rem] lg:text-[2.6rem] font-black leading-[1.14] tracking-[-0.04em] text-[#020617] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.04] dark:text-white">
                Nipracademy
              </h2>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-accent transition-colors text-sm font-medium" href="#programs">Courses</a>
              <a className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-accent transition-colors text-sm font-medium" href="#pricing">Pricing</a>
            </nav>

            <div className="flex items-center gap-4 shrink-0">
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
          <section className="min-h-screen flex items-center w-full px-5 py-12 sm:px-6 md:px-8 md:py-20 lg:px-12 lg:py-24 bg-[url('https://images.unsplash.com/photo-1610484826967-09c5720778c7?q=80&w=2070&auto=format&fit=crop')] bg-no-repeat bg-cover bg-center relative">
            <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/95" />
            <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14">
              <div className="flex-1">
                <div className="flex flex-col gap-6 pl-1 sm:pl-2 md:pl-0 text-center md:text-left">
                  <div className="luxury-badge inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 transition-transform duration-300 ease-out hover:-translate-y-0.5">
                    <span className="block size-2 rounded-full bg-[#b8891d] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8a6516]">New Semester Open</span>
                  </div>
                  <h1 className="group relative w-fit max-w-5xl text-balance text-5xl sm:text-6xl lg:text-[6.5rem] font-black leading-[0.92] tracking-[-0.06em] transition-transform duration-300 md:duration-500 hover:-translate-y-1">
                    <span className="absolute -inset-x-4 -inset-y-3 sm:-inset-x-6 sm:-inset-y-4 rounded-[28px] sm:rounded-[32px] bg-[linear-gradient(135deg,rgba(255,248,230,0.82),rgba(255,237,194,0.42),rgba(255,255,255,0.2))] border border-[rgba(240,223,184,0.8)] shadow-[0_16px_40px_rgba(166,118,33,0.12)] sm:shadow-[0_30px_80px_rgba(166,118,33,0.16)] backdrop-blur-md sm:backdrop-blur-xl opacity-95" />
                    <span className="relative block bg-gradient-to-b from-[#050816] via-[#111827] to-[#2b3547] bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-slate-400 drop-shadow-[0_10px_24px_rgba(15,23,42,0.14)] sm:drop-shadow-[0_18px_44px_rgba(15,23,42,0.2)]">
                      Learn without
                    </span>
                    <span className="luxury-wordmark relative mt-3 inline-flex rounded-[24px] sm:rounded-[28px] px-5 py-2 text-white shadow-[0_14px_34px_rgba(2,6,23,0.24)] sm:shadow-[0_24px_60px_rgba(2,6,23,0.35)] transition-all duration-300 md:duration-500 group-hover:scale-[1.02] group-hover:shadow-[0_20px_48px_rgba(90,62,14,0.32)] sm:group-hover:shadow-[0_30px_80px_rgba(90,62,14,0.42)] dark:border-white/10 dark:from-white dark:via-slate-100 dark:to-slate-300 dark:text-[#020617]">
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

              <div className="flex-1 flex justify-center md:justify-end w-full md:w-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Students collaborating"
                  className="w-full max-w-sm sm:max-w-md h-auto object-cover rounded-3xl border border-white/20 dark:border-white/10 shadow-[0_18px_44px_rgba(79,70,229,0.12)] sm:shadow-2xl sm:shadow-indigo-500/20"
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
