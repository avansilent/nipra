import { NextResponse } from "next/server";
import { getEnrollmentAccessMessage, isEnrollmentAccessActive, type EnrollmentAccessRow } from "./enrollmentAccess";
import { normalizeResourceVisibility, type ResourceVisibility } from "./resourceVisibility";
import { createSupabaseRouteClient } from "./supabase/route";
import { createSupabaseServiceClient } from "./supabase/service";
import { isVideoReference } from "./storageReferences";

export type ResourceFileKind = "note" | "material";

export type AuthorizedResourceFile = {
  id: string;
  title: string;
  file_url: string;
  course_id: string;
  institute_id: string;
  visibility: ResourceVisibility;
};

type ResourceSelectRow = AuthorizedResourceFile;

type ResourceAccessResult =
  | { ok: true; resource: AuthorizedResourceFile }
  | { ok: false; response: NextResponse };

const resourceTableByKind: Record<ResourceFileKind, "notes" | "materials"> = {
  note: "notes",
  material: "materials",
};

const normalizeRole = (role?: string | null): "admin" | "student" | null => {
  if (role === "admin" || role === "student") {
    return role;
  }

  return null;
};

export function getResourceFileRoutePath(kind: ResourceFileKind, resourceId: string, mode: "view" | "download") {
  const basePath = kind === "note" ? `/api/notes/${resourceId}/file` : `/api/materials/${resourceId}/file`;
  return `${basePath}?mode=${mode === "download" ? "download" : "view"}`;
}

export function getResourceFileRouteUrl(
  request: Request,
  kind: ResourceFileKind,
  resourceId: string,
  mode: "view" | "download"
) {
  return new URL(getResourceFileRoutePath(kind, resourceId, mode), request.url).toString();
}

export async function getAuthorizedResourceFile(
  kind: ResourceFileKind,
  resourceId: string
): Promise<ResourceAccessResult> {
  const service = createSupabaseServiceClient();
  const tableName = resourceTableByKind[kind];

  const { data: resource, error: resourceError } = await service
    .from(tableName)
    .select("id, title, file_url, course_id, institute_id, visibility")
    .eq("id", resourceId)
    .maybeSingle();

  if (resourceError || !resource) {
    return {
      ok: false,
      response: NextResponse.json({ error: kind === "note" ? "Note not found" : "Material not found" }, { status: 404 }),
    };
  }

  const normalizedResource = resource as ResourceSelectRow;

  if (kind === "material" && isVideoReference(normalizedResource.file_url)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Use the secure video player to open this lesson." }, { status: 400 }),
    };
  }

  const visibility = normalizeResourceVisibility(normalizedResource.visibility);
  const safeResource = { ...normalizedResource, visibility };

  if (visibility === "public") {
    return { ok: true, resource: safeResource };
  }

  const supabase = await createSupabaseRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Please login to open this file." }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institute_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = normalizeRole(profile?.role ?? user.app_metadata?.role ?? null);
  const instituteId =
    profile?.institute_id ??
    (user.app_metadata?.institute_id as string | undefined) ??
    null;

  if (!role || !instituteId || safeResource.institute_id !== instituteId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "You do not have access to this file." }, { status: 403 }),
    };
  }

  if (role === "student") {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", user.id)
      .eq("course_id", safeResource.course_id)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (!enrollment) {
      return {
        ok: false,
        response: NextResponse.json({ error: "You do not have access to this file." }, { status: 403 }),
      };
    }

    if (!isEnrollmentAccessActive(enrollment as EnrollmentAccessRow)) {
      return {
        ok: false,
        response: NextResponse.json({ error: getEnrollmentAccessMessage(enrollment as EnrollmentAccessRow) }, { status: 403 }),
      };
    }
  }

  return { ok: true, resource: safeResource };
}
