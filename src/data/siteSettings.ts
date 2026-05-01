import type { SiteSettings } from "../types/site";
import { DEFAULT_LOGO_SRC } from "../lib/branding";

export const defaultSiteSettings: SiteSettings = {
  siteName: "Nipracademy",
  siteDescription: "A premium, modern educational platform for students, parents, and institute owners.",
  logoUrl: DEFAULT_LOGO_SRC,
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