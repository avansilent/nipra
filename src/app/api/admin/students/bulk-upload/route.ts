import Papa from "papaparse";
import { NextResponse } from "next/server";
import { AdminRouteError, createStudentEmail, createTempPassword, getAdminRouteContext, isStrongStudentPassword, sanitizeLoginId } from "../../../../../lib/admin/route";

type CsvStudentRow = {
  name?: string;
  email?: string;
  loginId?: string;
  login_id?: string;
  password?: string;
};

const privateResponseHeaders = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

type AdminServiceClient = Awaited<ReturnType<typeof getAdminRouteContext>>["serviceClient"];

async function studentIdentityExists(serviceClient: AdminServiceClient, field: "email" | "login_id", value: string) {
  const { data, error } = await serviceClient
    .from("users")
    .select("id")
    .eq(field, value)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
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

export async function POST(request: Request) {
  try {
    const { serviceClient, instituteId, userId } = await getAdminRouteContext();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }

    const csvText = await file.text();
    const parsed = Papa.parse<CsvStudentRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: parsed.errors[0]?.message ?? "Unable to parse CSV" }, { status: 400 });
    }

    const results: Array<{ row: number; status: "created" | "failed"; name: string; email: string; loginId: string; password?: string; error?: string }> = [];

    for (const [index, row] of parsed.data.entries()) {
      const name = String(row.name ?? "").trim();
      const rawLoginValue = (row.loginId ?? row.login_id ?? name) || `student-${Date.now()}-${index}`;
      const loginId = sanitizeLoginId(String(rawLoginValue).trim());
      const email = String(row.email ?? "").trim().toLowerCase() || createStudentEmail(loginId);
      const requestedPassword = String(row.password ?? "").trim();
      if (requestedPassword && !isStrongStudentPassword(requestedPassword)) {
        results.push({
          row: index + 2,
          status: "failed",
          name,
          email,
          loginId,
          error: "Password must be at least 10 characters and include a letter and a number",
        });
        continue;
      }

      const password = requestedPassword || createTempPassword();

      if (!name || !loginId) {
        results.push({ row: index + 2, status: "failed", name, email, loginId, error: "Missing required name or login ID" });
        continue;
      }

      const [emailExists, loginExists] = await Promise.all([
        studentIdentityExists(serviceClient, "email", email),
        studentIdentityExists(serviceClient, "login_id", loginId),
      ]);

      if (emailExists || loginExists) {
        results.push({
          row: index + 2,
          status: "failed",
          name,
          email,
          loginId,
          error: emailExists ? "Email already exists" : "Login ID already exists",
        });
        continue;
      }

      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: "student",
          institute_id: instituteId,
          login_id: loginId,
          invited_by_admin_id: userId,
        },
        app_metadata: {
          role: "student",
          institute_id: instituteId,
        },
      });

      if (createError || !created.user) {
        results.push({ row: index + 2, status: "failed", name, email, loginId, error: createError?.message ?? "Unable to create student" });
        continue;
      }

      try {
        await upsertStudentRows(serviceClient, {
          id: created.user.id,
          name,
          email,
          loginId,
          instituteId,
        });
      } catch (syncError) {
        await serviceClient.auth.admin.deleteUser(created.user.id);
        results.push({
          row: index + 2,
          status: "failed",
          name,
          email,
          loginId,
          error: syncError instanceof Error ? syncError.message : "Unable to sync student account",
        });
        continue;
      }

      results.push({ row: index + 2, status: "created", name, email, loginId, password });
    }

    return NextResponse.json(
      {
        created: results.filter((item) => item.status === "created").length,
        failed: results.filter((item) => item.status === "failed").length,
        results,
      },
      { headers: privateResponseHeaders }
    );
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to bulk upload students" }, { status: typedError.status ?? 500 });
  }
}
