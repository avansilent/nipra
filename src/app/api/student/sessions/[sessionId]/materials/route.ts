import { NextResponse } from "next/server";
import {
  createSignedMaterialUrl,
  getStoredFilePath,
  getStudentRouteContext,
  getStudentSession,
  studentJsonError,
  type RouteParams,
} from "../../../../../../lib/student/onlineClasses";

export async function GET(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getStudentRouteContext();
    const session = await getStudentSession(context, sessionId);
    const now = new Date().toISOString();

    const { data: materials, error } = await context.serviceClient
      .from("session_materials")
      .select("id, session_id, material_type, title, description, file_path, external_url, visible_from, sort_order, created_at")
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .not("visible_from", "is", null)
      .lte("visible_from", now)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeMaterials = await Promise.all(
      (materials ?? []).map(async (material) => {
        const filePath = getStoredFilePath(material);
        const safeMaterial = { ...(material as Record<string, unknown>) };
        delete safeMaterial.file_path;

        return {
          ...safeMaterial,
          hasFile: Boolean(filePath),
          signedUrl: await createSignedMaterialUrl(context, filePath),
        };
      })
    );

    return NextResponse.json(
      {
        session: {
          id: session.id,
          title: session.title,
          status: session.status,
        },
        materials: safeMaterials,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to load session materials");
  }
}
