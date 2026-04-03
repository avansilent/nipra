import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "./supabase/service";
import type { AdmissionCourse } from "../types/admission";

type CourseRow = {
  id: string;
  institute_id: string | null;
  title: string;
  description: string | null;
  price_text: string | null;
  cta_label: string | null;
};

const loadPublishedCourses = unstable_cache(
  async (): Promise<AdmissionCourse[]> => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return [];
    }

    try {
      const serviceClient = createSupabaseServiceClient();
      const { data, error } = await serviceClient
        .from("courses")
        .select("id, institute_id, title, description, price_text, cta_label")
        .eq("status", "published")
        .not("institute_id", "is", null)
        .order("created_at", { ascending: true });

      if (error) {
        return [];
      }

      return ((data ?? []) as CourseRow[]).flatMap((course) => {
        if (!course.institute_id) {
          return [];
        }

        return [
          {
            id: course.id,
            instituteId: course.institute_id,
            title: course.title,
            description: course.description,
            priceText: course.price_text,
            ctaLabel: course.cta_label,
          },
        ];
      });
    } catch {
      return [];
    }
  },
  ["published-courses"],
  {
    revalidate: 60,
  }
);

export async function fetchPublishedCourses(): Promise<AdmissionCourse[]> {
  return loadPublishedCourses();
}