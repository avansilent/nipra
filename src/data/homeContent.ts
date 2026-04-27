import type { HomeContent } from "../types/home";

export const defaultHomeContent: HomeContent = {
  heroBadge: "Structured learning",
  heroTitle: "Clear teaching. Calm progress.",
  heroSubtitle:
    "A simple learning system for classes, practice, and guidance in one clean student experience.",
  heroPrimaryCtaLabel: "Explore Programs",
  heroPrimaryCtaHref: "/courses",
  heroSecondaryCtaLabel: "Talk to Counselors",
  heroSecondaryCtaHref: "/#contact",
  programsHeading: "Programs",
  programsDescription:
    "Clear academic paths from Class 1 to 12, designed for strong basics and steady exam readiness.",
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
  statsHeading: "Results families can trust",
  statsSubtitle: "Clear progress, steady guidance, and consistent outcomes.",
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
  contactHeading: "Talk to us",
  contactSubtitle: "Get the right class, board, and admission guidance.",
  contactCtaLabel: "Request a callback",
  newsletterHeading: "Updates, not noise",
  newsletterSubtitle: "Occasional study tips and important academic updates.",
  newsletterCtaLabel: "Subscribe",
  footerTagline: "Clear learning for Class 1-12 | CBSE & Bihar Board",
};

function pickText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function pickStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : fallback;
}

function mergePrograms(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultHomeContent.programs;
  }

  const normalized = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const fallback = defaultHomeContent.programs[index] ?? defaultHomeContent.programs[0];
      const candidate = item as Partial<(typeof defaultHomeContent.programs)[number]>;

      return {
        id: pickText(candidate.id, `${fallback.id}-${index + 1}`),
        title: pickText(candidate.title, fallback.title),
        subtitle: pickText(candidate.subtitle, fallback.subtitle),
        chips: pickStringArray(candidate.chips, fallback.chips),
        ctaLabel: pickText(candidate.ctaLabel, fallback.ctaLabel),
        ctaHref: pickText(candidate.ctaHref, fallback.ctaHref),
      };
    })
    .filter((item) => item !== null);

  return normalized.length > 0 ? normalized : defaultHomeContent.programs;
}

function mergeStats(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultHomeContent.stats;
  }

  const normalized = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const fallback = defaultHomeContent.stats[index] ?? defaultHomeContent.stats[0];
      const candidate = item as Partial<(typeof defaultHomeContent.stats)[number]>;

      return {
        id: pickText(candidate.id, `${fallback.id}-${index + 1}`),
        label: pickText(candidate.label, fallback.label),
        value: pickText(candidate.value, fallback.value),
      };
    })
    .filter((item) => item !== null);

  return normalized.length > 0 ? normalized : defaultHomeContent.stats;
}

function mergeTestimonials(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultHomeContent.testimonials;
  }

  const normalized = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const fallback = defaultHomeContent.testimonials[index] ?? defaultHomeContent.testimonials[0];
      const candidate = item as Partial<(typeof defaultHomeContent.testimonials)[number]>;

      return {
        id: pickText(candidate.id, `${fallback.id}-${index + 1}`),
        name: pickText(candidate.name, fallback.name),
        role: pickText(candidate.role, fallback.role),
        quote: pickText(candidate.quote, fallback.quote),
      };
    })
    .filter((item) => item !== null);

  return normalized.length > 0 ? normalized : defaultHomeContent.testimonials;
}

function mergeFaqs(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultHomeContent.faqs;
  }

  const normalized = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const fallback = defaultHomeContent.faqs[index] ?? defaultHomeContent.faqs[0];
      const candidate = item as Partial<(typeof defaultHomeContent.faqs)[number]>;

      return {
        id: pickText(candidate.id, `${fallback.id}-${index + 1}`),
        question: pickText(candidate.question, fallback.question),
        answer: pickText(candidate.answer, fallback.answer),
      };
    })
    .filter((item) => item !== null);

  return normalized.length > 0 ? normalized : defaultHomeContent.faqs;
}

export function mergeHomeContent(partial?: Partial<HomeContent>): HomeContent {
  if (!partial) return defaultHomeContent;

  return {
    heroBadge: pickText(partial.heroBadge, defaultHomeContent.heroBadge),
    heroTitle: pickText(partial.heroTitle, defaultHomeContent.heroTitle),
    heroSubtitle: pickText(partial.heroSubtitle, defaultHomeContent.heroSubtitle),
    heroPrimaryCtaLabel: pickText(partial.heroPrimaryCtaLabel, defaultHomeContent.heroPrimaryCtaLabel),
    heroPrimaryCtaHref: pickText(partial.heroPrimaryCtaHref, defaultHomeContent.heroPrimaryCtaHref),
    heroSecondaryCtaLabel: pickText(partial.heroSecondaryCtaLabel, defaultHomeContent.heroSecondaryCtaLabel),
    heroSecondaryCtaHref: pickText(partial.heroSecondaryCtaHref, defaultHomeContent.heroSecondaryCtaHref),
    programsHeading: pickText(partial.programsHeading, defaultHomeContent.programsHeading),
    programsDescription: pickText(partial.programsDescription, defaultHomeContent.programsDescription),
    programs: mergePrograms(partial.programs),
    statsHeading: pickText(partial.statsHeading, defaultHomeContent.statsHeading),
    statsSubtitle: pickText(partial.statsSubtitle, defaultHomeContent.statsSubtitle),
    stats: mergeStats(partial.stats),
    testimonialsHeading: pickText(partial.testimonialsHeading, defaultHomeContent.testimonialsHeading),
    testimonialsSubtitle: pickText(partial.testimonialsSubtitle, defaultHomeContent.testimonialsSubtitle),
    testimonials: mergeTestimonials(partial.testimonials),
    faqsHeading: pickText(partial.faqsHeading, defaultHomeContent.faqsHeading),
    faqsSubtitle: pickText(partial.faqsSubtitle, defaultHomeContent.faqsSubtitle),
    faqs: mergeFaqs(partial.faqs),
    contactHeading: pickText(partial.contactHeading, defaultHomeContent.contactHeading),
    contactSubtitle: pickText(partial.contactSubtitle, defaultHomeContent.contactSubtitle),
    contactCtaLabel: pickText(partial.contactCtaLabel, defaultHomeContent.contactCtaLabel),
    newsletterHeading: pickText(partial.newsletterHeading, defaultHomeContent.newsletterHeading),
    newsletterSubtitle: pickText(partial.newsletterSubtitle, defaultHomeContent.newsletterSubtitle),
    newsletterCtaLabel: pickText(partial.newsletterCtaLabel, defaultHomeContent.newsletterCtaLabel),
    footerTagline: pickText(partial.footerTagline, defaultHomeContent.footerTagline),
  };
}
