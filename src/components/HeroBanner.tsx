"use client";

import Image from "next/image";
import Link from "next/link";
import { type WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import type { HomeContent } from "../types/home";
import type { SiteSettings } from "../types/site";

type HeroBannerProps = {
  content: HomeContent;
  siteSettings: SiteSettings;
};

type HeroSlideAction = {
  label: string;
  href: string;
  tone: "primary" | "secondary";
  external?: boolean;
};

type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  footnote: string;
  actions: HeroSlideAction[];
  visual: "founder" | "academy" | "education";
  points?: string[];
  imageSrc?: string;
  imageAlt?: string;
};

export default function HeroBanner({ content, siteSettings }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [supportsFinePointer, setSupportsFinePointer] = useState(false);
  const [failedImageSrcs, setFailedImageSrcs] = useState<Record<string, boolean>>({});
  const lastWheelGestureAtRef = useRef(0);
  const { allowRichMotion, performanceMode } = useAdaptiveMotion();

  const phoneDialUrl = useMemo(() => `tel:${siteSettings.contactPhone.replace(/\s+/g, "")}`, [siteSettings.contactPhone]);
  const isLiteMotion = performanceMode === "lite";
  const isBalancedMotion = performanceMode === "balanced";
  const transitionDurationClass = isLiteMotion ? "duration-300" : isBalancedMotion ? "duration-500" : "duration-700";

  const slides = useMemo<HeroSlide[]>(
    () => [
      {
        id: "founder-vision",
        eyebrow: "Founder Note",
        title: "Teaching should feel clear, disciplined, and useful.",
        description:
          `Our founder shaped ${siteSettings.siteName} around one simple belief: students grow faster when ideas are explained clearly, practice stays steady, and guidance remains calm.`,
        footnote: `Founder, ${siteSettings.siteName}`,
        actions: [
          { label: "About Nipracademy", href: "/about", tone: "primary" },
          { label: "Talk to Counselors", href: phoneDialUrl, tone: "secondary", external: true },
        ],
        visual: "founder",
        imageSrc: "/founder.jpg.jpeg",
        imageAlt: "Founder of Nipracademy",
      },
      {
        id: "about-nipra",
        eyebrow: content.heroBadge || "Inside Nipra",
        title: content.heroTitle || "Learn clearly. Grow steadily.",
        description: content.heroSubtitle || "Classes, practice, and guidance in one calm student space.",
        footnote: `Call ${siteSettings.contactPhone} for admissions and academic support.`,
        actions: [
          { label: content.heroPrimaryCtaLabel || "Explore Programs", href: content.heroPrimaryCtaHref || "/courses", tone: "primary" },
          { label: content.heroSecondaryCtaLabel || "Talk to Counselors", href: content.heroSecondaryCtaHref || "/#contact", tone: "secondary" },
        ],
        visual: "academy",
        points: ["Class 1 to 12 support", "Online + Offline batches", "Calm personal guidance"],
      },
      {
        id: "education-view",
        eyebrow: "Education",
        title: "Education works best when basics stay strong and progress stays steady.",
        description:
          "Good education is not noise or pressure. It is concept clarity, regular revision, careful practice, and confidence that grows step by step.",
        footnote: "Understand, practice, review, and grow with consistency.",
        actions: [
          { label: "View Courses", href: "/courses", tone: "primary" },
          { label: "Start Admission", href: "/join", tone: "secondary" },
        ],
        visual: "education",
        points: ["Understand", "Practice", "Review", "Grow"],
      },
    ],
    [
      content.heroBadge,
      content.heroPrimaryCtaHref,
      content.heroPrimaryCtaLabel,
      content.heroSecondaryCtaHref,
      content.heroSecondaryCtaLabel,
      content.heroSubtitle,
      content.heroTitle,
      phoneDialUrl,
      siteSettings.contactPhone,
      siteSettings.siteName,
    ],
  );

  useEffect(() => {
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const syncViewport = () => {
      setSupportsFinePointer(finePointerQuery.matches);
    };

    if (typeof finePointerQuery.addEventListener === "function") {
      finePointerQuery.addEventListener("change", syncViewport);
    } else {
      finePointerQuery.addListener(syncViewport);
    }

    syncViewport();

    return () => {
      if (typeof finePointerQuery.removeEventListener === "function") {
        finePointerQuery.removeEventListener("change", syncViewport);
      } else {
        finePointerQuery.removeListener(syncViewport);
      }
    };
  }, []);

  useEffect(() => {
    if (!allowRichMotion || slides.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5200);

    return () => {
      window.clearInterval(interval);
    };
  }, [allowRichMotion, slides.length]);

  const goToSlide = (index: number) => {
    const slideCount = slides.length;
    setActiveIndex((index + slideCount) % slideCount);
  };

  const handleTrackpadSwipe = (event: WheelEvent<HTMLDivElement>) => {
    if (!supportsFinePointer || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const horizontalDelta = Math.abs(event.deltaX) > 0.5 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    const minimumDelta = isLiteMotion ? 20 : isBalancedMotion ? 16 : 12;

    if (!horizontalDelta || Math.abs(horizontalDelta) < minimumDelta) {
      return;
    }

    if (!event.shiftKey && Math.abs(horizontalDelta) <= Math.abs(event.deltaY)) {
      return;
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const minimumInterval = isLiteMotion ? 320 : isBalancedMotion ? 260 : 210;

    if (now - lastWheelGestureAtRef.current < minimumInterval) {
      event.preventDefault();
      return;
    }

    lastWheelGestureAtRef.current = now;
    event.preventDefault();
    goToSlide(activeIndex + (horizontalDelta > 0 ? 1 : -1));
  };

  const renderSlideAction = (slideId: string, action: HeroSlideAction) => {
    const className =
      action.tone === "primary"
        ? "hero-ribbon-action inline-flex min-h-[3.1rem] items-center justify-center rounded-full bg-slate-950 px-6 text-[0.95rem] font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.14)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-800"
        : "hero-ribbon-action inline-flex min-h-[3.1rem] items-center justify-center rounded-full bg-white/78 px-6 text-[0.95rem] font-semibold text-slate-700 shadow-[0_10px_26px_rgba(15,23,42,0.05)] backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/92";

    if (action.external) {
      return (
        <a key={`${slideId}-${action.label}`} href={action.href} className={className}>
          {action.label}
        </a>
      );
    }

    return (
      <Link key={`${slideId}-${action.label}`} href={action.href} className={className}>
        {action.label}
      </Link>
    );
  };

  const renderSlideVisual = (slide: HeroSlide) => {
    if (slide.visual === "founder") {
      return (
        <div className="relative flex h-full w-full items-end justify-center min-[480px]:justify-end">
          {!failedImageSrcs[slide.imageSrc ?? ""] && slide.imageSrc ? (
            <Image
              src={slide.imageSrc}
              alt={slide.imageAlt ?? slide.title}
              width={516}
              height={635}
              priority
              sizes="(min-width: 1280px) 25rem, (min-width: 768px) 21rem, 13rem"
              className="hero-ribbon-founder-image relative z-10 h-auto w-full max-w-[12rem] object-contain object-center md:max-w-[17rem] xl:max-w-[21rem]"
              onError={() => {
                setFailedImageSrcs((current) => ({
                  ...current,
                  [slide.imageSrc ?? ""]: true,
                }));
              }}
            />
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center">
              <span className="inline-flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full bg-slate-950 text-2xl font-semibold tracking-[-0.04em] text-white">
                N
              </span>
              <p className="max-w-[22ch] text-[0.98rem] leading-7 text-slate-600">Clear learning. Calm guidance. Useful practice.</p>
            </div>
          )}
        </div>
      );
    }

    if (slide.visual === "academy") {
      return (
        <div className="w-full max-w-[24rem] space-y-3">
          {slide.points?.map((point, index) => (
            <div key={point} className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[1.2rem] bg-white/72 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-[clamp(1rem,1.8vw,1.2rem)] font-semibold leading-snug tracking-[-0.035em] text-slate-950 [text-wrap:balance]">
                {point}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex w-full max-w-[24rem] flex-wrap justify-center gap-3">
        {slide.points?.map((point) => (
          <div
            key={point}
            className="inline-flex min-h-[3.05rem] items-center justify-center rounded-full bg-white/76 px-5 text-[0.94rem] font-semibold tracking-[-0.02em] text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.04)] backdrop-blur-sm"
          >
            {point}
          </div>
        ))}
      </div>
    );
  };

  return (
    <section
      className="hero-ribbon-shell group relative overflow-hidden rounded-[2.85rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,248,0.94))] px-4 pb-4 pt-16 shadow-[0_18px_48px_rgba(15,23,42,0.045)] min-[480px]:pt-14 md:p-5"
      onWheelCapture={handleTrackpadSwipe}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_72%)]" />

      <div className="relative z-10 grid gap-4">
        <div className="hero-ribbon-toolbar grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <span className="inline-flex min-h-8 items-center rounded-full bg-white/72 px-3.5 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.04)] backdrop-blur-sm">
              Inside Nipracademy
            </span>
          </div>

          <div className="hero-ribbon-nav hidden gap-2 md:flex">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goToSlide(activeIndex - 1)}
              className="hero-ribbon-arrow inline-flex h-[2.8rem] w-[2.8rem] items-center justify-center rounded-full bg-white/74 text-slate-950 shadow-[0_10px_22px_rgba(15,23,42,0.05)] backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/92"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.05rem] w-[1.05rem] stroke-current">
                <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goToSlide(activeIndex + 1)}
              className="hero-ribbon-arrow inline-flex h-[2.8rem] w-[2.8rem] items-center justify-center rounded-full bg-white/74 text-slate-950 shadow-[0_10px_22px_rgba(15,23,42,0.05)] backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/92"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.05rem] w-[1.05rem] stroke-current">
                <path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="hero-ribbon-carousel overflow-hidden">
          <div
            className={`flex w-full ${transitionDurationClass} ease-[cubic-bezier(0.22,1,0.36,1)] transition-transform`}
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <article key={slide.id} className="hero-ribbon-slide min-w-full">
                <div className="hero-ribbon-card grid min-h-[18rem] gap-5 px-1 py-3 min-[480px]:grid-cols-[minmax(0,1.05fr)_minmax(9.75rem,0.95fr)] min-[480px]:items-start min-[480px]:gap-4 min-[480px]:px-2 lg:min-h-[28rem] lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-center lg:gap-12 lg:px-4">
                  <div className="hero-ribbon-copy relative z-10 min-w-0 min-[480px]:pr-2 lg:pr-4">
                    <div className="hero-ribbon-meta flex flex-wrap items-center gap-2.5">
                      <span className="hero-ribbon-index inline-flex min-h-7 items-center rounded-full bg-slate-100 px-2.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="hero-ribbon-eyebrow text-[0.7rem] font-bold uppercase tracking-[0.2em] text-slate-500">
                        {slide.eyebrow}
                      </span>
                    </div>

                    <h3 className="hero-ribbon-title mt-3.5 max-w-[12ch] text-[clamp(1.78rem,4.7vw,4.8rem)] font-bold leading-[0.95] tracking-[-0.072em] text-slate-950 [text-wrap:balance]">
                      {slide.title}
                    </h3>

                    <p className="hero-ribbon-description mt-4 max-w-[52ch] text-[clamp(0.98rem,1.58vw,1.05rem)] leading-7 text-slate-600 [text-wrap:pretty]">
                      {slide.description}
                    </p>

                    <p className="hero-ribbon-footnote mt-3 text-sm leading-6 text-slate-500">{slide.footnote}</p>

                    <div className="hero-ribbon-actions mt-6 flex flex-wrap gap-2.5">
                      {slide.actions.map((action) => renderSlideAction(slide.id, action))}
                    </div>
                  </div>

                  <div className="hero-ribbon-visual-shell relative mt-5 flex min-h-[10rem] items-end justify-center min-[480px]:mt-0 min-[480px]:min-h-0 min-[480px]:justify-end lg:min-h-[20rem]">
                    {renderSlideVisual(slide)}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hero-ribbon-pagination-shell mt-2 flex justify-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => goToSlide(index)}
                className={`h-[0.55rem] w-[0.55rem] rounded-full transition ${
                  index === activeIndex ? "bg-slate-950" : "bg-slate-300/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 479px) {
          .hero-ribbon-action {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-ribbon-action,
          .hero-ribbon-arrow {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}