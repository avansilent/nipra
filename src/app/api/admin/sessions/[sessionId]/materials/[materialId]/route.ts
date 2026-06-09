import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../../lib/admin/route";
import {
  adminJsonError,
  deleteMaterialFiles,
  getAdminSession,
  getStoredFilePath,
  requireUuid,
} from "../../../../../../../lib/admin/onlineClasses";

type RouteParams = {
  params: Promise<{ sessionId: string; materialId: string }>;
};

export async function DELETE(_request: Request, contextParams: RouteParams) {
  try {
    const { sessionId, materialId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);
    requireUuid(materialId, "Material");

    const { data: material, error: loadError } = await context.serviceClient
      .from("session_materials")
      .select("id, file_path")
      .eq("id", materialId)
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }

    if (!material) {
      return NextResponse.json({ error: "Material not found for this session" }, { status: 404 });
    }

    const { error: deleteError } = await context.serviceClient
      .from("session_materials")
      .delete()
      .eq("id", material.id)
      .eq("institute_id", context.instituteId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await deleteMaterialFiles(context, [getStoredFilePath(material)]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminJsonError(error, "Unable to delete session material");
  }
}
