"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
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
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [failedImageSrcs, setFailedImageSrcs] = useState<Record<string, boolean>>({});

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
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncViewport = () => {
      setIsDesktopViewport(mediaQuery.matches);
    };

    syncViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
    } else {
      mediaQuery.addListener(syncViewport);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", syncViewport);
      } else {
        mediaQuery.removeListener(syncViewport);
      }
    };
  }, []);

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
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-[1.02rem]">
            Strong concepts, personal mentorship, disciplined learning, and a clear next step for families who want both academic progress and structure.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="hero-top-pill">Founder-led academic direction</span>
            <span className="hero-top-pill">Full course details inside Courses</span>
            <span className="hero-top-pill">Admissions for online and offline batches</span>
          </div>
        </div>
      </div>

      <div className="hero-carousel-group group relative">
        <div className="hero-swiper-shell relative px-[0.15rem] sm:px-[2.5rem] md:px-[4rem] lg:px-[5.25rem]">
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
            modules={[Autoplay, Navigation, Pagination]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            autoHeight={false}
            spaceBetween={18}
            slidesPerView={1}
            speed={isDesktopViewport ? 680 : 520}
            allowTouchMove={true}
            simulateTouch={true}
            touchStartPreventDefault={false}
            touchReleaseOnEdges={true}
            threshold={isDesktopViewport ? 12 : 8}
            resistance={true}
            resistanceRatio={isDesktopViewport ? 0.54 : 0.48}
            longSwipes={true}
            longSwipesRatio={isDesktopViewport ? 0.28 : 0.22}
            longSwipesMs={isDesktopViewport ? 320 : 240}
            shortSwipes={true}
            slidesPerGroup={1}
            centeredSlides={false}
            followFinger={true}
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
              delay: isDesktopViewport ? 5600 : 5000,
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
                <article className="hero-story-card relative flex h-full min-h-[45rem] w-full flex-col overflow-hidden rounded-[2rem] p-6 sm:min-h-[39rem] sm:p-10 lg:min-h-[35rem] lg:p-14 xl:min-h-[35rem] xl:px-20 xl:py-16">
                  <div className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.10),rgba(148,163,184,0))]" />
                  <div className="hero-story-content relative flex h-full flex-1 flex-col">
                    {card.imageSrc ? (
                      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <div className="mb-5 flex justify-center">
                          <div className="hero-founder-frame relative h-[12.5rem] w-[10rem] overflow-hidden rounded-[1.75rem] sm:h-[14rem] sm:w-[11rem] lg:h-[15rem] lg:w-[11.75rem] xl:h-[16rem] xl:w-[12.5rem]">
                            {!failedImageSrcs[card.imageSrc] ? (
                              <Image
                                key={card.imageSrc}
                                src={card.imageSrc}
                                alt={card.imageAlt ?? card.title}
                                fill
                                sizes="(min-width: 1280px) 200px, (min-width: 1024px) 188px, (min-width: 640px) 176px, 160px"
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
                              <div className="hero-founder-fallback flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(226,232,240,0.9))] px-5 text-center">
                                <div className="hero-founder-mark flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold tracking-[-0.04em] text-white">
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

                        <div className="mt-6 w-full max-w-[46rem] space-y-4">
                          {card.description.map((paragraph) => (
                            <p key={paragraph} className="mx-auto max-w-[46ch] break-words text-[1rem] leading-8 text-slate-600 sm:text-[1.04rem] lg:max-w-[48ch] lg:text-[1.1rem] lg:leading-8 xl:max-w-[50ch]">
                              {paragraph}
                            </p>
                          ))}
                        </div>

                        <div className="mt-8 flex w-full flex-col items-center gap-4 text-center">
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
                            className="hero-story-cta inline-flex shrink-0 items-center justify-center rounded-full px-7 py-3.5 text-[0.98rem] font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5"
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
                              className="hero-story-cta inline-flex shrink-0 items-center justify-center self-start rounded-full px-7 py-3.5 text-[0.98rem] font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5 sm:self-auto"
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
          align-items: stretch;
          transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }

        .hero-story-card {
          height: 100%;
          border: 1px solid rgba(223, 215, 204, 0.62);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(250, 247, 242, 0.9));
          box-shadow: 0 16px 40px rgba(33, 28, 22, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.82);
          transition: transform 220ms ease-out, box-shadow 220ms ease-out, border-color 220ms ease-out;
          will-change: transform;
        }

        .hero-story-slide {
          display: flex;
          height: auto;
        }

        .hero-story-content {
          width: min(100%, calc(100% - 1.25rem));
          margin: 0 auto;
        }

        .hero-story-card:hover {
          border-color: rgba(200, 189, 175, 0.74);
          box-shadow: 0 18px 46px rgba(33, 28, 22, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88);
          transform: translateY(-1px);
        }

        .hero-story-panel {
          border: 1px solid rgba(255, 255, 255, 0.46);
          background: linear-gradient(180deg, rgba(250, 250, 250, 0.72), rgba(248, 250, 252, 0.42));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.56);
        }

        .hero-founder-frame {
          border: 1px solid rgba(221, 213, 202, 0.72);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(244, 238, 230, 0.8));
          box-shadow: 0 16px 38px rgba(33, 28, 22, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.74);
          flex-shrink: 0;
        }

        .hero-founder-fallback {
          border: 1px solid rgba(223, 215, 204, 0.58);
        }

        .hero-founder-mark {
          background: linear-gradient(180deg, rgb(109, 101, 91), rgb(137, 129, 118));
          box-shadow: 0 16px 30px rgba(88, 78, 68, 0.2);
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
          border: 1px solid rgba(228, 220, 209, 0.9);
          background: rgba(255, 255, 255, 0.96);
          color: rgb(52, 52, 56);
          box-shadow: 0 12px 28px rgba(33, 28, 22, 0.08);
          opacity: 0.92;
          transform: translateY(-50%);
          transition: transform 180ms ease-out, opacity 180ms ease-out, background 180ms ease-out, box-shadow 180ms ease-out;
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
          box-shadow: 0 16px 34px rgba(33, 28, 22, 0.1);
          transform: translateY(-50%);
        }

        .hero-swiper-arrow:hover {
          background: rgba(255, 255, 255, 1);
        }

        .hero-swiper {
          overflow: visible;
        }

        .hero-carousel-group {
          cursor: default;
        }

        .hero-carousel-group a,
        .hero-carousel-group button {
          cursor: pointer !important;
        }

        .hero-swiper-prev::after,
        .hero-swiper-next::after {
          display: none;
        }

        .hero-story-cta {
          background: linear-gradient(180deg, rgb(106, 98, 88), rgb(134, 125, 114));
          box-shadow: 0 12px 24px rgba(88, 78, 68, 0.14);
        }

        .hero-story-cta:hover {
          background: linear-gradient(180deg, rgb(118, 109, 99), rgb(147, 137, 126));
          box-shadow: 0 14px 28px rgba(88, 78, 68, 0.18);
        }

        .hero-swiper-pagination .swiper-pagination-bullet {
          width: 0.5rem;
          height: 0.5rem;
          background: rgba(169, 158, 142, 0.55);
          opacity: 1;
          transition: all 180ms ease-out;
        }

        .hero-swiper-pagination .swiper-pagination-bullet-active {
          width: 1.8rem;
          border-radius: 999px;
          background: rgb(116, 107, 96);
        }

        @media (max-width: 639px) {
          .hero-swiper-arrow {
            display: none !important;
          }

          .hero-story-content {
            width: 100%;
          }

          .hero-story-card {
            min-height: 45rem;
          }
        }
      `}</style>
    </section>
  );
}
