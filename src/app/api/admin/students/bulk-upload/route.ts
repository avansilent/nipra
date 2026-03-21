import Papa from "papaparse";
import { NextResponse } from "next/server";
import { createStudentEmail, createTempPassword, getAdminRouteContext, sanitizeLoginId, type AdminRouteError } from "../../../../../lib/admin/route";

type CsvStudentRow = {
  name?: string;
  email?: string;
  loginId?: string;
  login_id?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const { serviceClient, instituteId, routeClient, userId } = await getAdminRouteContext();
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
      const password = String(row.password ?? "").trim() || createTempPassword();

      if (!name || !loginId) {
        results.push({ row: index + 2, status: "failed", name, email, loginId, error: "Missing required name or login ID" });
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

      await serviceClient
        .from("users")
        .update({ name, email, login_id: loginId, role: "student" })
        .eq("id", created.user.id);

      results.push({ row: index + 2, status: "created", name, email, loginId, password });
    }

    return NextResponse.json({
      created: results.filter((item) => item.status === "created").length,
      failed: results.filter((item) => item.status === "failed").length,
      results,
    });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to bulk upload students" }, { status: typedError.status ?? 500 });
  }
}