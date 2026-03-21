import { NextResponse } from "next/server";
import { getAdminRouteContext, sanitizeLoginId, type AdminRouteError } from "../../../../../lib/admin/route";

type StudentUpdatePayload = {
  name?: string;
  email?: string;
  loginId?: string;
};

type RouteParams = {
  params: Promise<{ studentId: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { studentId } = await context.params;
    const { routeClient, serviceClient, instituteId } = await getAdminRouteContext();
    const body = (await request.json()) as StudentUpdatePayload;

    const { data: profile } = await routeClient
      .from("profiles")
      .select("id, role, institute_id")
      .eq("id", studentId)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (!profile || profile.role !== "student") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const loginId = sanitizeLoginId(String(body.loginId ?? "").trim());

    if (!name || !email || !loginId) {
      return NextResponse.json({ error: "Name, email, and login ID are required" }, { status: 400 });
    }

    const { error: authError } = await serviceClient.auth.admin.updateUserById(studentId, {
      email,
      user_metadata: {
        name,
        role: "student",
        institute_id: instituteId,
        login_id: loginId,
      },
      app_metadata: {
        role: "student",
        institute_id: instituteId,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const { error: updateError } = await serviceClient
      .from("users")
      .update({ name, email, login_id: loginId })
      .eq("id", studentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ student: { id: studentId, name, email, login_id: loginId } });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to update student" }, { status: typedError.status ?? 500 });
  }
}

export async function DELETE(_request: Request, context: RouteParams) {
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

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(studentId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to delete student" }, { status: typedError.status ?? 500 });
  }
}