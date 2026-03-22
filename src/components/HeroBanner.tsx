"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Mousewheel, Navigation, Pagination } from "swiper/modules";
import type { HomeContent } from "../types/home";
import type { SiteSettings } from "../types/site";
import "swiper/css";
import "swiper/css/free-mode";
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
  const wheelIntentRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [failedImageSrcs, setFailedImageSrcs] = useState<Record<string, boolean>>({});

  const cards: CarouselCard[] = [
    {
      id: "founder-vision",
      eyebrow: "Founder's Vision",
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
      ctaLabel: "Explore Programs",
      ctaHref: "/#programs",
      footer: "Meaningful, practical, result-oriented",
      signature: "Strong concepts. Real confidence.",
    },
    {
      id: "founder-commitment",
      eyebrow: "Commitment To Families",
      title: "Teaching, guidance, motivation, and trust working together.",
      description: [
        "I personally believe that a teacher's role is not only to teach subjects but also to guide, motivate, and inspire. That is why we work closely with every student, understand their challenges, and help them grow step by step.",
        "To all students and parents, I assure you that Nipracademy will always remain committed to honest teaching, continuous improvement, and student success. Let us work together to build a strong future.",
      ],
      ctaLabel: "Read More",
      ctaHref: "/about",
      footer: "Honest teaching and student success",
      signature: "Let us work together to build a strong future.",
    },
  ];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncViewport = () => {
      setIsDesktopViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
    };
  }, []);

  const handleTrackpadWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const swiper = swiperRef.current;

    if (!swiper) {
      return;
    }

    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;

    const minimumDelta = isDesktopViewport ? 12 : 8;
    const slideIntentThreshold = isDesktopViewport ? 88 : 56;
    const resetDelay = isDesktopViewport ? 300 : 220;

    if (Math.abs(dominantDelta) < minimumDelta) {
      return;
    }

    event.preventDefault();
    wheelIntentRef.current += dominantDelta;

    if (wheelResetTimerRef.current !== null) {
      window.clearTimeout(wheelResetTimerRef.current);
    }

    if (Math.abs(wheelIntentRef.current) >= slideIntentThreshold) {
      if (wheelIntentRef.current > 0) {
        swiper.slideNext();
      } else {
        swiper.slidePrev();
      }

      wheelIntentRef.current = 0;
    }

    wheelResetTimerRef.current = window.setTimeout(() => {
      wheelIntentRef.current = 0;
      wheelResetTimerRef.current = null;
    }, resetDelay);
  };

  return (
    <section className="relative overflow-visible rounded-[2rem] bg-transparent">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Founder Story
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.065em] text-slate-950 sm:text-4xl lg:text-[3.6rem]">
            A calmer, premium introduction to Nipracademy's vision, philosophy, and promise.
          </h1>
        </div>
      </div>

      <div className="hero-carousel-group group relative" onWheelCapture={handleTrackpadWheel}>
        <div className="hero-swiper-shell relative px-[2.75rem] sm:px-[3.25rem] md:px-[4.5rem] lg:px-[5.25rem]">
          <button
            type="button"
            aria-label="Previous slide"
            className="hero-swiper-prev hero-swiper-arrow hero-swiper-arrow-left inline-flex"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.05rem] w-[1.05rem] stroke-current">
              <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Next slide"
            className="hero-swiper-next hero-swiper-arrow hero-swiper-arrow-right inline-flex"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.05rem] w-[1.05rem] stroke-current">
              <path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <Swiper
            modules={[Autoplay, Mousewheel, Navigation, Pagination]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            spaceBetween={18}
            slidesPerView={1}
            speed={isDesktopViewport ? 1300 : 900}
            allowTouchMove={true}
            simulateTouch={true}
            touchStartPreventDefault={false}
            touchReleaseOnEdges={true}
            threshold={isDesktopViewport ? 16 : 10}
            resistance={true}
            resistanceRatio={isDesktopViewport ? 0.68 : 0.72}
            longSwipes={true}
            longSwipesRatio={isDesktopViewport ? 0.4 : 0.32}
            longSwipesMs={isDesktopViewport ? 700 : 520}
            shortSwipes={true}
            slidesPerGroup={1}
            centeredSlides={false}
            followFinger={true}
            mousewheel={{
              enabled: true,
              forceToAxis: true,
              sensitivity: isDesktopViewport ? 0.24 : 0.42,
              thresholdDelta: isDesktopViewport ? 42 : 24,
              thresholdTime: isDesktopViewport ? 320 : 220,
              releaseOnEdges: true,
            }}
            grabCursor={false}
            navigation={{
              prevEl: ".hero-swiper-prev",
              nextEl: ".hero-swiper-next",
            }}
            pagination={{
              clickable: true,
              el: ".hero-swiper-pagination",
            }}
            autoplay={{
              delay: isDesktopViewport ? 6200 : 5600,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
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
            className="hero-swiper px-1 py-1 md:px-0"
          >
            {cards.map((card, index) => (
              <SwiperSlide key={card.id} className="hero-story-slide h-auto pb-2">
                <article className="hero-story-card relative flex h-[34rem] w-full flex-col overflow-hidden rounded-[2rem] p-8 sm:h-[34.5rem] sm:p-10 lg:h-[34rem] lg:p-14 xl:h-[35rem] xl:px-20 xl:py-16">
                  <div className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.10),rgba(148,163,184,0))]" />
                  <div className="hero-story-content relative flex h-full flex-1 flex-col">
                    {card.imageSrc ? (
                      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <div className={`${index === 0 ? "mb-4" : "mb-5"} flex justify-center`}>
                          <div className="hero-founder-frame relative h-[12.5rem] w-[10rem] overflow-hidden rounded-[1.75rem] sm:h-[14rem] sm:w-[11rem] lg:h-[15rem] lg:w-[11.75rem] xl:h-[16rem] xl:w-[12.5rem]">
                            {!failedImageSrcs[card.imageSrc] ? (
                              <Image
                                key={card.imageSrc}
                                src={card.imageSrc}
                                alt={card.imageAlt ?? card.title}
                                fill
                                sizes="(min-width: 1280px) 200px, (min-width: 1024px) 188px, (min-width: 640px) 176px, 160px"
                                className="object-cover object-center"
                                priority
                                unoptimized
                                onError={() => {
                                  setFailedImageSrcs((current) => ({
                                    ...current,
                                    [card.imageSrc ?? ""]: true,
                                  }));
                                }}
                              />
                            ) : (
                              <div className="hero-founder-fallback flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(226,232,240,0.9))] px-5 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-xl font-semibold tracking-[-0.04em] text-white">
                                  N
                                </div>
                                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Founder
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  Add `public/founder.jpg.jpeg` to show the portrait here.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className={`${index === 0 ? "mb-3" : "mb-4"} text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-400`}>
                          {card.eyebrow}
                        </p>

                        <h2 className="mx-auto max-w-[17ch] text-[2rem] font-semibold leading-[1.02] tracking-[-0.06em] text-slate-950 sm:text-[2.35rem] lg:max-w-[16ch] lg:text-[3rem] xl:text-[3.2rem]">
                          {card.title}
                        </h2>

                        <div className={`${index === 0 ? "mt-5 space-y-3" : "mt-6 space-y-4"} w-full max-w-[46rem]`}>
                          {card.description.map((paragraph) => (
                            <p key={paragraph} className="mx-auto max-w-[46ch] break-words text-[1rem] leading-8 text-slate-600 sm:text-[1.04rem] lg:max-w-[48ch] lg:text-[1.1rem] lg:leading-8 xl:max-w-[50ch]">
                              {paragraph}
                            </p>
                          ))}
                        </div>

                        <div className={`${index === 0 ? "mt-6 gap-3" : "mt-8 gap-4"} flex w-full flex-col items-center text-center`}>
                          <div className="inline-flex rounded-full bg-slate-100/85 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {card.footer}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="mx-auto max-w-[34ch] break-words text-[1rem] font-medium leading-7 text-slate-600 lg:max-w-[36ch]">
                              {card.signature ?? "A premium academic journey with clarity and guidance."}
                            </p>
                          </div>

                          <Link
                            href={card.ctaHref}
                            className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-[0.98rem] font-semibold text-white transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-800"
                          >
                            {card.ctaLabel}
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-9 text-left lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 xl:gap-20">
                        <div className="min-w-0 lg:pr-8 xl:pr-12">
                          <p className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {card.eyebrow}
                          </p>
                          <h2 className="max-w-[14ch] text-[2.15rem] font-semibold leading-[0.98] tracking-[-0.065em] text-slate-950 sm:max-w-[15ch] sm:text-[2.55rem] lg:max-w-[12ch] lg:text-[3.7rem] xl:text-[4rem]">
                            {card.title}
                          </h2>
                        </div>

                        <div className="min-w-0 lg:pl-6 xl:pl-10">
                          <div className="space-y-6">
                            {card.description.map((paragraph) => (
                              <p key={paragraph} className="max-w-none break-words pr-1 text-[1.04rem] leading-8 text-slate-600 sm:pr-2 sm:text-[1.06rem] lg:pr-4 lg:text-[1.16rem] lg:leading-9 xl:pr-6 xl:text-[1.2rem] xl:leading-9">
                                {paragraph}
                              </p>
                            ))}
                          </div>

                          <div className="mt-12 flex flex-col gap-6 pt-5 pr-1 sm:pr-2 sm:flex-row sm:items-end sm:justify-between lg:pr-4 xl:pr-6">
                            <div className="min-w-0 space-y-1">
                              <div className="mb-3 inline-flex rounded-full bg-slate-100/85 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {card.footer}
                              </div>
                              <p className="max-w-[36ch] break-words text-[1rem] font-medium leading-7 text-slate-600 lg:max-w-[38ch] xl:max-w-[40ch]">
                                {card.signature ?? "A premium academic journey with clarity and guidance."}
                              </p>
                            </div>

                            <Link
                              href={card.ctaHref}
                              className="inline-flex shrink-0 items-center justify-center self-start rounded-full bg-slate-950 px-7 py-3.5 text-[0.98rem] font-semibold text-white transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-800 sm:self-auto"
                            >
                              {card.ctaLabel}
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div className="hero-swiper-pagination flex items-center justify-center" />
      </div>

      <style jsx global>{`
        .hero-swiper .swiper-wrapper {
          transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }

        .hero-story-card {
          border: 1px solid rgba(226, 232, 240, 0.34);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 250, 252, 0.94));
          box-shadow: 0 18px 52px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.7);
          transition: transform 500ms ease-out, box-shadow 500ms ease-out, border-color 500ms ease-out;
        }

        .hero-story-slide {
          display: flex;
        }

        .hero-story-content {
          width: min(100%, calc(100% - 2.25rem));
          margin: 0 auto;
        }

        .hero-story-card:hover {
          border-color: rgba(226, 232, 240, 0.42);
          box-shadow: 0 24px 68px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.78);
          transform: translateY(-1px);
        }

        .hero-story-panel {
          border: 1px solid rgba(255, 255, 255, 0.46);
          background: linear-gradient(180deg, rgba(250, 250, 250, 0.72), rgba(248, 250, 252, 0.42));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.56);
        }

        .hero-founder-frame {
          border: 1px solid rgba(226, 232, 240, 0.6);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(241, 245, 249, 0.72));
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.68);
          flex-shrink: 0;
        }

        .hero-founder-fallback {
          border: 1px solid rgba(226, 232, 240, 0.54);
        }

        .hero-swiper-shell {
          position: relative;
          margin: 0 auto;
          max-width: 92rem;
        }

        .hero-swiper-arrow {
          pointer-events: auto;
          position: absolute;
          top: 50%;
          z-index: 20;
          height: 2.6rem;
          width: 2.6rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.56);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.22));
          color: rgb(51, 65, 85);
          box-shadow: 0 22px 44px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          opacity: 0.82;
          transform: translateY(-50%);
          transition: transform 500ms ease-out, opacity 500ms ease-out, background 500ms ease-out, box-shadow 500ms ease-out;
        }

        .hero-swiper-arrow-left {
          left: 0.35rem;
        }

        .hero-swiper-arrow-right {
          right: 0.35rem;
        }

        @media (min-width: 768px) {
          .hero-story-content {
            width: min(100%, calc(100% - 3.5rem));
          }

          .hero-swiper-arrow {
            height: 3.1rem;
            width: 3.1rem;
          }

          .hero-swiper-arrow-left {
            left: 0.75rem;
          }

          .hero-swiper-arrow-right {
            right: 0.75rem;
          }
        }

        @media (min-width: 1024px) {
          .hero-story-content {
            width: min(100%, calc(100% - 6rem));
          }
        }

        @media (min-width: 1440px) {
          .hero-story-content {
            width: min(100%, calc(100% - 8rem));
          }
        }

        .hero-carousel-group:hover .hero-swiper-prev,
        .hero-carousel-group:hover .hero-swiper-next,
        .hero-carousel-group:focus-within .hero-swiper-prev,
        .hero-carousel-group:focus-within .hero-swiper-next {
          opacity: 0.94;
        }

        .hero-carousel-group:hover .hero-swiper-arrow,
        .hero-carousel-group:focus-within .hero-swiper-arrow {
          opacity: 1;
          box-shadow: 0 26px 50px rgba(15, 23, 42, 0.15);
          transform: translateY(-50%) scale(1.04);
        }

        .hero-swiper-arrow:hover {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.34));
        }

        .hero-swiper {
          overflow: visible;
        }

        .hero-carousel-group,
        .hero-carousel-group *,
        .hero-carousel-group a,
        .hero-carousel-group button {
          cursor: default !important;
        }

        .hero-swiper-prev::after,
        .hero-swiper-next::after {
          display: none;
        }

        .hero-swiper-pagination .swiper-pagination-bullet {
          width: 0.5rem;
          height: 0.5rem;
          background: rgba(148, 163, 184, 0.48);
          opacity: 1;
          transition: all 500ms ease-out;
        }

        .hero-swiper-pagination .swiper-pagination-bullet-active {
          width: 1.8rem;
          border-radius: 999px;
          background: rgb(15, 23, 42);
        }
      `}</style>
    </section>
  );
}
