import type { Metadata } from "next";
import HomeClient from "../components/HomeClient";
import { fetchHomeContent } from "../lib/homeContent";
import { fetchSiteSettings } from "../lib/siteSettings";

export const metadata: Metadata = {
  title: "Nipracademy | Online and Offline Classes",
  description: "Nipracademy offers structured online and offline classes, study materials, tests, and student portal access for school learners.",
};

export default async function Home() {
  const [content, siteSettings] = await Promise.all([fetchHomeContent(), fetchSiteSettings()]);
  return <HomeClient content={content} siteSettings={siteSettings} />;
}
