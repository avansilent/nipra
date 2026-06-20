import type { SiteSettings } from "../types/site";
import { DEFAULT_LOGO_SRC } from "../lib/branding";

export const defaultSiteSettings: SiteSettings = {
  siteName: "Nipracademy",
  siteDescription: "A premium, modern educational platform for students, parents, and institute owners.",
  logoUrl: DEFAULT_LOGO_SRC,
  contactEmail: "support@nipracademy.com",
  contactPhone: "7324868574",
  contactAddress: "Deo, Aurangabad, Bihar",
};

export function mergeSiteSettings(partial?: Partial<SiteSettings>): SiteSettings {
  const source = partial ?? {};

  return {
    siteName: source.siteName ?? defaultSiteSettings.siteName,
    siteDescription: source.siteDescription ?? defaultSiteSettings.siteDescription,
    logoUrl: source.logoUrl ?? defaultSiteSettings.logoUrl,
    contactEmail: source.contactEmail ?? defaultSiteSettings.contactEmail,
    contactPhone: source.contactPhone ?? defaultSiteSettings.contactPhone,
    contactAddress: source.contactAddress ?? defaultSiteSettings.contactAddress,
  };
}
