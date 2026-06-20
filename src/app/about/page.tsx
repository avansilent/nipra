import type { Metadata } from "next";
import AboutFounderStory from "../../components/about/AboutFounderStory";
import { fetchSiteSettings } from "../../lib/siteSettings";

export const metadata: Metadata = {
  title: "About Nipracademy | Coaching Academy Deo, Aurangabad Bihar",
  description:
    "Nipracademy offers disciplined, concept-focused coaching for Class 1–12 in Deo Bihar. Learn our teaching philosophy and why students choose us.",
};

export default async function AboutPage() {
  const siteSettings = await fetchSiteSettings();

  return (
    <AboutFounderStory
      siteName={siteSettings.siteName}
      contactPhone={siteSettings.contactPhone}
      contactAddress={siteSettings.contactAddress}
    />
  );
}
