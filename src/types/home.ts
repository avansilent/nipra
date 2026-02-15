export type Program = {
  id: string;
  title: string;
  subtitle: string;
  chips: string[];
  ctaLabel: string;
  ctaHref: string;
};

export type Stat = {
  id: string;
  label: string;
  value: string;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
};

export type HomeContent = {
  programsHeading: string;
  programsDescription: string;
  programs: Program[];
  statsHeading: string;
  statsSubtitle: string;
  stats: Stat[];
  testimonialsHeading: string;
  testimonialsSubtitle: string;
  testimonials: Testimonial[];
  faqsHeading: string;
  faqsSubtitle: string;
  faqs: Faq[];
  contactHeading: string;
  contactSubtitle: string;
  contactCtaLabel: string;
  newsletterHeading: string;
  newsletterSubtitle: string;
  newsletterCtaLabel: string;
  footerTagline: string;
};
