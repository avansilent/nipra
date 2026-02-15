import type { HomeContent } from "../types/home";

export const defaultHomeContent: HomeContent = {
  programsHeading: "Student Programs",
  programsDescription:
    "A focused, step-by-step academic roadmap designed for students from Class 1 to Class 12, blending strong conceptual clarity with competitive readiness.",
  programs: [
    {
      id: "program-foundation",
      title: "Classes 1-5 (Foundation Level)",
      subtitle: "Focus",
      chips: [
        "Concept building, basics, reading and comprehension",
        "Mental math and confidence building",
      ],
      ctaLabel: "Explore Foundation",
      ctaHref: "/courses",
    },
    {
      id: "program-middle",
      title: "Classes 6-8 (Middle Level)",
      subtitle: "Focus",
      chips: [
        "Organized modules and interactive teaching",
        "Practice homework with feedback loops",
      ],
      ctaLabel: "Explore Middle",
      ctaHref: "/courses",
    },
    {
      id: "program-board",
      title: "Classes 9-10 (Board Readiness)",
      subtitle: "Focus",
      chips: [
        "Board preparation with a competitive approach",
        "Complete syllabus revision and board-pattern tests",
        "Time management and answer writing practice",
      ],
      ctaLabel: "Explore Board Prep",
      ctaHref: "/courses",
    },
    {
      id: "program-senior",
      title: "Senior Secondary (Classes 11-12)",
      subtitle: "Target students",
      chips: [
        "Science, Commerce, and Humanities streams",
        "CBSE and Bihar Board students",
        "Foundation for competitive exams (JEE, NEET, CA, SET, and more)",
      ],
      ctaLabel: "Explore Senior Secondary",
      ctaHref: "/courses",
    },
  ],
  statsHeading: "Trusted by families across boards",
  statsSubtitle: "Measured impact with consistent outcomes and mentorship.",
  stats: [
    { id: "stat-learners", label: "Learners guided", value: "25k+" },
    { id: "stat-mentors", label: "Expert mentors", value: "120+" },
    { id: "stat-sessions", label: "Interactive sessions", value: "1.8k+" },
    { id: "stat-success", label: "Success rate", value: "93%" },
  ],
  testimonialsHeading: "Student success stories",
  testimonialsSubtitle:
    "Real feedback from learners who improved grades and confidence.",
  testimonials: [
    {
      id: "testimonial-aarav",
      name: "Aarav Singh",
      role: "Class 10, CBSE",
      quote:
        "The board prep plan kept me focused and confident. The practice tests felt exactly like the real exam.",
    },
    {
      id: "testimonial-meera",
      name: "Meera Raj",
      role: "Class 8, Bihar Board",
      quote:
        "Concepts are explained clearly and the practice homework keeps me consistent every week.",
    },
    {
      id: "testimonial-kunal",
      name: "Kunal Verma",
      role: "Class 12, Science",
      quote:
        "Great balance between board studies and competitive foundation. The mentors are very supportive.",
    },
  ],
  faqsHeading: "Frequently asked questions",
  faqsSubtitle: "Everything you need to know before you enroll.",
  faqs: [
    {
      id: "faq-boards",
      question: "Which boards are supported?",
      answer:
        "CBSE and Bihar Board students are covered across all programs with aligned curriculum and assessments.",
    },
    {
      id: "faq-competitive",
      question: "How do you help with competitive readiness?",
      answer:
        "We blend conceptual mastery with timed practice, mock tests, and exam-style problem sets.",
    },
    {
      id: "faq-join",
      question: "Can students join mid-session?",
      answer:
        "Yes. We offer guided onboarding and bridge lessons to help new students catch up quickly.",
    },
  ],
  contactHeading: "Talk to our counselors",
  contactSubtitle: "Get a personalized learning plan for your class and board.",
  contactCtaLabel: "Request a callback",
  newsletterHeading: "Weekly learning insights",
  newsletterSubtitle: "Study tips, revision plans, and board updates in your inbox.",
  newsletterCtaLabel: "Subscribe",
  footerTagline: "Premium learning for Class 1-12 | CBSE & Bihar Board",
};

export function mergeHomeContent(partial?: Partial<HomeContent>): HomeContent {
  if (!partial) return defaultHomeContent;

  return {
    ...defaultHomeContent,
    ...partial,
    programs: Array.isArray(partial.programs)
      ? partial.programs
      : defaultHomeContent.programs,
    stats: Array.isArray(partial.stats) ? partial.stats : defaultHomeContent.stats,
    testimonials: Array.isArray(partial.testimonials)
      ? partial.testimonials
      : defaultHomeContent.testimonials,
    faqs: Array.isArray(partial.faqs) ? partial.faqs : defaultHomeContent.faqs,
  };
}
