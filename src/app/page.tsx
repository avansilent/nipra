import HomeClient from "../components/HomeClient";
import { fetchHomeContent } from "../lib/homeContent";
import { fetchSiteSettings } from "../lib/siteSettings";

export default async function Home() {
  const [content, siteSettings] = await Promise.all([fetchHomeContent(), fetchSiteSettings()]);
  return <HomeClient content={content} siteSettings={siteSettings} />;
}
