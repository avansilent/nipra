import { NextResponse } from "next/server";
import { getAdminRouteContext, type AdminRouteError } from "../../../../lib/admin/route";
import { revalidateAdminContent, type RevalidationArea } from "../../../../lib/cacheInvalidation";

const validAreas = new Set<RevalidationArea>(["site", "courses", "learning", "all"]);

function normalizeArea(value: unknown): RevalidationArea {
  return typeof value === "string" && validAreas.has(value as RevalidationArea)
    ? (value as RevalidationArea)
    : "all";
}

export async function POST(request: Request) {
  try {
    await getAdminRouteContext();
    const body = (await request.json().catch(() => ({}))) as { area?: unknown };
    const area = normalizeArea(body.area);

    revalidateAdminContent(area);

    return NextResponse.json(
      { success: true, area },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json(
      { error: typedError.message ?? "Unable to refresh live website cache" },
      { status: typedError.status ?? 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
