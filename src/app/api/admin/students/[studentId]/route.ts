import { NextResponse } from "next/server";
import { AdminRouteError, createStudentEmail, getAdminRouteContext, sanitizeLoginId } from "../../../../../lib/admin/route";

type StudentUpdatePayload = {
  name?: string;
  email?: string;
  loginId?: string;
};

type RouteParams = {
  params: Promise<{ studentId: string }>;
};

type AdminServiceClient = Awaited<ReturnType<typeof getAdminRouteContext>>["serviceClient"];

async function findExistingStudentByField(
  serviceClient: AdminServiceClient,
  field: "email" | "login_id",
  value: string,
  excludeStudentId: string
) {
  const { data, error } = await serviceClient
    .from("users")
    .select("id")
    .eq(field, value)
    .neq("id", excludeStudentId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureStudentIdentityAvailable(
  serviceClient: AdminServiceClient,
  email: string,
  loginId: string,
  studentId: string
) {
  const [existingEmail, existingLogin] = await Promise.all([
    findExistingStudentByField(serviceClient, "email", email, studentId),
    findExistingStudentByField(serviceClient, "login_id", loginId, studentId),
  ]);

  if (existingEmail) {
    throw new AdminRouteError("A student with this email already exists.", 409);
  }

  if (existingLogin) {
    throw new AdminRouteError("A student with this login ID already exists.", 409);
  }
}

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
    const loginId = sanitizeLoginId(String(body.loginId ?? "").trim() || name);
    const email = String(body.email ?? "").trim().toLowerCase() || createStudentEmail(loginId);

    if (!name || !loginId) {
      return NextResponse.json({ error: "Student name and login ID are required" }, { status: 400 });
    }

    await ensureStudentIdentityAvailable(serviceClient, email, loginId, studentId);

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

    const { error: profileError } = await serviceClient
      .from("profiles")
      .upsert(
        {
          id: studentId,
          role: "student",
          institute_id: instituteId,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const { error: updateError } = await serviceClient
      .from("users")
      .upsert(
        {
          id: studentId,
          name,
          email,
          login_id: loginId,
          role: "student",
        },
        { onConflict: "id" }
      );

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
