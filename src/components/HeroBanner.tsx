"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, type WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import type { HomeContent } from "../types/home";
import type { SiteSettings } from "../types/site";

type HeroBannerProps = {
  content: HomeContent;
  siteSettings: SiteSettings;
  initialSlideId?: string;
  disableAutoplay?: boolean;
};

type HeroSlideAction = {
  label: string;
  href: string;
  tone: "primary" | "secondary";
  external?: boolean;
};

type HeroSlideAccent = "rose" | "amber" | "sky";

type HeroSlide = {
  id: string;
  accent: HeroSlideAccent;
  eyebrow: string;
  statusLabel: string;
  title: string;
  description: string;
  footnote: string;
  actions: HeroSlideAction[];
  visual: "founder" | "academy" | "education";
  signalItems: string[];
  highlights?: string[];
  sideLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
};

const accentStyles: Record<HeroSlideAccent, {
  statusText: string;
  statusBadgeClassName: string;
  dotClassName: string;
  lineClassName: string;
  glowClassName: string;
  surfaceTintClassName: string;
  premiumWashClassName: string;
  primaryButtonClassName: string;
  secondaryBorderClassName: string;
  surfaceGradient: string;
  premiumWashGradient: string;
  badgeGradient: string;
  chipGradient: string;
  rowIndexClassName: string;
}> = {
  rose: {
    statusText: "text-rose-600",
    statusBadgeClassName: "shadow-[0_8px_18px_rgba(244,63,94,0.08)]",
    dotClassName: "bg-gradient-to-r from-rose-500 to-orange-400",
    lineClassName: "from-rose-500/80 via-orange-300/60 to-transparent",
    glowClassName: "bg-[radial-gradient(circle,rgba(244,63,94,0.18),rgba(251,146,60,0.08),transparent_72%)]",
    surfaceTintClassName: "from-rose-100/78 via-white/78 to-orange-50/48",
    premiumWashClassName: "from-rose-500/14 via-red-400/8 to-orange-300/10",
    primaryButtonClassName: "from-rose-600 via-red-500 to-orange-400",
    secondaryBorderClassName: "border-rose-200/70 text-rose-700 hover:border-rose-300/80 hover:text-rose-800",
    surfaceGradient: "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(255,245,247,0.96) 38%, rgba(255,243,238,0.94) 100%)",
    premiumWashGradient: "linear-gradient(90deg, rgba(225,29,72,0.2), rgba(244,63,94,0.08), rgba(251,146,60,0.14))",
    badgeGradient: "linear-gradient(135deg, rgba(255,241,242,0.98), rgba(255,255,255,0.96), rgba(255,247,237,0.94))",
    chipGradient: "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,244,246,0.88), rgba(255,247,237,0.84))",
    rowIndexClassName: "text-rose-500",
  },
  amber: {
    statusText: "text-amber-600",
    statusBadgeClassName: "shadow-[0_8px_18px_rgba(245,158,11,0.08)]",
    dotClassName: "bg-gradient-to-r from-amber-500 to-orange-400",
    lineClassName: "from-amber-500/80 via-orange-300/60 to-transparent",
    glowClassName: "bg-[radial-gradient(circle,rgba(245,158,11,0.18),rgba(251,191,36,0.08),transparent_72%)]",
    surfaceTintClassName: "from-amber-100/72 via-white/78 to-orange-50/46",
    premiumWashClassName: "from-amber-400/14 via-orange-300/8 to-yellow-300/10",
    primaryButtonClassName: "from-amber-500 via-orange-400 to-amber-300",
    secondaryBorderClassName: "border-amber-200/75 text-amber-700 hover:border-amber-300/85 hover:text-amber-800",
    surfaceGradient: "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(255,249,236,0.96) 38%, rgba(255,244,229,0.94) 100%)",
    premiumWashGradient: "linear-gradient(90deg, rgba(245,158,11,0.2), rgba(251,146,60,0.08), rgba(250,204,21,0.14))",
    badgeGradient: "linear-gradient(135deg, rgba(255,251,235,0.98), rgba(255,255,255,0.96), rgba(255,247,237,0.94))",
    chipGradient: "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,249,236,0.88), rgba(255,243,224,0.84))",
    rowIndexClassName: "text-amber-500",
  },
  sky: {
    statusText: "text-sky-600",
    statusBadgeClassName: "shadow-[0_8px_18px_rgba(14,165,233,0.08)]",
    dotClassName: "bg-gradient-to-r from-sky-500 to-emerald-400",
    lineClassName: "from-sky-500/80 via-emerald-300/60 to-transparent",
    glowClassName: "bg-[radial-gradient(circle,rgba(14,165,233,0.16),rgba(52,211,153,0.08),transparent_72%)]",
    surfaceTintClassName: "from-sky-100/74 via-white/78 to-emerald-50/40",
    premiumWashClassName: "from-sky-400/14 via-cyan-300/8 to-emerald-300/10",
    primaryButtonClassName: "from-sky-600 via-cyan-500 to-emerald-400",
    secondaryBorderClassName: "border-sky-200/75 text-sky-700 hover:border-sky-300/85 hover:text-sky-800",
    surfaceGradient: "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(239,248,255,0.96) 38%, rgba(236,253,245,0.94) 100%)",
    premiumWashGradient: "linear-gradient(90deg, rgba(14,165,233,0.2), rgba(34,211,238,0.08), rgba(52,211,153,0.14))",
    badgeGradient: "linear-gradient(135deg, rgba(240,249,255,0.98), rgba(255,255,255,0.96), rgba(236,253,245,0.94))",
    chipGradient: "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(240,249,255,0.88), rgba(236,253,245,0.84))",
    rowIndexClassName: "text-sky-500",
  },
};

function getInitialSlideIndex(slideId?: string) {
  if (slideId === "about-nipra") {
    return 1;
  }

  if (slideId === "education-view") {
    return 2;
  }

  return 0;
}

export default function HeroBanner({ content, siteSettings, initialSlideId, disableAutoplay = false }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(() => getInitialSlideIndex(initialSlideId));
  const [supportsFinePointer, setSupportsFinePointer] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [failedImageSrcs, setFailedImageSrcs] = useState<Record<string, boolean>>({});
  const lastWheelGestureAtRef = useRef(0);
  const dragGestureRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    deltaX: 0,
    dragging: false,
    blocked: false,
  });
  const { allowRichMotion, performanceMode } = useAdaptiveMotion();

  const phoneDialUrl = useMemo(() => `tel:${siteSettings.contactPhone.replace(/\s+/g, "")}`, [siteSettings.contactPhone]);
  const isLiteMotion = performanceMode === "lite";
  const isBalancedMotion = performanceMode === "balanced";
  const transitionDurationClass = isLiteMotion ? "duration-300" : isBalancedMotion ? "duration-500" : "duration-700";

  const slides = useMemo<HeroSlide[]>(
    () => [
      {
        id: "founder-vision",
        accent: "rose",
        eyebrow: "Founder Note",
        statusLabel: "Founder Words",
        title: "Teaching should feel clear, disciplined, and useful.",
        description:
          `Our founder shaped ${siteSettings.siteName} around one simple belief: students grow faster when ideas are explained clearly, practice stays steady, and guidance remains calm.`,
        footnote: `Founder, ${siteSettings.siteName}`,
        actions: [
          { label: "About Nipracademy", href: "/about", tone: "primary" },
          { label: "Talk to Counselors", href: phoneDialUrl, tone: "secondary", external: true },
        ],
        visual: "founder",
        signalItems: ["Clear guidance", "Steady practice"],
        imageSrc: "/founder.jpg.jpeg",
        imageAlt: "Founder of Nipracademy",
      },
      {
        id: "about-nipra",
        accent: "amber",
        eyebrow: content.heroBadge || "Inside Nipra",
        statusLabel: "Live Classes",
        title: content.heroTitle || "Learn clearly. Grow steadily.",
        description: content.heroSubtitle || "Classes, practice, and guidance in one calm student space.",
        footnote: `Call ${siteSettings.contactPhone} for admissions and academic support.`,
        actions: [
          { label: content.heroPrimaryCtaLabel || "Explore Programs", href: content.heroPrimaryCtaHref || "/courses", tone: "primary" },
          { label: content.heroSecondaryCtaLabel || "Talk to Counselors", href: content.heroSecondaryCtaHref || "/#contact", tone: "secondary" },
        ],
        visual: "academy",
        signalItems: ["Online + Offline", "Admissions Open", "Class 1 to 12"],
        sideLabel: "How learning feels",
        imageSrc: content.heroImageUrl,
        imageAlt: `${siteSettings.siteName} learning hero image`,
        highlights: [
          "Live classes with clear explanation, revision, and doubt support.",
          "A calm structure for school study, tests, and regular progress.",
          "Personal guidance that stays useful across every batch.",
        ],
      },
      {
        id: "education-view",
        accent: "sky",
        eyebrow: "Education",
        statusLabel: "Learning Rhythm",
        title: "Education works best when basics stay strong and progress stays steady.",
        description:
          "Good education is not noise or pressure. It is concept clarity, regular revision, careful practice, and confidence that grows step by step.",
        footnote: "Understand, practice, review, and grow with consistency.",
        actions: [
          { label: "View Courses", href: "/courses", tone: "primary" },
          { label: "Start Admission", href: "/join", tone: "secondary" },
        ],
        visual: "education",
        signalItems: ["Concept Clarity", "Board Focus", "Regular Practice"],
        sideLabel: "What students build",
        highlights: [
          "Understand concepts before memorizing them.",
          "Practice steadily with written work and revision.",
          "Grow through discipline, feedback, and consistency.",
        ],
      },
    ],
    [
      content.heroBadge,
      content.heroImageUrl,
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
    const mobileViewportQuery = window.matchMedia("(max-width: 767px)");

    const syncViewport = () => {
      setSupportsFinePointer(finePointerQuery.matches);
      setIsMobileViewport(mobileViewportQuery.matches);
    };

    if (typeof finePointerQuery.addEventListener === "function") {
      finePointerQuery.addEventListener("change", syncViewport);
      mobileViewportQuery.addEventListener("change", syncViewport);
    } else {
      finePointerQuery.addListener(syncViewport);
      mobileViewportQuery.addListener(syncViewport);
    }

    syncViewport();

    return () => {
      if (typeof finePointerQuery.removeEventListener === "function") {
        finePointerQuery.removeEventListener("change", syncViewport);
        mobileViewportQuery.removeEventListener("change", syncViewport);
      } else {
        finePointerQuery.removeListener(syncViewport);
        mobileViewportQuery.removeListener(syncViewport);
      }
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport || disableAutoplay || !allowRichMotion || slides.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5200);

    return () => {
      window.clearInterval(interval);
    };
  }, [allowRichMotion, disableAutoplay, isMobileViewport, slides.length]);

  const goToSlide = (index: number) => {
    const slideCount = slides.length;
    setActiveIndex((index + slideCount) % slideCount);
  };

  const activeSlide = slides[activeIndex];
  const renderedSlides = isMobileViewport ? [activeSlide] : slides;

  const resetDragGesture = () => {
    dragGestureRef.current = {
      pointerId: -1,
      startX: 0,
      startY: 0,
      deltaX: 0,
      dragging: false,
      blocked: false,
    };
  };

  const shouldIgnoreDragTarget = (target: EventTarget | null) => {
    return target instanceof Element && Boolean(target.closest("a, button, input, textarea, select, summary, label"));
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

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    dragGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      deltaX: 0,
      dragging: false,
      blocked: shouldIgnoreDragTarget(event.target),
    };

    if (!dragGestureRef.current.blocked) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const currentGesture = dragGestureRef.current;
    if (currentGesture.pointerId !== event.pointerId || currentGesture.blocked) {
      return;
    }

    const deltaX = event.clientX - currentGesture.startX;
    const deltaY = event.clientY - currentGesture.startY;
    const activationDelta = isLiteMotion ? 18 : isBalancedMotion ? 14 : 12;

    if (!currentGesture.dragging) {
      if (Math.abs(deltaX) < activationDelta && Math.abs(deltaY) < activationDelta) {
        return;
      }

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        currentGesture.blocked = true;
        return;
      }

      currentGesture.dragging = true;
    }

    currentGesture.deltaX = deltaX;
    event.preventDefault();
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const currentGesture = dragGestureRef.current;
    if (currentGesture.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (currentGesture.dragging) {
      const swipeThreshold = isLiteMotion ? 44 : isBalancedMotion ? 38 : 32;

      if (Math.abs(currentGesture.deltaX) >= swipeThreshold) {
        goToSlide(activeIndex + (currentGesture.deltaX < 0 ? 1 : -1));
      }
    }

    resetDragGesture();
  };

  const renderSlideAction = (slide: HeroSlide, action: HeroSlideAction) => {
    const className =
      action.tone === "primary"
        ? `hero-ribbon-action inline-flex min-h-[2.55rem] items-center justify-center rounded-full px-4 text-[0.88rem] font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition duration-200 ease-out hover:-translate-y-0.5 ${accentStyles[slide.accent].statusText}`
        : "hero-ribbon-action inline-flex min-h-[2.55rem] items-center justify-center rounded-full bg-white/72 px-4 text-[0.88rem] font-semibold text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.04)] transition duration-200 ease-out hover:-translate-y-0.5";

    const buttonStyle = action.tone === "primary" ? { backgroundImage: accentStyles[slide.accent].badgeGradient } : undefined;

    if (action.external) {
      return (
        <a key={`${slide.id}-${action.label}`} href={action.href} className={className} style={buttonStyle}>
          {action.label}
        </a>
      );
    }

    return (
      <Link key={`${slide.id}-${action.label}`} href={action.href} className={className} style={buttonStyle}>
        {action.label}
      </Link>
    );
  };

  const renderSignalItems = (slide: HeroSlide) => (
    <div className="mt-2 hidden flex-wrap gap-x-2.5 gap-y-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500 md:flex">
      {slide.signalItems.map((item, index) => (
        <span key={item} className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${index === 0 ? accentStyles[slide.accent].dotClassName : "bg-slate-300"}`} />
          {item}
        </span>
      ))}
    </div>
  );

  const renderTitleContent = (slide: HeroSlide) => {
    const highlightClassName = `inline-block rounded-[0.72em] px-[0.28em] py-[0.06em] ${accentStyles[slide.accent].statusText}`;
    const highlightStyle = { backgroundImage: accentStyles[slide.accent].badgeGradient };

    if (slide.id === "founder-vision") {
      return (
        <>
          Teaching should feel <span className={highlightClassName} style={highlightStyle}>clear,</span> disciplined, and{" "}
          <span className={highlightClassName} style={highlightStyle}>useful.</span>
        </>
      );
    }

    if (slide.id === "about-nipra") {
      return (
        <>
          <span className={highlightClassName} style={highlightStyle}>Learn</span> clearly. <span className={highlightClassName} style={highlightStyle}>Grow steadily.</span>
        </>
      );
    }

    return (
      <>
        <span className={highlightClassName} style={highlightStyle}>Education</span> works best when basics stay strong and <span className={highlightClassName} style={highlightStyle}>progress</span> stays steady.
      </>
    );
  };

  const renderSlideVisual = (slide: HeroSlide, compact = false) => {
    if (slide.visual === "founder") {
      return (
        <div className="relative flex h-full w-full items-end justify-center lg:justify-end">
          <div className={`pointer-events-none absolute inset-x-[10%] bottom-[8%] h-[70%] rounded-full blur-3xl ${accentStyles[slide.accent].glowClassName}`} />
          {!failedImageSrcs[slide.imageSrc ?? ""] && slide.imageSrc ? (
            <Image
              src={slide.imageSrc}
              alt={slide.imageAlt ?? slide.title}
              width={516}
              height={635}
              priority
              sizes="(min-width: 1280px) 25rem, (min-width: 768px) 21rem, 13rem"
              className={`hero-ribbon-founder-image relative z-10 h-auto w-full object-contain object-center ${
                compact
                        ? "max-w-[5.85rem] sm:max-w-[6.4rem]"
                    : "max-w-[12.15rem] sm:max-w-[13.35rem] md:max-w-[16.2rem] xl:max-w-[19.2rem]"
              }`}
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

    if (slide.imageSrc && !failedImageSrcs[slide.imageSrc]) {
      return (
        <div className="relative w-full max-w-[18.5rem] overflow-hidden rounded-[1.45rem] bg-white/72 p-2 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          <div className={`pointer-events-none absolute inset-0 ${accentStyles[slide.accent].glowClassName} opacity-70 blur-3xl`} />
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.15rem] bg-slate-100">
            <Image
              src={slide.imageSrc}
              alt={slide.imageAlt ?? slide.title}
              fill
              sizes="(min-width: 1024px) 19rem, 100vw"
              className="object-cover"
              unoptimized
              onError={() => {
                setFailedImageSrcs((current) => ({
                  ...current,
                  [slide.imageSrc ?? ""]: true,
                }));
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full max-w-[18.5rem] pl-0 lg:pl-1">
        <p className="relative mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {slide.sideLabel}
        </p>
        <div className="relative mt-2 grid gap-2">
          {slide.highlights?.slice(0, 2).map((highlight, index) => (
            <div key={highlight} className="grid grid-cols-[auto_1fr] gap-2.5">
              <span className={`text-[0.62rem] font-bold uppercase tracking-[0.16em] ${accentStyles[slide.accent].rowIndexClassName}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-[0.82rem] leading-5 text-slate-600">{highlight}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section
      className="hero-ribbon-shell group relative overflow-hidden rounded-[2rem] border bg-white/96 px-5 pb-3 pt-3 shadow-[0_14px_30px_rgba(15,23,42,0.04)] sm:rounded-[2.2rem] sm:px-6 sm:pb-4 sm:pt-4 lg:rounded-[2.6rem] lg:px-10 lg:pb-4 lg:pt-4"
      onWheelCapture={handleTrackpadSwipe}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ borderColor: "rgba(255,255,255,0.5)", touchAction: "pan-y pinch-zoom" }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white/72" />

      <div className="relative z-10 grid gap-2.5">
        <div className="hero-ribbon-toolbar flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Inside Nipracademy
          </p>

          <div className="flex items-center gap-3">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
            <div className="hero-ribbon-pagination-shell flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => goToSlide(index)}
                  className={`hero-ribbon-pagination-button h-[0.28rem] rounded-full transition ${
                    index === activeIndex ? "w-8 bg-slate-950" : "w-3 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="hero-ribbon-carousel overflow-hidden">
          <div
            className={
              isMobileViewport
                ? "w-full"
                : `flex w-full ${transitionDurationClass} ease-[cubic-bezier(0.22,1,0.36,1)] transition-transform`
            }
            style={isMobileViewport ? undefined : { transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {renderedSlides.map((slide) => (
              <article key={slide.id} className="hero-ribbon-slide min-w-full">
                <div className="hero-ribbon-card grid min-h-0 gap-2.5 py-0 lg:grid-cols-[minmax(0,1.04fr)_minmax(15rem,0.96fr)] lg:items-center lg:gap-4.5">
                  <div className="hero-ribbon-copy relative z-10 min-w-0 lg:pr-2">
                    <div className="hero-ribbon-meta flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.69rem] font-semibold uppercase tracking-[0.2em] ${accentStyles[slide.accent].statusText} ${accentStyles[slide.accent].statusBadgeClassName}`}
                        style={{ backgroundImage: accentStyles[slide.accent].badgeGradient }}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${accentStyles[slide.accent].dotClassName}`} />
                        {slide.statusLabel}
                      </span>
                    </div>

                    {slide.visual === "founder" ? (
                      <>
                        <div className="hero-ribbon-founder-mobile-row mt-1 grid grid-cols-[minmax(0,1fr)_5.35rem] items-end gap-0.5 lg:hidden">
                          <h3 className="hero-ribbon-title max-w-none text-[clamp(1.7rem,6.2vw,2.06rem)] font-bold leading-[0.9] tracking-[-0.082em] text-slate-950 [text-wrap:balance]">
                            {renderTitleContent(slide)}
                          </h3>
                          <div className="hero-ribbon-founder-mobile-visual flex justify-end">
                            {renderSlideVisual(slide, true)}
                          </div>
                        </div>

                        <h3 className="hero-ribbon-title mt-1.5 hidden max-w-[9ch] text-[clamp(2.38rem,4.2vw,3.85rem)] font-bold leading-[0.9] tracking-[-0.078em] text-slate-950 [text-wrap:balance] lg:block">
                          {renderTitleContent(slide)}
                        </h3>
                      </>
                    ) : (
                      <>
                        {slide.imageSrc && !failedImageSrcs[slide.imageSrc] ? (
                          <div className="mt-2 lg:hidden">
                            {renderSlideVisual(slide, true)}
                          </div>
                        ) : null}
                        <h3 className="hero-ribbon-title mt-1.5 max-w-none text-[clamp(1.56rem,5.25vw,2.1rem)] font-bold leading-[0.9] tracking-[-0.078em] text-slate-950 [text-wrap:balance] lg:max-w-[9.5ch] lg:text-[clamp(2.24rem,3.9vw,3.65rem)] lg:leading-[0.9]">
                          {renderTitleContent(slide)}
                        </h3>
                      </>
                    )}

                    <p className="hero-ribbon-description mt-1 max-w-[54ch] text-[0.8rem] leading-[1.28] text-slate-600 [text-wrap:pretty] lg:text-[0.92rem] lg:leading-[1.42]">
                      {slide.description}
                    </p>

                    {renderSignalItems(slide)}

                    <p className="hero-ribbon-footnote hidden text-[0.8rem] leading-[1.1rem] text-slate-500 md:mt-2 md:block">{slide.footnote}</p>

                    <div className="hero-ribbon-actions mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                      {slide.actions.map((action) => renderSlideAction(slide, action))}
                    </div>
                  </div>

                  {slide.visual === "founder" ? (
                    <div className="hero-ribbon-visual-shell relative hidden min-h-[13.75rem] items-end justify-end lg:flex">
                      {renderSlideVisual(slide)}
                    </div>
                  ) : (
                    <div className="hero-ribbon-visual-shell relative hidden min-h-[7rem] items-end justify-center lg:flex lg:min-h-[10.75rem] lg:justify-end">
                      {renderSlideVisual(slide)}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 639px) {
          .hero-ribbon-actions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch;
          }

          .hero-ribbon-action {
            width: 100%;
            min-height: 2.4rem !important;
            padding-inline: 0.75rem !important;
            font-size: 0.8rem !important;
            text-align: center;
          }
        }

        @media (max-width: 430px) {
          .hero-ribbon-founder-mobile-row {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .hero-ribbon-founder-mobile-visual {
            display: none !important;
          }

          .hero-ribbon-actions {
            grid-template-columns: 1fr !important;
          }
        }

        .hero-ribbon-pagination-button,
        .hero-ribbon-pagination-button:hover,
        .hero-ribbon-pagination-button:active,
        .hero-ribbon-pagination-button:focus-visible {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          min-height: 0 !important;
          background-image: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-ribbon-action,
          .hero-ribbon-pagination-button {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}
