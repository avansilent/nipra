import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Question Papers | Nipracademy",
  description: "Practice with previous year question papers and exam preparation resources from Nipracademy.",
};

export default function QuestionPapersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
