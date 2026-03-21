import { NextResponse } from "next/server";
import { createStudentEmail, createTempPassword, getAdminRouteContext, sanitizeLoginId, type AdminRouteError } from "../../../../lib/admin/route";

type StudentInsertPayload = {
  name?: string;
  email?: string;
  loginId?: string;
  password?: string;
};

export async function GET() {
  try {
    const { routeClient, instituteId } = await getAdminRouteContext();

    const { data: profileRows, error: profileError } = await routeClient
      .from("profiles")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const studentIds = (profileRows ?? []).map((item) => item.id);
    if (studentIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const { data: students, error: usersError } = await routeClient
      .from("users")
      .select("id, name, role, email, login_id, created_at")
      .in("id", studentIds)
      .order("created_at", { ascending: false });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    return NextResponse.json({ students: students ?? [] });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to fetch students" }, { status: typedError.status ?? 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { serviceClient, instituteId, routeClient, userId } = await getAdminRouteContext();
    const body = (await request.json()) as StudentInsertPayload;

    const name = String(body.name ?? "").trim();
    const explicitLoginId = String(body.loginId ?? "").trim();
    const computedLoginId = sanitizeLoginId(explicitLoginId || name || String(body.email ?? "").split("@")[0] || `student-${Date.now()}`);

    if (!name) {
      return NextResponse.json({ error: "Student name is required" }, { status: 400 });
    }

    if (!computedLoginId) {
      return NextResponse.json({ error: "Unable to generate login ID" }, { status: 400 });
    }

    const email = String(body.email ?? "").trim().toLowerCase() || createStudentEmail(computedLoginId);
    const password = String(body.password ?? "").trim() || createTempPassword();

    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: "student",
        institute_id: instituteId,
        login_id: computedLoginId,
        invited_by_admin_id: userId,
      },
      app_metadata: {
        role: "student",
        institute_id: instituteId,
      },
    });

    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? "Unable to create student" }, { status: 400 });
    }

    await serviceClient
      .from("users")
      .update({ name, email, login_id: computedLoginId, role: "student" })
      .eq("id", created.user.id);

    return NextResponse.json({
      student: {
        id: created.user.id,
        name,
        email,
        login_id: computedLoginId,
        role: "student",
      },
      credentials: {
        email,
        loginId: computedLoginId,
        password,
      },
    });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to create student" }, { status: typedError.status ?? 500 });
  }
}