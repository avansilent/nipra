import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../../lib/supabase/route";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

const normalizeRole = (role?: string | null): "admin" | "student" | null => {
  if (role === "admin" || role === "student") {
    return role;
  }

  return null;
};

export const toSafeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);

export const getSafeFileExtension = (name: string, fallbackExtension = "") => {
  const match = name.toLowerCase().match(/(\.[a-z0-9]{1,10})$/);

  return match?.[1] ?? fallbackExtension;
};

type UploadContextResult =
  | { error: NextResponse }
  | {
      instituteId: string;
      service: ReturnType<typeof createSupabaseServiceClient>;
      userId: string;
    };

export async function resolveAdminUploadContext(): Promise<UploadContextResult> {
  const supabase = await createSupabaseRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const service = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("role, institute_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: NextResponse.json({ error: profileError.message }, { status: 500 }) };
  }

  const role = normalizeRole(profile?.role ?? user.app_metadata?.role ?? user.user_metadata?.role ?? null);
  const instituteId =
    profile?.institute_id ??
    (user.app_metadata?.institute_id as string | undefined) ??
    (user.user_metadata?.institute_id as string | undefined) ??
    null;

  if (role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (!instituteId) {
    return { error: NextResponse.json({ error: "Institute not assigned" }, { status: 403 }) };
  }

  return {
    instituteId,
    service,
    userId: user.id,
  };
}
