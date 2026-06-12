import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Series | Nipracademy",
  description: "Use Nipracademy test series practice to build exam confidence, stamina, and performance clarity.",
};

export default function TestSeriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
