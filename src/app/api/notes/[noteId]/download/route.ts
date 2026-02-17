import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../../../lib/supabase/route";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";

type RouteParams = {
  params: Promise<{ noteId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { noteId } = await params;
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, title, file_url, course_id")
      .eq("id", noteId)
      .maybeSingle();

    if (noteError || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role ?? user.app_metadata?.role ?? user.user_metadata?.role;
    const isAdmin = role === "admin";

    if (!isAdmin) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("student_id", user.id)
        .eq("course_id", note.course_id)
        .maybeSingle();

      if (!enrollment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const service = createSupabaseServiceClient();
    const { data: signed, error: signedError } = await service.storage
      .from("notes")
      .createSignedUrl(note.file_url, 60);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signedError?.message ?? "Unable to create secure download link" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signed.signedUrl,
      title: note.title,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download note" },
      { status: 500 }
    );
  }
}
