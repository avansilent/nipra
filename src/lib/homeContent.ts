import type { HomeContent } from "../types/home";
import { defaultHomeContent, mergeHomeContent } from "../data/homeContent";
import { createSupabaseServerClient } from "./supabase/server";

export async function fetchHomeContent(): Promise<HomeContent> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return defaultHomeContent;
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", "home")
    .single();

  if (error || !data?.data) {
    return defaultHomeContent;
  }

  return mergeHomeContent(data.data as Partial<HomeContent>);
}
