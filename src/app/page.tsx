import HeroBanner from "../components/HeroBanner";
import HomeClient from "../components/HomeClient";
import { fetchHomeContent } from "../lib/homeContent";

export default async function Home() {
  const content = await fetchHomeContent();
  return (
    <>
      <HeroBanner />
      <HomeClient content={content} />
    </>
  );
}
