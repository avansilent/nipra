import { NextResponse } from "next/server";
import { createTempPassword, getAdminRouteContext, type AdminRouteError } from "../../../../../../lib/admin/route";

type RouteParams = {
  params: Promise<{ studentId: string }>;
};

export async function POST(_request: Request, context: RouteParams) {
  try {
    const { studentId } = await context.params;
    const { routeClient, serviceClient, instituteId } = await getAdminRouteContext();

    const { data: profile } = await routeClient
      .from("profiles")
      .select("id, role, institute_id")
      .eq("id", studentId)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (!profile || profile.role !== "student") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const password = createTempPassword();
    const { error } = await serviceClient.auth.admin.updateUserById(studentId, { password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ password });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to reset password" }, { status: typedError.status ?? 500 });
  }
}