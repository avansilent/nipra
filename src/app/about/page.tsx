import type { Metadata } from "next";
import AboutFounderStory from "../../components/about/AboutFounderStory";
import { fetchSiteSettings } from "../../lib/siteSettings";

export const metadata: Metadata = {
  title: "About Nipracademy | Learning With Clear Guidance",
  description: "Learn about Nipracademy's mission to provide affordable, disciplined, and clear academic support for students.",
};

export default async function AboutPage() {
  const siteSettings = await fetchSiteSettings();

  return <AboutFounderStory siteName={siteSettings.siteName} />;
}
