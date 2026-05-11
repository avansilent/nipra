import AboutFounderStory from "../../components/about/AboutFounderStory";
import { fetchSiteSettings } from "../../lib/siteSettings";

export default async function AboutPage() {
  const siteSettings = await fetchSiteSettings();

  return <AboutFounderStory siteName={siteSettings.siteName} />;
}