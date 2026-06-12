import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Student Login | Nipracademy",
  description: "Student entry point for accessing the Nipracademy learning portal.",
};

export default function StudentEntryPage() {
  redirect("/login?type=student");
}
