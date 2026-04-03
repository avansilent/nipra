import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { defaultHomeContent, mergeHomeContent } from "../../../../data/homeContent";
import { defaultSiteSettings, mergeSiteSettings } from "../../../../data/siteSettings";
import { getAdminRouteContext, type AdminRouteError } from "../../../../lib/admin/route";
import { homeContentCacheTag } from "../../../../lib/homeContent";
import { siteSettingsCacheTag } from "../../../../lib/siteSettings";

type SiteContentKey = "home" | "settings";

export async function GET() {
  try {
    const { routeClient } = await getAdminRouteContext();

    const { data, error } = await routeClient
      .from("site_content")
      .select("key, data")
      .in("key", ["home", "settings"]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = new Map((data ?? []).map((item) => [item.key, item.data]));

    return NextResponse.json({
      home: mergeHomeContent((mapped.get("home") as Partial<typeof defaultHomeContent>) ?? undefined),
      settings: mergeSiteSettings((mapped.get("settings") as Partial<typeof defaultSiteSettings>) ?? undefined),
    });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to load site content" }, { status: typedError.status ?? 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { routeClient } = await getAdminRouteContext();
    const body = (await request.json()) as { key?: SiteContentKey; data?: unknown };

    if (body.key !== "home" && body.key !== "settings") {
      return NextResponse.json({ error: "Unsupported content key" }, { status: 400 });
    }

    const normalizedData = body.key === "home"
      ? mergeHomeContent((body.data as Partial<typeof defaultHomeContent>) ?? undefined)
      : mergeSiteSettings((body.data as Partial<typeof defaultSiteSettings>) ?? undefined);

    const { error } = await routeClient
      .from("site_content")
      .upsert({ key: body.key, data: normalizedData }, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateTag(body.key === "home" ? homeContentCacheTag : siteSettingsCacheTag, "max");

    return NextResponse.json({ success: true, key: body.key, data: normalizedData });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to update site content" }, { status: typedError.status ?? 500 });
  }
}