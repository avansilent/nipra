"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import type { HomeContent } from "../types/home";
import type { SiteSettings } from "../types/site";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

type HeroBannerProps = {
  content: HomeContent;
  siteSettings: SiteSettings;
};

type CarouselCard = {
  id: string;
  eyebrow: string;
  title: string;
  description: string[];
  ctaLabel: string;
  ctaHref: string;
  footer: string;
  signature?: string;
  imageSrc?: string;
  imageAlt?: string;
};

export default function HeroBanner({ content, siteSettings }: HeroBannerProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const lastWheelGestureAtRef = useRef(0);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [supportsFinePointer, setSupportsFinePointer] = useState(false);
  const [failedImageSrcs, setFailedImageSrcs] = useState<Record<string, boolean>>({});
  const { allowHoverMotion, allowRichMotion, performanceMode } = useAdaptiveMotion();
  const isLiteMotion = performanceMode === "lite";
  const isBalancedMotion = performanceMode === "balanced";
  const autoplayConfig = allowRichMotion
    ? {
        delay: isDesktopViewport ? 5200 : 4800,
        disableOnInteraction: false,
        pauseOnMouseEnter: allowHoverMotion,
      }
    : false;

  const cards: CarouselCard[] = [
    {
      id: "founder-vision",
      eyebrow: "Founder Story",
      title: "Quality education that truly makes a difference in a student's life.",
      description: [
        "At Nipracademy, our vision is simple: provide quality education that creates real change in a student's life.",
        "We built this institute to replace memorization with understanding, direction, confidence, and meaningful results.",
      ],
      ctaLabel: "About Nipracademy",
      ctaHref: "/about",
      footer: siteSettings.siteName,
      signature: "Founder, Nipracademy",
      imageSrc: "/founder.jpg.jpeg",
      imageAlt: "Founder of Nipracademy",
    },
    {
      id: "founder-philosophy",
      eyebrow: "Guidance And Growth",
      title: "Every student has potential. The right direction unlocks it.",
      description: [
        "We believe that every student has potential, but the right direction and support are essential to unlock it. At Nipracademy, we focus on building strong fundamentals, encouraging curiosity, and developing discipline.",
        "Our goal is not just to help students score good marks, but to make them capable, confident, and future-ready.",
      ],
      ctaLabel: "See Courses",
      ctaHref: "/courses",
      footer: "Strong concepts, calm guidance, real momentum",
      signature: "Understanding before memorization.",
    },
    {
      id: "founder-commitment",
      eyebrow: "Commitment To Families",
      title: "Teaching, motivation, and trust working together for every student.",
      description: [
        "A teacher's role is not only to teach subjects but also to guide, motivate, and inspire. That is why we work closely with every student, understand their challenges, and help them grow step by step.",
        "Nipracademy remains committed to honest teaching, continuous improvement, and student success, from the first inquiry to the student portal journey.",
      ],
      ctaLabel: "Start Admission",
      ctaHref: "/join",
      footer: "Student support for online and offline batches",
      signature: "A structured path for students and parents.",
    },
  ];

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const syncViewport = () => {
      setIsDesktopViewport(desktopQuery.matches);
      setSupportsFinePointer(finePointerQuery.matches);
    };

    const addListener = (query: MediaQueryList, listener: () => void) => {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", listener);
      } else {
        query.addListener(listener);
      }
    };

    const removeListener = (query: MediaQueryList, listener: () => void) => {
      if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", listener);
      } else {
        query.removeListener(listener);
      }
    };

    syncViewport();

    addListener(desktopQuery, syncViewport);
    addListener(finePointerQuery, syncViewport);

    return () => {
      removeListener(desktopQuery, syncViewport);
      removeListener(finePointerQuery, syncViewport);
    };
  }, []);

  const handleTrackpadSwipe = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!supportsFinePointer || !swiperRef.current || event.ctrlKey || event.metaKey || event.altKey) {
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

    if (horizontalDelta > 0) {
      swiperRef.current.slideNext();
      return;
    }

    swiperRef.current.slidePrev();
  };

  return (
    <section className="hero-modern-shell">
      <div className="hero-command-grid">
        <div className="hero-command-panel">
          <div className="hero-command-badges">
            <span className="hero-command-kicker">{content.heroBadge}</span>
          </div>

          <h1 className="hero-command-title">{content.heroTitle}</h1>
          <p className="hero-command-copy">{content.heroSubtitle}</p>

          <div className="hero-command-actions">
            <Link href={content.heroPrimaryCtaHref} className="hero-command-primary">
              {content.heroPrimaryCtaLabel}
            </Link>
            <Link href={content.heroSecondaryCtaHref} className="hero-command-secondary">
              {content.heroSecondaryCtaLabel}
            </Link>
          </div>

          <p className="hero-command-note">
            {siteSettings.contactPhone || "Direct counselor access"} for admissions, batches, and support.
          </p>
        </div>

        <div className="hero-story-stage group" onWheelCapture={handleTrackpadSwipe}>
          <div className="hero-stage-head">
            <div>
              <p className="hero-stage-kicker">Inside Nipra</p>
              <h2 className="hero-stage-title">A calmer look inside the learning experience.</h2>
            </div>

            <div className="hero-stage-nav">
              <button
                type="button"
                aria-label="Previous slide"
                className="hero-swiper-prev hero-swiper-arrow inline-flex"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.05rem] w-[1.05rem] stroke-current">
                  <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Next slide"
                className="hero-swiper-next hero-swiper-arrow inline-flex"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.05rem] w-[1.05rem] stroke-current">
                  <path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="hero-swiper-shell">
            <Swiper
              modules={[Autoplay, Navigation, Pagination]}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              autoHeight={false}
              spaceBetween={18}
              slidesPerView={1}
              speed={isLiteMotion ? 400 : isBalancedMotion ? 500 : isDesktopViewport ? 560 : 460}
              allowTouchMove={true}
              simulateTouch={true}
              touchStartPreventDefault={false}
              touchReleaseOnEdges={true}
              threshold={isLiteMotion ? 10 : isDesktopViewport ? 12 : 8}
              resistance={true}
              resistanceRatio={isLiteMotion ? 0.4 : isBalancedMotion ? 0.48 : isDesktopViewport ? 0.54 : 0.48}
              longSwipes={true}
              longSwipesRatio={isDesktopViewport ? 0.28 : 0.22}
              longSwipesMs={isLiteMotion ? 260 : isDesktopViewport ? 320 : 240}
              shortSwipes={true}
              slidesPerGroup={1}
              centeredSlides={false}
              followFinger={true}
              grabCursor={supportsFinePointer && allowHoverMotion}
              navigation={{
                prevEl: ".hero-swiper-prev",
                nextEl: ".hero-swiper-next",
              }}
              pagination={{
                clickable: true,
                el: ".hero-swiper-pagination",
              }}
              autoplay={autoplayConfig}
              breakpoints={{
                640: {
                  slidesPerView: 1,
                  spaceBetween: 18,
                },
                768: {
                  slidesPerView: 1,
                  spaceBetween: 22,
                },
                1024: {
                  slidesPerView: 1,
                  spaceBetween: 24,
                },
                1440: {
                  slidesPerView: 1,
                  spaceBetween: 28,
                },
              }}
              className="hero-swiper"
            >
              {cards.map((card, index) => (
                <SwiperSlide key={card.id} className="hero-story-slide h-auto pb-2">
                  <article className="hero-story-card">
                    <div className="hero-story-meta">
                      <span className="hero-story-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="hero-story-eyebrow">{card.eyebrow}</span>
                    </div>

                    <div className="hero-story-layout">
                      <div className="hero-story-thumb-shell relative overflow-hidden">
                        {!failedImageSrcs[card.imageSrc ?? ""] && card.imageSrc ? (
                          <Image
                            key={card.imageSrc}
                            src={card.imageSrc}
                            alt={card.imageAlt ?? card.title}
                            fill
                            sizes="(min-width: 1024px) 196px, (min-width: 640px) 184px, 100vw"
                            className="object-cover object-center"
                            priority={index === 0}
                            onError={() => {
                              setFailedImageSrcs((current) => ({
                                ...current,
                                [card.imageSrc ?? ""]: true,
                              }));
                            }}
                          />
                        ) : (
                          <div className="hero-founder-fallback flex h-full w-full flex-col items-center justify-center px-5 text-center">
                            <div className="hero-founder-mark flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold tracking-[-0.04em] text-white">
                              N
                            </div>
                            <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                              Founder Story
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Clear guidance, structured learning, and a calmer student journey.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="hero-story-copy-block">
                        <h3 className="hero-story-title">{card.title}</h3>

                        <div className="hero-story-stack">
                          {card.description.map((paragraph) => (
                            <p key={paragraph} className="hero-story-paragraph">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="hero-story-footer">
                      <div className="hero-story-signoff">
                        <p className="hero-story-signature">
                          {card.signature ?? "A premium academic journey with clarity and guidance."}
                        </p>
                        <p className="hero-story-footer-note">{card.footer}</p>
                      </div>

                      <Link
                        href={card.ctaHref}
                        className="hero-story-cta inline-flex shrink-0 items-center justify-center rounded-full px-7 py-3.5 text-[0.98rem] font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5"
                      >
                        {card.ctaLabel}
                      </Link>
                    </div>
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="hero-swiper-pagination flex items-center justify-center" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .hero-modern-shell {
          position: relative;
          overflow: hidden;
          border-radius: 2.8rem;
          padding: clamp(1.1rem, 2vw, 1.6rem);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(246, 246, 247, 0.92));
          border: 1px solid rgba(15, 23, 42, 0.03);
          box-shadow: 0 28px 72px rgba(15, 23, 42, 0.05);
          isolation: isolate;
        }

        .hero-command-grid {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 1.2rem;
          align-items: stretch;
        }

        .hero-command-panel {
          position: relative;
          overflow: hidden;
          border-radius: 2.5rem;
          padding: clamp(1.6rem, 3vw, 2.5rem);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 244, 246, 0.94));
          border: 1px solid rgba(15, 23, 42, 0.035);
          color: #0f172a;
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.045);
        }

        .hero-command-badges,
        .hero-command-title,
        .hero-command-copy,
        .hero-command-actions,
        .hero-command-note {
          position: relative;
          z-index: 1;
        }

        .hero-command-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .hero-command-kicker {
          display: inline-flex;
          min-height: 2.2rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 0.95rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .hero-command-kicker {
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(15, 23, 42, 0.05);
          color: #52525b;
        }

        .hero-command-title {
          margin-top: 1.4rem;
          max-width: 13ch;
          font-size: clamp(2.7rem, 6vw, 5rem);
          font-weight: 700;
          line-height: 0.98;
          letter-spacing: -0.06em;
          text-wrap: balance;
        }

        .hero-command-copy {
          margin-top: 1.4rem;
          max-width: 52ch;
          font-size: clamp(1rem, 1.6vw, 1.08rem);
          line-height: 1.78;
          color: #52525b;
        }

        .hero-command-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          margin-top: 2rem;
        }

        .hero-command-primary,
        .hero-command-secondary {
          display: inline-flex;
          min-height: 3.2rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 1.35rem;
          font-size: 0.96rem;
          font-weight: 600;
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, color 180ms ease;
        }

        .hero-command-primary {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 242, 244, 0.96));
          border: 1px solid rgba(15, 23, 42, 0.06);
          color: #111827;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        }

        .hero-command-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 46px rgba(15, 23, 42, 0.1);
        }

        .hero-command-secondary {
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(15, 23, 42, 0.05);
          color: #475569;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(12px);
        }

        .hero-command-secondary:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.92);
        }

        .hero-command-note {
          margin-top: 1.1rem;
          max-width: 36ch;
          font-size: 0.92rem;
          line-height: 1.7;
          color: #71717a;
        }

        .hero-story-stage {
          position: relative;
          min-width: 0;
          overflow: hidden;
          border-radius: 2.5rem;
          border: 1px solid rgba(15, 23, 42, 0.03);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 247, 248, 0.95));
          padding: 1.25rem;
          box-shadow: 0 20px 52px rgba(15, 23, 42, 0.045);
        }

        .hero-stage-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .hero-stage-kicker {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #6b7280;
        }

        .hero-stage-title {
          margin-top: 0.55rem;
          max-width: 19ch;
          font-size: clamp(1.5rem, 2.8vw, 2.2rem);
          font-weight: 700;
          line-height: 1.06;
          letter-spacing: -0.045em;
          color: #08111f;
          text-wrap: balance;
        }

        .hero-stage-nav {
          display: flex;
          gap: 0.55rem;
        }

        .hero-swiper-shell,
        .hero-swiper {
          min-width: 0;
        }

        .hero-swiper {
          overflow: hidden;
        }

        .hero-swiper .swiper-wrapper {
          align-items: stretch;
          transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }

        .hero-swiper-arrow {
          height: 2.75rem;
          width: 2.75rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.06);
          background: rgba(255, 255, 255, 0.88);
          color: #111827;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
          transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }

        .hero-swiper-arrow:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 16px 28px rgba(15, 23, 42, 0.08);
        }

        .hero-swiper-prev::after,
        .hero-swiper-next::after {
          display: none;
        }

        .hero-story-slide {
          display: flex;
          height: auto;
        }

        .hero-story-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: clamp(26rem, 34vw, 29rem);
          overflow: hidden;
          border-radius: 2.15rem;
          border: 1px solid rgba(15, 23, 42, 0.03);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: none;
          padding: clamp(1.1rem, 2vw, 1.45rem);
          transition: transform 220ms ease-out, box-shadow 220ms ease-out, border-color 220ms ease-out;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .hero-story-card:hover {
          transform: translateY(-1px);
          border-color: rgba(15, 23, 42, 0.05);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
        }

        .hero-story-meta {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }

        .hero-story-index {
          display: inline-flex;
          min-width: 2.4rem;
          justify-content: center;
          border-radius: 999px;
          background: rgba(241, 245, 249, 0.92);
          padding: 0.45rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #475569;
        }

        .hero-story-eyebrow {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #6b7280;
        }

        .hero-story-layout {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 1.1rem;
          margin-top: 1.25rem;
        }

        .hero-story-thumb-shell {
          min-height: 12.5rem;
          border-radius: 1.45rem;
          border: 1px solid rgba(15, 23, 42, 0.03);
          background: linear-gradient(180deg, rgba(248, 248, 249, 1), rgba(244, 245, 246, 0.94));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .hero-story-copy-block {
          display: flex;
          min-width: 0;
          overflow: hidden;
          flex-direction: column;
        }

        .hero-story-title {
          max-width: 16ch;
          font-size: clamp(1.65rem, 3vw, 2.65rem);
          font-weight: 700;
          line-height: 1.04;
          letter-spacing: -0.045em;
          color: #08111f;
          text-wrap: balance;
        }

        .hero-story-stack {
          display: grid;
          gap: 0.9rem;
          margin-top: 1rem;
        }

        .hero-story-paragraph {
          max-width: 40ch;
          font-size: 1rem;
          line-height: 1.72;
          color: #4b5563;
        }

        .hero-founder-fallback {
          background: linear-gradient(180deg, rgba(249, 249, 250, 0.98), rgba(236, 236, 239, 0.9));
        }

        .hero-founder-mark {
          background: linear-gradient(180deg, #ffffff, #eceff3);
          color: #0f172a;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
        }

        .hero-story-footer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1.35rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
        }

        .hero-story-signoff {
          min-width: 0;
        }

        .hero-story-signature {
          font-size: 0.98rem;
          font-weight: 600;
          line-height: 1.6;
          color: #08111f;
        }

        .hero-story-footer-note {
          margin-top: 0.3rem;
          font-size: 0.84rem;
          line-height: 1.6;
          color: #6b7280;
        }

        .hero-story-cta {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 242, 244, 0.96));
          color: #111827;
          border: 1px solid rgba(15, 23, 42, 0.06);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
        }

        .hero-story-cta:hover {
          background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(238, 238, 241, 0.98));
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.1);
        }

        .hero-swiper-pagination .swiper-pagination-bullet {
          width: 0.55rem;
          height: 0.55rem;
          background: rgba(107, 114, 128, 0.42);
          opacity: 1;
          transition: all 180ms ease-out;
        }

        .hero-swiper-pagination .swiper-pagination-bullet-active {
          width: 1.85rem;
          border-radius: 999px;
          background: #cbd5e1;
        }

        @media (min-width: 640px) {
          .hero-story-layout {
            display: grid;
            grid-template-columns: 11rem minmax(0, 1fr);
            align-items: start;
          }

          .hero-story-footer {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
          }
        }

        @media (min-width: 1180px) {
          .hero-command-grid {
            grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
          }
        }

        @media (min-width: 768px) and (max-width: 1179px) {
          .hero-command-title,
          .hero-command-copy,
          .hero-command-note,
          .hero-stage-title {
            max-width: 100%;
          }

          .hero-story-card {
            min-height: unset;
          }
        }

        @media (min-width: 1440px) {
          .hero-command-grid {
            gap: 1rem;
            grid-template-columns: minmax(0, 0.96fr) minmax(0, 1.04fr);
          }

          .hero-story-stage {
            padding: 1rem;
          }

          .hero-stage-title {
            max-width: 17ch;
            font-size: clamp(1.45rem, 2vw, 2rem);
          }

          .hero-story-layout {
            grid-template-columns: 10rem minmax(0, 1fr);
            gap: 0.95rem;
          }

          .hero-story-thumb-shell {
            min-height: 11rem;
          }

          .hero-story-title {
            max-width: 16ch;
            font-size: clamp(1.5rem, 2.2vw, 2.25rem);
          }
        }

        html[data-performance-mode="balanced"] .hero-modern-shell,
        html[data-performance-mode="balanced"] .hero-story-stage,
        html[data-performance-mode="balanced"] .hero-story-card {
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.04);
        }

        html[data-performance-mode="lite"] .hero-modern-shell,
        html[data-performance-mode="lite"] .hero-command-panel,
        html[data-performance-mode="lite"] .hero-story-stage,
        html[data-performance-mode="lite"] .hero-story-card,
        html[data-performance-mode="lite"] .hero-swiper-arrow {
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.035);
        }

        @media (max-width: 767px) {
          .hero-command-actions,
          .hero-story-footer {
            align-items: stretch;
          }

          .hero-command-actions > a,
          .hero-story-cta {
            width: 100%;
          }

          .hero-stage-head {
            flex-direction: column;
          }

          .hero-stage-nav {
            align-self: flex-start;
          }

          .hero-story-layout {
            gap: 1rem;
          }
        }

        @media (max-width: 639px) {
          .hero-modern-shell,
          .hero-command-panel,
          .hero-story-stage {
            border-radius: 1.55rem;
          }

          .hero-command-title {
            max-width: 11ch;
            font-size: clamp(2.15rem, 12vw, 3rem);
            letter-spacing: -0.04em;
          }

          .hero-stage-title,
          .hero-story-title {
            max-width: 100%;
          }

          .hero-story-title {
            font-size: clamp(1.4rem, 8vw, 2rem);
          }

          .hero-command-actions {
            flex-direction: column;
          }

          .hero-command-primary,
          .hero-command-secondary,
          .hero-story-cta {
            width: 100%;
          }

          .hero-swiper-arrow {
            height: 2.45rem;
            width: 2.45rem;
          }

          .hero-story-card {
            min-height: unset;
          }

          .hero-story-thumb-shell {
            min-height: 11.25rem;
          }

          .hero-story-meta {
            flex-wrap: wrap;
          }

          .hero-story-footer-note,
          .hero-story-signature,
          .hero-story-paragraph,
          .hero-command-copy,
          .hero-command-note {
            max-width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
