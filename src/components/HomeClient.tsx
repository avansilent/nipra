"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import HeroBanner from "./HeroBanner";
import type { HomeContent } from "../types/home";
import type { SiteSettings } from "../types/site";
import {
  buttonHover,
  createStaggerContainer,
  hoverLift,
  itemReveal,
  sectionReveal,
  tapPress,
  viewportOnce,
} from "../lib/motion";

const sectionContainer = createStaggerContainer(0.1, 0.04);
const cardGrid = createStaggerContainer(0.08, 0.02);

const trustStats = [
  { label: "Students Enrolled", value: "25,000+" },
  { label: "Selections", value: "3,200+" },
  { label: "Years Experience", value: "12+" },
  { label: "Success Rate", value: "93%" },
];

type HomeClientProps = {
  content: HomeContent;
  siteSettings: SiteSettings;
};

export default function HomeClient({ content, siteSettings }: HomeClientProps) {
  const whatsappNumber = useMemo(() => siteSettings.contactPhone.replace(/\D/g, ""), [siteSettings.contactPhone]);
  const phoneDialUrl = useMemo(() => `tel:${siteSettings.contactPhone.replace(/\s+/g, "")}`, [siteSettings.contactPhone]);
  const resolveProgramHref = (href: string) => href;

  return (
    <div className="home-shell w-full">
      <section className="mobile-home-shell px-6 py-28">
        <div className="mobile-home-stack mx-auto w-full max-w-6xl space-y-16">
          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-block"
          >
            <HeroBanner content={content} siteSettings={siteSettings} />
          </motion.section>

          <motion.section
            id="programs"
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-block"
          >
            <motion.div variants={sectionContainer} className="program-section">
              <motion.h2 variants={itemReveal} className="program-heading text-center">
                {content.programsHeading}
              </motion.h2>

              <motion.p variants={itemReveal} className="program-description mx-auto text-center">
                {content.programsDescription}
              </motion.p>

              <motion.div variants={cardGrid} className="program-grid">
                {content.programs.map((program) => (
                  <motion.div key={program.id} variants={itemReveal} whileHover={hoverLift} className="program-card">
                    <div className="program-title">{program.title}</div>
                    <div className="program-subtitle">{program.subtitle}</div>
                    <div className="program-subgrid">
                      {program.chips.map((chip) => (
                        <div key={chip} className="program-chip">
                          {chip}
                        </div>
                      ))}
                    </div>
                    <Link href={resolveProgramHref(program.ctaHref)} className="program-cta">
                      {program.ctaLabel}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={itemReveal} className="academy-note-banner mt-8">
                <div>
                  <p className="academy-note-title">Full course details are inside Courses</p>
                  <p className="academy-note-copy">See the full fee structure, class-wise subjects, admission fees, and stream-specific details on the Courses page.</p>
                </div>
                <Link href="/courses" className="btn academy-note-cta rounded-full px-6 py-3 text-sm font-semibold">
                  View Courses
                </Link>
              </motion.div>
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-block"
          >
            <motion.div variants={sectionContainer} className="section-head text-center">
              <h3 className="section-title">{content.statsHeading}</h3>
              <p className="section-subtitle mx-auto">{content.statsSubtitle}</p>
            </motion.div>
            <motion.div variants={cardGrid} className="stats-grid mt-10">
              {content.stats.map((item) => (
                <motion.div key={item.id} variants={itemReveal} whileHover={hoverLift} className="stat-card">
                  <div className="stat-value">{item.value}</div>
                  <div className="stat-label">{item.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-block"
          >
            <motion.div variants={sectionContainer} className="section-head text-center">
              <h3 className="section-title">Why families trust Nipra</h3>
              <p className="section-subtitle mx-auto">A coaching institute platform with proven outcomes and consistent mentorship.</p>
            </motion.div>
            <motion.div variants={cardGrid} className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {trustStats.map((stat) => (
                <motion.div key={stat.label} variants={itemReveal} whileHover={hoverLift} className="home-trust-card rounded-xl bg-white p-6 text-center shadow-md transition hover:shadow-lg">
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-block"
          >
            <motion.div variants={sectionContainer} className="section-head text-center">
              <h3 className="section-title">{content.testimonialsHeading}</h3>
              <p className="section-subtitle mx-auto">{content.testimonialsSubtitle}</p>
            </motion.div>
            <motion.div variants={cardGrid} className="testimonial-grid">
              {content.testimonials.map((testimonial) => (
                <motion.div key={testimonial.id} variants={itemReveal} whileHover={hoverLift} className="testimonial-card">
                  <p className="testimonial-quote">“{testimonial.quote}”</p>
                  <div className="testimonial-meta">
                    <span className="testimonial-name">{testimonial.name}</span>
                    <span className="testimonial-role">{testimonial.role}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-block"
          >
            <motion.div variants={sectionContainer} className="section-head text-center">
              <h3 className="section-title">{content.faqsHeading}</h3>
              <p className="section-subtitle mx-auto">{content.faqsSubtitle}</p>
            </motion.div>
            <motion.div variants={cardGrid} className="faq-grid">
              {content.faqs.map((faq) => (
                <motion.div key={faq.id} variants={itemReveal} whileHover={hoverLift} className="faq-card">
                  <h4 className="faq-question">{faq.question}</h4>
                  <p className="faq-answer">{faq.answer}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-block"
          >
            <section id="contact" className="mobile-home-contact home-contact-panel px-6 py-20">
              <div className="home-contact-inner max-w-4xl mx-auto text-center space-y-6">
                <motion.h3 variants={itemReveal} className="mobile-home-contact-title text-3xl font-bold text-gray-900">
                  {content.contactHeading}
                </motion.h3>
                <motion.p variants={itemReveal} className="text-gray-600">
                  {content.contactSubtitle}
                </motion.p>
                <motion.div variants={itemReveal} className="home-contact-actions mobile-home-contact-actions mt-6 flex justify-center gap-4 flex-wrap">
                  <motion.a
                    whileHover={buttonHover}
                    whileTap={tapPress}
                    href={phoneDialUrl}
                    className="mobile-home-contact-action home-primary-action px-6 py-3 rounded-xl shadow-md transition"
                  >
                    {content.contactCtaLabel}
                  </motion.a>
                  <motion.a
                    whileHover={buttonHover}
                    whileTap={tapPress}
                    href="/#programs"
                    className="mobile-home-contact-action home-secondary-action border border-gray-300 px-6 py-3 rounded-xl"
                  >
                    Explore Programs
                  </motion.a>
                </motion.div>
                <motion.p variants={itemReveal} className="home-contact-note mt-4 text-sm text-gray-500">
                  Or call us directly: {siteSettings.contactPhone}
                </motion.p>
              </div>
            </section>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="section-block"
          >
            <motion.div variants={itemReveal} whileHover={hoverLift} className="newsletter-card home-newsletter-card rounded-2xl shadow-md">
              <div>
                <h3 className="section-title">{content.newsletterHeading}</h3>
                <p className="section-subtitle">{content.newsletterSubtitle}</p>
              </div>
              <div className="newsletter-form">
                <input className="contact-input" placeholder="Email address" aria-label="Email address" />
                <motion.button whileHover={buttonHover} whileTap={tapPress} type="button" className="contact-cta">
                  {content.newsletterCtaLabel}
                </motion.button>
              </div>
            </motion.div>
          </motion.section>

        </div>
      </section>

      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="mobile-whatsapp-fab fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
      >
        <svg viewBox="0 0 24 24" className="mobile-whatsapp-icon h-7 w-7 fill-current" aria-hidden="true">
          <path d="M19.05 4.94A9.8 9.8 0 0 0 12.06 2a9.9 9.9 0 0 0-8.58 14.86L2 22l5.3-1.39a9.84 9.84 0 0 0 4.72 1.2h.01c5.45 0 9.9-4.44 9.9-9.9a9.82 9.82 0 0 0-2.88-6.97ZM12.03 20.1h-.01a8.17 8.17 0 0 1-4.16-1.14l-.3-.18-3.14.83.84-3.06-.2-.31a8.22 8.22 0 0 1-1.27-4.37c0-4.52 3.68-8.2 8.22-8.2a8.15 8.15 0 0 1 5.83 2.42 8.14 8.14 0 0 1 2.4 5.8c0 4.53-3.68 8.21-8.21 8.21Zm4.5-6.14c-.25-.13-1.47-.72-1.7-.8-.23-.08-.4-.12-.57.13-.17.25-.65.8-.8.96-.15.17-.29.19-.54.07-.25-.13-1.04-.38-1.98-1.2-.73-.64-1.23-1.43-1.37-1.67-.14-.25-.02-.38.1-.5.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.57-1.36-.78-1.87-.21-.5-.42-.43-.57-.44h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.02 2.61.12.17 1.77 2.7 4.28 3.79.6.26 1.07.42 1.43.54.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.17.21-.58.21-1.08.15-1.17-.06-.09-.23-.15-.48-.27Z" />
        </svg>
      </a>
    </div>
  );
}
