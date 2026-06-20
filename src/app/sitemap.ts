import type { MetadataRoute } from "next";
import { academyCatalog } from "../data/academyCatalog";

const siteUrl = "https://nipracademy.com";

const publicRoutes = [
  "/",
  "/about",
  "/courses",
  "/join",
  "/login",
  "/notes",
  "/books",
  "/question-papers",
  "/test-series",
  "/terms-and-conditions",
  "/privacy-policy",
  "/refund-policy",
];

function toSitemapEntry(path: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/courses" ? 0.9 : 0.7,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const courseRoutes = academyCatalog.map((course) => `/courses/${course.id}`);

  return [...publicRoutes, ...courseRoutes].map(toSitemapEntry);
}
