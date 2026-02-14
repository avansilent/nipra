export type Track = {
  id: string;
  title: string;
  description?: string;
  tag: string;
  levels: string[];
  image?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  titleClassName?: string;
  popular?: boolean;
};

export const defaultTracks: Track[] = [
  {
    id: "neet",
    title: "NEET track",
    description: "Focused prep for key subjects and practice.",
    tag: "Entrance",
    levels: ["Class 11", "Class 12", "Dropper"],
    titleClassName: "text-2xl",
    popular: true,
  },
  {
    id: "engineering",
    title: "Engineering track",
    description: "Math, physics, and problem practice bundled.",
    tag: "Entrance",
    levels: ["Class 11", "Class 12", "Dropper"],
    titleClassName: "text-2xl",
  },
  {
    id: "foundation",
    title: "Foundation path",
    description: "Strengthen basics for early and middle classes.",
    tag: "Foundation",
    levels: ["Middle school", "Early high school"],
    titleClassName: "text-2xl",
  },
  {
    id: "boards",
    title: "School boards",
    description: "Structured support for board-focused study.",
    tag: "Boards",
    levels: ["CBSE", "ICSE", "State boards"],
    titleClassName: "text-2xl",
  },
  {
    id: "careers",
    title: "Career exams",
    description: "Reasoning, aptitude, and practice sets.",
    tag: "Careers",
    levels: ["UPSC", "Banking", "Others"],
    titleClassName: "text-2xl",
  },
  {
    id: "govt-exams",
    title: "Government exams",
    description: "Subject-wise practice for multiple government paths.",
    tag: "Govt exams",
    levels: ["SSC", "Banking", "Teaching", "Judiciary"],
    titleClassName: "text-2xl",
  },
];
