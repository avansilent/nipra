import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../../../lib/supabase/route";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";

const toSafeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role ?? user.app_metadata?.role ?? user.user_metadata?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const courseId = String(formData.get("courseId") ?? "").trim();
    const noteTitle = String(formData.get("title") ?? "").trim();
    const file = formData.get("file");

    if (!courseId) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const service = createSupabaseServiceClient();

    const { data: bucket } = await service.storage.getBucket("notes");
    if (!bucket) {
      await service.storage.createBucket("notes", { public: false });
    }

    const baseName = toSafeFileName(file.name.replace(/\.pdf$/i, "") || "note");
    const storagePath = `${courseId}/${Date.now()}-${baseName}.pdf`;

    const { error: uploadError } = await service.storage
      .from("notes")
      .upload(storagePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("notes")
      .insert({
        course_id: courseId,
        title: noteTitle || file.name,
        file_url: storagePath,
      })
      .select("id, title, course_id, file_url")
      .single();

    if (insertError) {
      await service.storage.from("notes").remove([storagePath]);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ note: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload note" },
      { status: 500 }
    );
  }
}
