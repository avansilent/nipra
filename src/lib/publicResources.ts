import { createSupabaseServiceClient } from "./supabase/service";

type ResourceBucket = "notes" | "materials";

type RelatedCourse = { title: string } | Array<{ title: string }> | null;

type ResourceSelectRow = {
  id: string;
  title: string;
  file_url: string;
  course_id: string;
  created_at: string | null;
  course: RelatedCourse;
};

export type PublicResourceItem = {
  id: string;
  title: string;
  courseTitle: string;
  createdAt: string | null;
  previewUrl: string | null;
};

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

async function fetchPublicResourceLibrary(bucket: ResourceBucket): Promise<PublicResourceItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  try {
    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from(bucket)
      .select("id, title, file_url, course_id, created_at, course:course_id (title)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) {
      return [];
    }

    const rows = (data ?? []) as ResourceSelectRow[];

    return Promise.all(
      rows.map(async (row) => {
        const { data: signed } = await service.storage.from(bucket).createSignedUrl(row.file_url, 3600);

        return {
          id: row.id,
          title: row.title,
          courseTitle: singleRelation(row.course)?.title ?? "Course",
          createdAt: row.created_at,
          previewUrl: signed?.signedUrl ?? null,
        };
      })
    );
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