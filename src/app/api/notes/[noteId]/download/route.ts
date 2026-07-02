import { NextResponse } from "next/server";
import { getAuthorizedResourceFile, getResourceFileRoutePath } from "../../../../../lib/resourceAccess";

type RouteParams = {
  params: Promise<{ noteId: string }>;
};

const getMode = (request: Request): "view" | "download" =>
  new URL(request.url).searchParams.get("mode") === "download" ? "download" : "view";

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { noteId } = await params;
    const access = await getAuthorizedResourceFile("note", noteId);

    if (!access.ok) {
      return access.response;
    }

    return NextResponse.json(
      {
        url: getResourceFileRoutePath("note", noteId, getMode(request)),
        title: access.resource.title,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Unable to open note right now." }, { status: 500 });
  }
}
