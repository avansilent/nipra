"use client";
import Link from "next/link";
import { motion } from "framer-motion";
const stats = [
  { label: "Learners guided", value: "25k+" },
  { label: "Expert mentors", value: "120+" },
  { label: "Interactive sessions", value: "1.8k+" },
  { label: "Success rate", value: "93%" },
];

const testimonials = [
  {
    name: "Aarav Singh",
    role: "Class 10, CBSE",
    quote: "The board prep plan kept me focused and confident. The practice tests felt exactly like the real exam.",
  },
  {
    name: "Meera Raj",
    role: "Class 8, Bihar Board",
    quote: "Concepts are explained clearly and the practice homework keeps me consistent every week.",
  },
  {
    name: "Kunal Verma",
    role: "Class 12, Science",
    quote: "Great balance between board studies and competitive foundation. The mentors are very supportive.",
  },
];

const faqs = [
  {
    question: "Which boards are supported?",
    answer: "CBSE and Bihar Board students are covered across all programs with aligned curriculum and assessments.",
  },
  {
    question: "How do you help with competitive readiness?",
    answer: "We blend conceptual mastery with timed practice, mock tests, and exam-style problem sets.",
  },
  {
    question: "Can students join mid-session?",
    answer: "Yes. We offer guided onboarding and bridge lessons to help new students catch up quickly.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-[#f6f2e9]">
      <main className="flex-1 w-full pt-20 pb-16">
        <section className="w-full max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="mb-6"
          >
            <div className="program-section">
              <motion.h2 variants={fadeUp} className="program-heading">
                Student Programs
              </motion.h2>

              <motion.p variants={fadeUp} className="program-description">
                A focused, step-by-step academic roadmap designed for students from Class 1 to Class 12, blending strong
                conceptual clarity with competitive readiness.
              </motion.p>

              <motion.div variants={fadeUp} className="program-grid">
                <div className="program-card">
                  <div className="program-title">Classes 1-5 (Foundation Level)</div>
                  <div className="program-subtitle">Focus</div>
                  <div className="program-subgrid">
                    <div className="program-chip">Concept building, basics, reading and comprehension</div>
                    <div className="program-chip">Mental math and confidence building</div>
                  </div>
                  <Link href="/courses" className="program-cta">Explore Foundation</Link>
                </div>

                <div className="program-card">
                  <div className="program-title">Classes 6-8 (Middle Level)</div>
                  <div className="program-subtitle">Focus</div>
                  <div className="program-subgrid">
                    <div className="program-chip">Organized modules and interactive teaching</div>
                    <div className="program-chip">Practice homework with feedback loops</div>
                  </div>
                  <Link href="/courses" className="program-cta">Explore Middle</Link>
                </div>

                <div className="program-card">
                  <div className="program-title">Classes 9-10 (Board Readiness)</div>
                  <div className="program-subtitle">Focus</div>
                  <div className="program-subgrid">
                    <div className="program-chip">Board preparation with a competitive approach</div>
                    <div className="program-chip">Complete syllabus revision and board-pattern tests</div>
                    <div className="program-chip">Time management and answer writing practice</div>
                  </div>
                  <Link href="/courses" className="program-cta">Explore Board Prep</Link>
                </div>

                <div className="program-card">
                  <div className="program-title">Senior Secondary (Classes 11-12)</div>
                  <div className="program-subtitle">Target students</div>
                  <div className="program-subgrid">
                    <div className="program-chip">Science, Commerce, and Humanities streams</div>
                    <div className="program-chip">CBSE and Bihar Board students</div>
                    <div className="program-chip">Foundation for competitive exams (JEE, NEET, CA, SET, and more)</div>
                  </div>
                  <Link href="/courses" className="program-cta">Explore Senior Secondary</Link>
                </div>
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
              <h3 className="section-title">Trusted by families across boards</h3>
              <p className="section-subtitle">Measured impact with consistent outcomes and mentorship.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="stats-grid">
              {stats.map((item) => (
                <div key={item.label} className="stat-card">
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
              <h3 className="section-title">Student success stories</h3>
              <p className="section-subtitle">Real feedback from learners who improved grades and confidence.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="testimonial-grid">
              {testimonials.map((t) => (
                <div key={t.name} className="testimonial-card">
                  <p className="testimonial-quote">“{t.quote}”</p>
                  <div className="testimonial-meta">
                    <span className="testimonial-name">{t.name}</span>
                    <span className="testimonial-role">{t.role}</span>
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
              <h3 className="section-title">Frequently asked questions</h3>
              <p className="section-subtitle">Everything you need to know before you enroll.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="faq-grid">
              {faqs.map((faq) => (
                <div key={faq.question} className="faq-card">
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
              <h3 className="section-title">Talk to our counselors</h3>
              <p className="section-subtitle">Get a personalized learning plan for your class and board.</p>
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
              <button type="button" className="contact-cta">Request a callback</button>
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
                <h3 className="section-title">Weekly learning insights</h3>
                <p className="section-subtitle">Study tips, revision plans, and board updates in your inbox.</p>
              </div>
              <div className="newsletter-form">
                <input className="contact-input" placeholder="Email address" aria-label="Email address" />
                <button type="button" className="contact-cta">Subscribe</button>
              </div>
            </motion.div>
          </motion.section>

          <section className="site-footer">
            <div className="footer-brand">Nipra Academy</div>
            <div className="footer-links">
              <a href="/courses">Courses</a>
              <a href="/notes">Notes</a>
              <a href="/question-papers">Paper Books</a>
              <a href="/contact">Contact</a>
            </div>
            <div className="footer-meta">Premium learning for Class 1-12 | CBSE & Bihar Board</div>
          </section>
        </section>
      </main>
    </div>
  );
}
