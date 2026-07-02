import { NextResponse } from "next/server";
import { getAuthorizedResourceFile, getResourceFileRoutePath } from "../../../../../lib/resourceAccess";

type RouteParams = {
  params: Promise<{ materialId: string }>;
};

const getMode = (request: Request): "view" | "download" =>
  new URL(request.url).searchParams.get("mode") === "download" ? "download" : "view";

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { materialId } = await params;
    const access = await getAuthorizedResourceFile("material", materialId);

    if (!access.ok) {
      return access.response;
    }

    return NextResponse.json(
      {
        url: getResourceFileRoutePath("material", materialId, getMode(request)),
        title: access.resource.title,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Unable to open material right now." }, { status: 500 });
  }
}
