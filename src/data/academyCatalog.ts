export type AcademyCatalogCourse = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  monthlyFee: string;
  admissionFee: string;
  subjects: string[];
  focus: string[];
  imageSrc: string;
  imageAlt: string;
  ctaLabel: string;
  keywords: string[];
};

export type AcademyOffer = {
  id: string;
  title: string;
  description: string;
};

export const academySession = "Session 2026-27";
export const academyLocation = "Deo, Aurangabad, Bihar";
export const academyMission = "Village students deserve city-level education with affordable fees, clear structure, and consistent guidance.";
export const academyAdmissionNote =
  "To begin admission, families pay only the admission fee first. After that, the Nipracademy team confirms the batch, monthly fee plan, and final admission details for online or offline classes.";

export const academyCatalog: AcademyCatalogCourse[] = [
  {
    id: "pre-primary",
    title: "Pre-Primary",
    subtitle: "Nursery to UKG",
    summary: "A gentle early-learning track built around speaking, writing, counting, drawing, and confident classroom behavior.",
    monthlyFee: "₹400-₹600 / month",
    admissionFee: "₹50 one-time",
    subjects: ["Basic English speaking", "Hindi letters and reading", "Counting 1-100", "Drawing and activity learning"],
    focus: ["Strong base building", "Learning with fun and no pressure", "Behavior and communication development"],
    imageSrc: "/nipracademy-doc/image1.png",
    imageAlt: "Pre-primary students learning together at Nipracademy",
    ctaLabel: "Start Pre-Primary Admission",
    keywords: ["pre primary", "nursery", "ukg", "lkg", "kg"],
  },
  {
    id: "primary",
    title: "Primary",
    subtitle: "Class 1 to 5",
    summary: "Daily school fundamentals for young learners with concept clarity, reading support, and homework rhythm.",
    monthlyFee: "₹400-₹600 / month",
    admissionFee: "₹70 one-time",
    subjects: ["English", "Hindi", "Mathematics", "EVS / General Science"],
    focus: ["Basic concepts made strong", "Reading and writing improvement", "Regular tests and homework support"],
    imageSrc: "/nipracademy-doc/image2.jpeg",
    imageAlt: "Primary students practicing with classroom learning tools",
    ctaLabel: "Join Primary Program",
    keywords: ["primary", "class 1", "class 2", "class 3", "class 4", "class 5", "1-5", "1 5", "foundation"],
  },
  {
    id: "middle-school",
    title: "Middle School",
    subtitle: "Class 6 to 8",
    summary: "A structured bridge from basics to board-level thinking with weekly tests, tracking, and doubt support.",
    monthlyFee: "₹500-₹800 / month",
    admissionFee: "₹100 one-time",
    subjects: ["Mathematics", "Science", "English", "Social Science"],
    focus: ["Strong concept building for future boards", "Weekly tests and performance tracking", "Dedicated doubt-clearing sessions"],
    imageSrc: "/nipracademy-doc/image4.jpeg",
    imageAlt: "Middle school students practicing together in class",
    ctaLabel: "Apply For Middle School",
    keywords: ["middle", "class 6", "class 7", "class 8", "6-8", "6 8"],
  },
  {
    id: "secondary-board",
    title: "Secondary Board Preparation",
    subtitle: "Class 9 and 10",
    summary: "Board-ready preparation for Bihar Board and CBSE with previous-year papers, test series, and answer-writing strategy.",
    monthlyFee: "₹1,000-₹1,500 / month",
    admissionFee: "₹150 one-time",
    subjects: ["Mathematics", "Science", "English", "Social Science"],
    focus: ["Board exam preparation", "Important questions and previous-year papers", "Regular test series and topper guidance"],
    imageSrc: "/nipracademy-doc/image7.jpeg",
    imageAlt: "Secondary students studying attentively in class",
    ctaLabel: "Join Board Prep",
    keywords: ["secondary", "board", "class 9", "class 10", "9-10", "9 10"],
  },
  {
    id: "senior-science",
    title: "Senior Secondary Science",
    subtitle: "Class 11 and 12 | PCM / PCB / PCBM",
    summary: "Deep concept clarity for science students with numerical practice, board focus, and a strong competitive base.",
    monthlyFee: "₹1,500-₹2,500 / month",
    admissionFee: "₹200 one-time",
    subjects: ["Physics", "Chemistry", "Mathematics", "Biology"],
    focus: ["Deep concept clarity", "Numerical problem solving", "Board plus competitive preparation base"],
    imageSrc: "/nipracademy-doc/image6.jpeg",
    imageAlt: "Senior secondary science student studying at a desk",
    ctaLabel: "Apply For Science Stream",
    keywords: ["science", "pcm", "pcb", "pcbm", "class 11", "class 12", "11-12", "11 12", "physics", "chemistry", "biology", "mathematics"],
  },
  {
    id: "senior-commerce",
    title: "Senior Secondary Commerce",
    subtitle: "Class 11 and 12 | Commerce Stream",
    summary: "Commerce mentoring focused on concept understanding, account practice, and clean exam writing.",
    monthlyFee: "₹1,200-₹2,000 / month",
    admissionFee: "₹150 one-time",
    subjects: ["Accountancy", "Business Studies", "Economics"],
    focus: ["Concept and practical understanding", "Accounts practice", "Exam writing discipline"],
    imageSrc: "/nipracademy-doc/image5.jpeg",
    imageAlt: "Commerce and senior students learning with a mentor in the library",
    ctaLabel: "Join Commerce Stream",
    keywords: ["commerce", "accountancy", "business studies", "economics"],
  },
  {
    id: "senior-arts",
    title: "Senior Secondary Arts And Humanities",
    subtitle: "Class 11 and 12 | Arts Stream",
    summary: "Board-oriented humanities support with theory clarity, structured revision, and stronger answer-writing habits.",
    monthlyFee: "₹1,000-₹1,800 / month",
    admissionFee: "₹150 one-time",
    subjects: ["History", "Political Science", "Geography", "Other humanities subjects"],
    focus: ["Theory clarity", "Answer-writing practice", "Board-oriented preparation"],
    imageSrc: "/nipracademy-doc/image5.jpeg",
    imageAlt: "Senior students in a guided classroom discussion",
    ctaLabel: "Apply For Arts Stream",
    keywords: ["arts", "humanities", "history", "political science", "geography"],
  },
];

export const academyOffers: AcademyOffer[] = [
  {
    id: "sibling-discount",
    title: "Sibling Discount",
    description: "10% off for the second child to make family learning plans lighter.",
  },
  {
    id: "merit-scholarship",
    title: "Merit Scholarship",
    description: "10% to 20% discount support for topper students and high performers.",
  },
  {
    id: "girls-discount",
    title: "Girls Special Support",
    description: "Encouraging girl education with a cleaner, more affordable admission path.",
  },
  {
    id: "annual-payment-offer",
    title: "Annual Payment Offer",
    description: "Pay annually and receive one month of fees free as a loyalty benefit.",
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findAcademyCatalogCourse(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = normalize(value);
  if (!normalizedValue) {
    return null;
  }

  let bestMatch: { course: AcademyCatalogCourse; score: number } | null = null;

  for (const course of academyCatalog) {
    let score = 0;
    for (const keyword of course.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (!normalizedKeyword) {
        continue;
      }

      if (normalizedValue.includes(normalizedKeyword)) {
        score += normalizedKeyword.length;
      }
    }

    const normalizedTitle = normalize(course.title);
    if (normalizedValue.includes(normalizedTitle)) {
      score += normalizedTitle.length * 2;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { course, score };
    }
  }

  return bestMatch && bestMatch.score > 0 ? bestMatch.course : null;
}