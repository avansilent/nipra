import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../lib/cacheInvalidation";

type RouteParams = {
  params: Promise<{ noteId: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function DELETE(_request: Request, contextParams: RouteParams) {
  try {
    const { noteId } = await contextParams.params;

    if (!isUuid(noteId)) {
      return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    }

    const context = await getAdminRouteContext();
    const { data: note, error: loadError } = await context.serviceClient
      .from("notes")
      .select("id, file_url")
      .eq("id", noteId)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const { error: deleteError } = await context.serviceClient
      .from("notes")
      .delete()
      .eq("id", note.id)
      .eq("institute_id", context.instituteId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (note.file_url) {
      await context.serviceClient.storage.from("notes").remove([note.file_url]);
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
