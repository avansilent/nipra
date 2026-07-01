import { NextResponse } from "next/server";
import { getEnrollmentAccessMessage, isEnrollmentAccessActive, type EnrollmentAccessRow } from "../../../../../lib/enrollmentAccess";
import { createSupabaseRouteClient } from "../../../../../lib/supabase/route";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";
import { normalizeResourceVisibility } from "../../../../../lib/resourceVisibility";
import { createSignedStorageUrl } from "../../../../../lib/r2Storage";

type RouteParams = {
  params: Promise<{ noteId: string }>;
};

const getDispositionMode = (request: Request) =>
  new URL(request.url).searchParams.get("mode") === "download" ? "attachment" : "inline";

const buildSignedNoteResponse = async (
  filePath: string,
  title: string,
  dispositionMode: "inline" | "attachment"
) => {
  const signedUrl = await createSignedStorageUrl(filePath, 300, title, dispositionMode);

  if (!signedUrl) {
    return NextResponse.json(
      { error: "Unable to create secure file link" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      url: signedUrl,
      title,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const dispositionMode = getDispositionMode(request);
    const { noteId } = await params;
    const service = createSupabaseServiceClient();

    const { data: note, error: noteError } = await service
      .from("notes")
      .select("id, title, file_url, course_id, institute_id, visibility")
      .eq("id", noteId)
      .maybeSingle();

    if (noteError || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const visibility = normalizeResourceVisibility(note.visibility);

    if (visibility === "public") {
      return buildSignedNoteResponse(note.file_url, note.title, dispositionMode);
    }

    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, institute_id")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role ?? user.app_metadata?.role;
    const instituteId =
      profile?.institute_id ??
      (user.app_metadata?.institute_id as string | undefined) ??
      null;

    const isAdmin = role === "admin";

    if (!instituteId || note.institute_id !== instituteId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isAdmin) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", user.id)
        .eq("course_id", note.course_id)
        .eq("institute_id", instituteId)
        .maybeSingle();

      if (!enrollment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (!isEnrollmentAccessActive(enrollment as EnrollmentAccessRow)) {
        return NextResponse.json({ error: getEnrollmentAccessMessage(enrollment as EnrollmentAccessRow) }, { status: 403 });
      }
    }

    return buildSignedNoteResponse(note.file_url, note.title, dispositionMode);
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to download note" },
      { status: 500 }
    );
  }
}
