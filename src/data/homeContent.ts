import type { HomeContent } from "../types/home";

export const defaultHomeContent: HomeContent = {
  heroBadge: "Simple learning",
  heroTitle: "Learn clearly. Grow steadily.",
  heroSubtitle:
    "Classes, practice, and guidance in one calm student space.",
  heroPrimaryCtaLabel: "Explore Programs",
  heroPrimaryCtaHref: "/courses",
  heroSecondaryCtaLabel: "Talk to Counselors",
  heroSecondaryCtaHref: "/#contact",
  heroImageUrl: "",
  programsHeading: "Programs",
  programsDescription:
    "Simple paths from Class 1 to 12 with clear practice and support.",
  programs: [
    {
      id: "program-foundation",
      title: "Classes 1-5",
      subtitle: "Focus",
      chips: [
        "Basics, reading, and number sense",
        "Confidence through daily practice",
      ],
      ctaLabel: "View Foundation",
      ctaHref: "/courses",
    },
    {
      id: "program-middle",
      title: "Classes 6-8",
      subtitle: "Focus",
      chips: [
        "Clear lessons and guided homework",
        "Regular feedback and progress checks",
      ],
      ctaLabel: "View Middle",
      ctaHref: "/courses",
    },
    {
      id: "program-board",
      title: "Classes 9-10",
      subtitle: "Focus",
      chips: [
        "Board-focused classes and revision",
        "Tests, writing practice, and time strategy",
      ],
      ctaLabel: "View Board Prep",
      ctaHref: "/courses",
    },
    {
      id: "program-senior",
      title: "Classes 11-12",
      subtitle: "Streams",
      chips: [
        "Science, Commerce, and Humanities",
        "Boards plus competitive foundation",
      ],
      ctaLabel: "View Senior Secondary",
      ctaHref: "/courses",
    },
  ],
  statsHeading: "Results that stay clear",
  statsSubtitle: "Strong guidance and steady outcomes.",
  stats: [
    { id: "stat-learners", label: "Learners guided", value: "25k+" },
    { id: "stat-mentors", label: "Expert mentors", value: "120+" },
    { id: "stat-sessions", label: "Interactive sessions", value: "1.8k+" },
    { id: "stat-success", label: "Success rate", value: "93%" },
  ],
  testimonialsHeading: "What students say",
  testimonialsSubtitle:
    "Short feedback from students learning with us.",
  testimonials: [
    {
      id: "testimonial-aarav",
      name: "Aarav Singh",
      role: "Class 10, CBSE",
      quote:
        "The board plan kept me focused. Mock tests made the exam feel familiar.",
    },
    {
      id: "testimonial-meera",
      name: "Meera Raj",
      role: "Class 8, Bihar Board",
      quote:
        "Classes are clear and the homework keeps me regular every week.",
    },
  ],
  faqsHeading: "Quick answers",
  faqsSubtitle: "The basics before you join.",
  faqs: [
    {
      id: "faq-boards",
      question: "Which boards are supported?",
      answer:
        "CBSE and Bihar Board students are covered across all programs.",
    },
    {
      id: "faq-join",
      question: "Can students join mid-session?",
      answer:
        "Yes. We help new students settle in with guided support.",
    },
  ],
  contactHeading: "Talk to us",
  contactSubtitle: "Get quick help with class, board, and admission.",
  contactCtaLabel: "Request a callback",
  newsletterHeading: "Stay updated",
  newsletterSubtitle: "Only important academic updates.",
  newsletterCtaLabel: "Subscribe",
  footerTagline: "Calm learning for Class 1-12",
};

const legacyHomeContentMarkers = {
  heroTitle: "Clear teaching. Calm progress.",
  programsDescription:
    "Clear academic paths from Class 1 to 12, designed for strong basics and steady exam readiness.",
  testimonialsHeading: "Student success stories",
  faqsHeading: "Frequently asked questions",
} as const;

export function isLegacyHomeContent(value: Partial<HomeContent> | undefined): boolean {
  if (!value) {
    return false;
  }

  return (
    value.heroTitle === legacyHomeContentMarkers.heroTitle &&
    value.programsDescription === legacyHomeContentMarkers.programsDescription &&
    value.testimonialsHeading === legacyHomeContentMarkers.testimonialsHeading &&
    value.faqsHeading === legacyHomeContentMarkers.faqsHeading
  );
}

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
    heroImageUrl: pickText(partial.heroImageUrl, defaultHomeContent.heroImageUrl),
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
