import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Workspace | Nipracademy",
  description: "Open the Nipracademy student workspace for courses, notes, progress, and study resources.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
