import { NextResponse } from "next/server";
import { createCloudflareStreamEmbedUrl } from "../../../../../lib/cloudflareStream";
import { getEnrollmentAccessMessage, isEnrollmentAccessActive, type EnrollmentAccessRow } from "../../../../../lib/enrollmentAccess";
import { createSignedStorageUrl, isR2VideoReference } from "../../../../../lib/r2Storage";
import { isCloudflareStreamReference } from "../../../../../lib/storageReferences";
import { createSupabaseRouteClient } from "../../../../../lib/supabase/route";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

function normalizeRole(role?: string | null) {
  return role === "admin" || role === "student" ? role : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { videoId } = await context.params;
  const supabase = await createSupabaseRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("role, institute_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const role = normalizeRole(profile?.role ?? user.app_metadata?.role ?? null);
  const instituteId =
    profile?.institute_id ??
    (user.app_metadata?.institute_id as string | undefined) ??
    null;

  if (role !== "student" || !instituteId) {
    return NextResponse.json({ error: "Student access required." }, { status: 403 });
  }

  const { data: video, error: videoError } = await service
    .from("materials")
    .select("id, title, course_id, institute_id, file_url, visibility")
    .eq("id", videoId)
    .eq("institute_id", instituteId)
    .maybeSingle();

  if (videoError) {
    return NextResponse.json({ error: videoError.message }, { status: 500 });
  }

  if (!video || (!isCloudflareStreamReference(video.file_url) && !isR2VideoReference(video.file_url)) || video.visibility !== "student") {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  const { data: enrollment, error: enrollmentError } = await service
    .from("enrollments")
    .select("*")
    .eq("student_id", user.id)
    .eq("course_id", video.course_id)
    .eq("institute_id", instituteId)
    .maybeSingle();

  if (enrollmentError) {
    return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
  }

  if (!enrollment) {
    return NextResponse.json({ error: "This video belongs to a course not assigned to this student." }, { status: 403 });
  }

  if (!isEnrollmentAccessActive(enrollment as EnrollmentAccessRow)) {
    return NextResponse.json({ error: getEnrollmentAccessMessage(enrollment as EnrollmentAccessRow) }, { status: 403 });
  }

  const embedUrl = isCloudflareStreamReference(video.file_url)
    ? await createCloudflareStreamEmbedUrl(video.file_url)
    : null;
  const videoUrl = isR2VideoReference(video.file_url)
    ? await createSignedStorageUrl(video.file_url, 60 * 60, video.title)
    : null;

  if (!embedUrl && !videoUrl) {
    return NextResponse.json({ error: "Unable to open video." }, { status: 500 });
  }

  return NextResponse.json(
    {
      title: video.title,
      embedUrl,
      videoUrl,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
