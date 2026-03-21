import { createSupabaseRouteClient } from "../supabase/route";
import { createSupabaseServiceClient } from "../supabase/service";

export class AdminRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type AdminRouteContext = {
  routeClient: Awaited<ReturnType<typeof createSupabaseRouteClient>>;
  serviceClient: ReturnType<typeof createSupabaseServiceClient>;
  userId: string;
  instituteId: string;
};

export async function getAdminRouteContext(): Promise<AdminRouteContext> {
  const routeClient = await createSupabaseRouteClient();
  const serviceClient = createSupabaseServiceClient();

  const {
    data: { user },
  } = await routeClient.auth.getUser();

  if (!user) {
    throw new AdminRouteError("Unauthorized", 401);
  }

  const { data: profile } = await routeClient
    .from("profiles")
    .select("role, institute_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new AdminRouteError("Forbidden", 403);
  }

  if (!profile?.institute_id) {
    throw new AdminRouteError("Institute not assigned", 403);
  }

  return {
    routeClient,
    serviceClient,
    userId: user.id,
    instituteId: profile.institute_id,
  };
}

export function sanitizeLoginId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function createTempPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function createStudentEmail(loginId: string) {
  return `${loginId}@students.nipracademy.local`;
}