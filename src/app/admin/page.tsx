import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin Login | Nipracademy",
  description: "Secure admin entry point for Nipracademy institute management.",
};

export default function AdminEntryPage() {
  redirect("/login?type=admin");
}
