import { isVideoReference } from "./r2Storage";
import { createSupabaseServiceClient } from "./supabase/service";

type ResourceBucket = "notes" | "materials";

type ResourceSelectRow = {
  id: string;
  title: string;
  file_url: string;
  course_id: string;
  created_at: string | null;
};

export type PublicResourceItem = {
  id: string;
  title: string;
  courseTitle: string;
  createdAt: string | null;
  previewUrl: string | null;
};

async function fetchPublicResourceLibrary(bucket: ResourceBucket): Promise<PublicResourceItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  try {
    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from(bucket)
      .select("id, title, file_url, course_id, created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) {
      return [];
    }

    const rows = ((data ?? []) as ResourceSelectRow[]).filter((row) => !isVideoReference(row.file_url));
    const courseIds = Array.from(new Set(rows.map((row) => row.course_id).filter(Boolean)));
    const courseTitles = new Map<string, string>();

    if (courseIds.length > 0) {
      const { data: courses } = await service
        .from("courses")
        .select("id, title")
        .in("id", courseIds);

      ((courses ?? []) as Array<{ id: string; title: string | null }>).forEach((course) => {
        courseTitles.set(course.id, course.title ?? "Course");
      });
    }

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      courseTitle: courseTitles.get(row.course_id) ?? "Course",
      createdAt: row.created_at,
      previewUrl: null,
    }));
  } catch {
    return [];
  }
}

export async function fetchPublicNotesLibrary(): Promise<PublicResourceItem[]> {
  return fetchPublicResourceLibrary("notes");
}

export async function fetchPublicBooksLibrary(): Promise<PublicResourceItem[]> {
  return fetchPublicResourceLibrary("materials");
}
