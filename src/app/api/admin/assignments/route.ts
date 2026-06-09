import { NextResponse } from "next/server";
import { AdminRouteError, getAdminRouteContext, type AdminRouteContext } from "../../../../lib/admin/route";
import {
  adminJsonError,
  createSignedMaterialUrl,
  deleteMaterialFiles,
  ensureAdminCourse,
  getStoredFilePath,
  getAdminSession,
  publicAssignmentColumns,
  requirePdfFile,
  stringField,
  toPublicAssignment,
  uploadAdminFile,
} from "../../../../lib/admin/onlineClasses";

async function readAssignmentPayload(request: Request): Promise<{ values: Record<string, unknown>; file: FormDataEntryValue | null }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      values: {
        course_id: formData.get("course_id") ?? formData.get("courseId"),
        session_id: formData.get("session_id") ?? formData.get("sessionId"),
        title: formData.get("title"),
        description: formData.get("description"),
        instructions: formData.get("instructions"),
        due_date: formData.get("due_date") ?? formData.get("dueDate"),
        max_marks: formData.get("max_marks") ?? formData.get("maxMarks"),
        is_published: formData.get("is_published") ?? formData.get("isPublished"),
      },
      file: formData.get("file"),
    };
  }

  return {
    values: (await request.json()) as Record<string, unknown>,
    file: null,
  };
}

function booleanField(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const text = stringField(value).toLowerCase();
  if (text === "true" || text === "1" || text === "yes") {
    return true;
  }
  if (text === "false" || text === "0" || text === "no") {
    return false;
  }

  return fallback;
}

function nullableDate(value: unknown) {
  const text = stringField(value);
  if (!text) {
    return null;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new AdminRouteError("Due date is invalid", 400);
  }

  return date.toISOString();
}

export async function GET(request: Request) {
  try {
    const context = await getAdminRouteContext();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") ?? searchParams.get("course_id");
    const sessionId = searchParams.get("sessionId") ?? searchParams.get("session_id");

    let query = context.serviceClient
      .from("assignments")
      .select(`${publicAssignmentColumns()}, file_path, course:courses(id, title, mode), session:class_sessions(id, title, session_date, start_time, end_time, status)`)
      .eq("institute_id", context.instituteId)
      .order("created_at", { ascending: false });

    if (courseId) {
      await ensureAdminCourse(context, courseId);
      query = query.eq("course_id", courseId);
    }

    if (sessionId) {
      const session = await getAdminSession(context, sessionId);
      query = query.eq("session_id", session.id);
    }

    const { data: assignments, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assignments: (assignments ?? []).map(toPublicAssignment) });
  } catch (error) {
    return adminJsonError(error, "Unable to load assignments");
  }
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  let cleanupContext: AdminRouteContext | null = null;

  try {
    const context = await getAdminRouteContext();
    cleanupContext = context;
    const { values, file } = await readAssignmentPayload(request);
    const sessionId = stringField(values.session_id ?? values.sessionId);
    let courseId = stringField(values.course_id ?? values.courseId);
    const title = stringField(values.title);

    if (!title) {
      return NextResponse.json({ error: "Assignment title is required" }, { status: 400 });
    }

    if (sessionId) {
      const session = await getAdminSession(context, sessionId);
      courseId = courseId || session.course_id;
      if (courseId !== session.course_id) {
        return NextResponse.json({ error: "Assignment course must match the session course" }, { status: 400 });
      }
    }

    await ensureAdminCourse(context, courseId);

    if (file instanceof File && file.size > 0) {
      requirePdfFile(file, "Assignment file");
      uploadedPath = await uploadAdminFile(context, "materials", `assignments/${courseId}`, file, "assignment", ".pdf");
    }

    const maxMarks = Number(values.max_marks ?? values.maxMarks ?? 100);
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      return NextResponse.json({ error: "Max marks must be greater than 0" }, { status: 400 });
    }

    const { data: assignment, error: insertError } = await context.serviceClient
      .from("assignments")
      .insert({
        institute_id: context.instituteId,
        course_id: courseId,
        session_id: sessionId || null,
        title,
        description: stringField(values.description) || null,
        instructions: stringField(values.instructions) || null,
        file_path: uploadedPath,
        due_date: nullableDate(values.due_date ?? values.dueDate),
        max_marks: Math.round(maxMarks),
        is_published: booleanField(values.is_published ?? values.isPublished),
      })
      .select(`${publicAssignmentColumns()}, file_path`)
      .single();

    if (insertError || !assignment) {
      await deleteMaterialFiles(context, [uploadedPath]);
      return NextResponse.json({ error: insertError?.message ?? "Unable to create assignment" }, { status: 500 });
    }

    return NextResponse.json({
      assignment: {
        ...toPublicAssignment(assignment),
        signedUrl: await createSignedMaterialUrl(context, getStoredFilePath(assignment)),
      },
    });
  } catch (error) {
    if (cleanupContext && uploadedPath) {
      await deleteMaterialFiles(cleanupContext, [uploadedPath]);
    }
    return adminJsonError(error, "Unable to create assignment");
  }
}
