import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import {
  adminJsonError,
  getAdminSession,
  publicSessionColumns,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";

export async function POST(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    if (session.status === "cancelled") {
      return NextResponse.json({ error: "Cancelled sessions cannot be completed" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: updatedSession, error: updateError } = await context.serviceClient
      .from("class_sessions")
      .update({ status: "completed" })
      .eq("id", session.id)
      .eq("institute_id", context.instituteId)
      .select(publicSessionColumns())
      .single();

    if (updateError || !updatedSession) {
      return NextResponse.json({ error: updateError?.message ?? "Unable to end live session" }, { status: 500 });
    }

    const [{ data: materials }, { data: assignments }] = await Promise.all([
      context.serviceClient
        .from("session_materials")
        .update({ visible_from: now })
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId)
        .select("id"),
      context.serviceClient
        .from("assignments")
        .update({ is_published: true })
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId)
        .select("id"),
      context.serviceClient
        .from("class_session_meeting_links")
        .update({ join_window_closes_at: now })
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId),
    ]);

    return NextResponse.json({
      session: updatedSession,
      unlockedMaterials: materials?.length ?? 0,
      publishedAssignments: assignments?.length ?? 0,
    });
  } catch (error) {
    return adminJsonError(error, "Unable to end live session");
  }
}
