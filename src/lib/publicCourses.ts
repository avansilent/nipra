import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "./supabase/service";
import { academyCatalog, findAcademyCatalogCourse } from "../data/academyCatalog";
import type { AdmissionCourse } from "../types/admission";

type CourseRow = {
  id: string;
  institute_id: string | null;
  title: string;
  description: string | null;
  price_text: string | null;
  cta_label: string | null;
};

export const publishedCoursesCacheTag = "published-courses";

const catalogOrder = new Map(academyCatalog.map((course, index) => [course.id, index]));

function sortPublishedCourses(courses: AdmissionCourse[]) {
  return [...courses].sort((left, right) => {
    const leftCatalogId = findAcademyCatalogCourse(left.title)?.id;
    const rightCatalogId = findAcademyCatalogCourse(right.title)?.id;
    const leftOrder = leftCatalogId ? catalogOrder.get(leftCatalogId) : undefined;
    const rightOrder = rightCatalogId ? catalogOrder.get(rightCatalogId) : undefined;

    if (typeof leftOrder === "number" && typeof rightOrder === "number" && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    if (typeof leftOrder === "number") {
      return -1;
    }

    if (typeof rightOrder === "number") {
      return 1;
    }

    return left.title.localeCompare(right.title, "en", { sensitivity: "base" });
  });
}

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
        .not("institute_id", "is", null);

      if (error) {
        return [];
      }

      const publishedCourses = ((data ?? []) as CourseRow[]).flatMap((course) => {
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

      return sortPublishedCourses(publishedCourses);
    } catch {
      return [];
    }
  },
  [publishedCoursesCacheTag],
  {
    revalidate: 60,
    tags: [publishedCoursesCacheTag],
  }
);

export async function fetchPublishedCourses(): Promise<AdmissionCourse[]> {
  return loadPublishedCourses();
}
