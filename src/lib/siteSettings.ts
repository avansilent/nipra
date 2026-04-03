import { unstable_cache } from "next/cache";
import { defaultSiteSettings, mergeSiteSettings } from "../data/siteSettings";
import type { SiteSettings } from "../types/site";
import { createSupabaseServerClient } from "./supabase/server";

export const siteSettingsCacheTag = "site-settings";

const loadSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return defaultSiteSettings;
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("site_content")
      .select("data")
      .eq("key", "settings")
      .maybeSingle();

    if (error || !data?.data) {
      return defaultSiteSettings;
    }

    return mergeSiteSettings(data.data as Partial<SiteSettings>);
  },
  [siteSettingsCacheTag],
  {
    revalidate: 300,
    tags: [siteSettingsCacheTag],
  }
);

export async function fetchSiteSettings(): Promise<SiteSettings> {
  return loadSiteSettings();
}