"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { HomeContent } from "../types/home";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

type HomeClientProps = {
  content: HomeContent;
};

export default function HomeClient({ content }: HomeClientProps) {
  return (
    <div className="w-full bg-transparent">
      <div className="w-full pb-16">
        <section className="w-full max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="mb-6"
          >
            <div className="program-section">
              <motion.h2 variants={fadeUp} className="program-heading">
                {content.programsHeading}
              </motion.h2>

              <motion.p variants={fadeUp} className="program-description">
                {content.programsDescription}
              </motion.p>

              <motion.div variants={fadeUp} className="program-grid">
                {content.programs.map((program) => (
                  <div key={program.id} className="program-card">
                    <div className="program-title">{program.title}</div>
                    <div className="program-subtitle">{program.subtitle}</div>
                    <div className="program-subgrid">
                      {program.chips.map((chip) => (
                        <div key={chip} className="program-chip">
                          {chip}
                        </div>
                      ))}
                    </div>
                    <Link href={program.ctaHref} className="program-cta">
                      {program.ctaLabel}
                    </Link>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          <motion.section
            initial="hidden"
            animate="show"
            variants={container}
            className="section-block"
          >
            <motion.div variants={fadeUp} className="section-head">
              <h3 className="section-title">{content.statsHeading}</h3>
              <p className="section-subtitle">{content.statsSubtitle}</p>
            </motion.div>
            <motion.div variants={fadeUp} className="stats-grid">
              {content.stats.map((item) => (
                <div key={item.id} className="stat-card">
                  <div className="stat-value">{item.value}</div>
                  <div className="stat-label">{item.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            animate="show"
            variants={container}
            className="section-block"
          >
            <motion.div variants={fadeUp} className="section-head">
              <h3 className="section-title">{content.testimonialsHeading}</h3>
              <p className="section-subtitle">{content.testimonialsSubtitle}</p>
            </motion.div>
            <motion.div variants={fadeUp} className="testimonial-grid">
              {content.testimonials.map((testimonial) => (
                <div key={testimonial.id} className="testimonial-card">
                  <p className="testimonial-quote">“{testimonial.quote}”</p>
                  <div className="testimonial-meta">
                    <span className="testimonial-name">{testimonial.name}</span>
                    <span className="testimonial-role">{testimonial.role}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            animate="show"
            variants={container}
            className="section-block"
          >
            <motion.div variants={fadeUp} className="section-head">
              <h3 className="section-title">{content.faqsHeading}</h3>
              <p className="section-subtitle">{content.faqsSubtitle}</p>
            </motion.div>
            <motion.div variants={fadeUp} className="faq-grid">
              {content.faqs.map((faq) => (
                <div key={faq.id} className="faq-card">
                  <h4 className="faq-question">{faq.question}</h4>
                  <p className="faq-answer">{faq.answer}</p>
                </div>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            animate="show"
            variants={container}
            className="section-block"
          >
            <motion.div variants={fadeUp} className="section-head">
              <h3 className="section-title">{content.contactHeading}</h3>
              <p className="section-subtitle">{content.contactSubtitle}</p>
            </motion.div>
            <motion.form variants={fadeUp} className="contact-card">
              <div className="contact-row">
                <input className="contact-input" placeholder="Student name" aria-label="Student name" />
                <input className="contact-input" placeholder="Parent phone" aria-label="Parent phone" />
              </div>
              <div className="contact-row">
                <input className="contact-input" placeholder="Class" aria-label="Class" />
                <input className="contact-input" placeholder="Board" aria-label="Board" />
              </div>
              <textarea className="contact-input" placeholder="What support do you need?" aria-label="Support details" rows={3} />
              <button type="button" className="contact-cta">
                {content.contactCtaLabel}
              </button>
            </motion.form>
          </motion.section>

          <motion.section
            initial="hidden"
            animate="show"
            variants={container}
            className="section-block"
          >
            <motion.div variants={fadeUp} className="newsletter-card">
              <div>
                <h3 className="section-title">{content.newsletterHeading}</h3>
                <p className="section-subtitle">{content.newsletterSubtitle}</p>
              </div>
              <div className="newsletter-form">
                <input className="contact-input" placeholder="Email address" aria-label="Email address" />
                <button type="button" className="contact-cta">
                  {content.newsletterCtaLabel}
                </button>
              </div>
            </motion.div>
          </motion.section>

        </section>
      </div>
    </div>
  );
}
