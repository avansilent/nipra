import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../../../lib/supabase/route";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";

type RouteParams = {
  params: Promise<{ materialId: string }>;
};

const normalizeRole = (role?: string | null): "admin" | "student" | null => {
  if (role === "admin" || role === "student") {
    return role;
  }
  return null;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { materialId } = await params;
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: material, error: materialError } = await supabase
      .from("materials")
      .select("id, title, file_url, course_id, institute_id")
      .eq("id", materialId)
      .maybeSingle();

    if (materialError || !material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, institute_id")
      .eq("id", user.id)
      .maybeSingle();

    const role = normalizeRole(profile?.role ?? null);
    const instituteId = profile?.institute_id ?? null;

    if (!role || !instituteId || material.institute_id !== instituteId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role === "student") {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("student_id", user.id)
        .eq("course_id", material.course_id)
        .eq("institute_id", instituteId)
        .maybeSingle();

      if (!enrollment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const service = createSupabaseServiceClient();
    const { data: signed, error: signedError } = await service.storage
      .from("materials")
      .createSignedUrl(material.file_url, 60);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signedError?.message ?? "Unable to create secure download link" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signed.signedUrl,
      title: material.title,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download material" },
      { status: 500 }
    );
  }
}
