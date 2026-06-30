import { NextResponse } from "next/server";
import { getActiveCourseIds, getStudentRouteContext, studentJsonError } from "../../../../lib/student/onlineClasses";
import { normalizeResourceVisibility, type ResourceVisibility } from "../../../../lib/resourceVisibility";
import { isVideoReference } from "../../../../lib/storageReferences";

type ResourceRow = {
  id: string;
  title: string;
  file_url: string;
  course_id: string;
  visibility: ResourceVisibility;
  created_at?: string | null;
};

function toPortalResource(row: ResourceRow) {
  return {
    id: row.id,
    title: row.title,
    file_url: "",
    course_id: row.course_id,
    visibility: normalizeResourceVisibility(row.visibility),
    created_at: row.created_at ?? undefined,
  };
}

export async function GET() {
  try {
    const context = await getStudentRouteContext();
    const courseIds = await getActiveCourseIds(context);

    if (courseIds.length === 0) {
      return NextResponse.json(
        { notes: [], materials: [], videos: [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const [{ data: noteRows, error: notesError }, { data: materialRows, error: materialsError }] = await Promise.all([
      context.serviceClient
        .from("notes")
        .select("id, title, file_url, course_id, visibility, created_at")
        .eq("institute_id", context.instituteId)
        .in("visibility", ["student", "public"])
        .in("course_id", courseIds)
        .order("created_at", { ascending: false })
        .limit(12),
      context.serviceClient
        .from("materials")
        .select("id, title, file_url, course_id, visibility, created_at")
        .eq("institute_id", context.instituteId)
        .in("visibility", ["student", "public"])
        .in("course_id", courseIds)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

    const firstError = notesError ?? materialsError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const notes = ((noteRows ?? []) as ResourceRow[]).map(toPortalResource);
    const partitionedMaterials = ((materialRows ?? []) as ResourceRow[]).reduce(
      (accumulator, row) => {
        const safeResource = toPortalResource(row);

        if (isVideoReference(row.file_url)) {
          accumulator.videos.push(safeResource);
          return accumulator;
        }

        accumulator.materials.push(safeResource);
        return accumulator;
      },
      { materials: [] as ReturnType<typeof toPortalResource>[], videos: [] as ReturnType<typeof toPortalResource>[] }
    );

    return NextResponse.json(
      {
        notes,
        materials: partitionedMaterials.materials.slice(0, 12),
        videos: partitionedMaterials.videos.slice(0, 12),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to load student resources");
  }
}
