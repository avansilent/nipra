import type { Metadata } from "next";
import HomeClient from "../components/HomeClient";
import { fetchHomeContent } from "../lib/homeContent";
import { fetchSiteSettings } from "../lib/siteSettings";

export const metadata: Metadata = {
  title: "Nipracademy | CBSE & Bihar Board Coaching | Class 1–12 | Deo Bihar",
  description:
    "Top coaching academy in Deo, Aurangabad Bihar for Class 1–12. CBSE & Bihar Board. Structured learning, regular tests, personal guidance. Enroll online today.",
};

export default async function Home() {
  const [content, siteSettings] = await Promise.all([fetchHomeContent(), fetchSiteSettings()]);
  return <HomeClient content={content} siteSettings={siteSettings} />;
}
