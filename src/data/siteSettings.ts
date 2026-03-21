import type { SiteSettings } from "../types/site";

export const defaultSiteSettings: SiteSettings = {
  siteName: "Nipracademy",
  siteDescription: "A premium, modern educational platform for students, parents, and institute owners.",
  logoUrl: "/logo.png",
  contactEmail: "support@nipracademy.com",
  contactPhone: "9955272576",
  contactAddress: "Patna, Bihar, India",
  footerNotice: "Premium learning for Class 1-12 | CBSE & Bihar Board",
};

export function mergeSiteSettings(partial?: Partial<SiteSettings>): SiteSettings {
  return {
    ...defaultSiteSettings,
    ...(partial ?? {}),
  };
}