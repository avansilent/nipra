import { NextResponse } from "next/server";
import { AdminRouteError, createStudentEmail, createTempPassword, getAdminRouteContext, isStrongStudentPassword, sanitizeLoginId } from "../../../../lib/admin/route";

type StudentInsertPayload = {
  name?: string;
  email?: string;
  loginId?: string;
  password?: string;
};

const privateResponseHeaders = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

type AdminServiceClient = Awaited<ReturnType<typeof getAdminRouteContext>>["serviceClient"];

async function findExistingStudentByField(
  serviceClient: AdminServiceClient,
  field: "email" | "login_id",
  value: string,
  excludeStudentId?: string
) {
  let query = serviceClient
    .from("users")
    .select("id")
    .eq(field, value)
    .limit(1);

  if (excludeStudentId) {
    query = query.neq("id", excludeStudentId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureStudentIdentityAvailable(
  serviceClient: AdminServiceClient,
  email: string,
  loginId: string,
  excludeStudentId?: string
) {
  const [existingEmail, existingLogin] = await Promise.all([
    findExistingStudentByField(serviceClient, "email", email, excludeStudentId),
    findExistingStudentByField(serviceClient, "login_id", loginId, excludeStudentId),
  ]);

  if (existingEmail) {
    throw new AdminRouteError("A student with this email already exists.", 409);
  }

  if (existingLogin) {
    throw new AdminRouteError("A student with this login ID already exists.", 409);
  }
}

async function upsertStudentRows(
  serviceClient: AdminServiceClient,
  student: { id: string; name: string; email: string; loginId: string; instituteId: string }
) {
  const { error: profileError } = await serviceClient
    .from("profiles")
    .upsert(
      {
        id: student.id,
        role: "student",
        institute_id: student.instituteId,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    throw profileError;
  }

  const { error: userError } = await serviceClient
    .from("users")
    .upsert(
      {
        id: student.id,
        name: student.name,
        email: student.email,
        login_id: student.loginId,
        role: "student",
      },
      { onConflict: "id" }
    );

  if (userError) {
    throw userError;
  }
}

export async function GET() {
  try {
    const { routeClient, serviceClient, instituteId } = await getAdminRouteContext();

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

    const studentIdSet = new Set(studentIds);
    const phoneByStudentId = new Map<string, string | null>();
    const perPage = 1000;

    for (let page = 1; page <= 20 && phoneByStudentId.size < studentIds.length; page += 1) {
      const { data: authPage, error: authError } = await serviceClient.auth.admin.listUsers({ page, perPage });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      const authUsers = authPage.users ?? [];
      for (const authUser of authUsers) {
        if (studentIdSet.has(authUser.id)) {
          phoneByStudentId.set(authUser.id, authUser.phone ?? null);
        }
      }

      if (authUsers.length < perPage) {
        break;
      }
    }

    const studentsWithPhone = (students ?? []).map((student) => ({
      ...student,
      phone: phoneByStudentId.get(student.id) ?? null,
    }));

    return NextResponse.json({ students: studentsWithPhone });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to fetch students" }, { status: typedError.status ?? 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { serviceClient, instituteId, userId } = await getAdminRouteContext();
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
    const requestedPassword = String(body.password ?? "").trim();
    if (requestedPassword && !isStrongStudentPassword(requestedPassword)) {
      return NextResponse.json(
        { error: "Password must be at least 10 characters and include a letter and a number." },
        { status: 400 }
      );
    }

    const password = requestedPassword || createTempPassword();

    await ensureStudentIdentityAvailable(serviceClient, email, computedLoginId);

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

    try {
      await upsertStudentRows(serviceClient, {
        id: created.user.id,
        name,
        email,
        loginId: computedLoginId,
        instituteId,
      });
    } catch (syncError) {
      await serviceClient.auth.admin.deleteUser(created.user.id);
      throw syncError;
    }

    return NextResponse.json(
      {
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
      },
      { headers: privateResponseHeaders }
    );
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to create student" }, { status: typedError.status ?? 500 });
  }
}
