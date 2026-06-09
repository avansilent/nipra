import { NextResponse } from "next/server";
import { AdminRouteError, getAdminRouteContext, type AdminRouteContext } from "../../../../../lib/admin/route";
import {
  adminJsonError,
  createSignedMaterialUrl,
  deleteMaterialFiles,
  ensureAdminCourse,
  getAdminAssignment,
  getAdminSession,
  getStoredFilePath,
  publicAssignmentColumns,
  requirePdfFile,
  stringField,
  toPublicAssignment,
  type RouteParams,
  uploadAdminFile,
} from "../../../../../lib/admin/onlineClasses";

async function readAssignmentPatchPayload(request: Request): Promise<{ values: Record<string, unknown>; file: FormDataEntryValue | null }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const values: Record<string, unknown> = {};
    const fields = ["course_id", "courseId", "session_id", "sessionId", "title", "description", "instructions", "due_date", "dueDate", "max_marks", "maxMarks", "is_published", "isPublished"];

    fields.forEach((field) => {
      if (formData.has(field)) {
        values[field] = formData.get(field);
      }
    });

    return { values, file: formData.get("file") };
  }

  return {
    values: (await request.json()) as Record<string, unknown>,
    file: null,
  };
}

function booleanField(value: unknown, fallback: boolean) {
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

export async function GET(_request: Request, contextParams: RouteParams<"assignmentId">) {
  try {
    const { assignmentId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const assignment = await getAdminAssignment(context, assignmentId);

    const [{ data: course }, { data: session }, { count }] = await Promise.all([
      context.serviceClient.from("courses").select("id, title, mode").eq("id", assignment.course_id).eq("institute_id", context.instituteId).maybeSingle(),
      assignment.session_id
        ? context.serviceClient
            .from("class_sessions")
            .select("id, title, session_date, start_time, end_time, status")
            .eq("id", assignment.session_id)
            .eq("institute_id", context.instituteId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      context.serviceClient
        .from("assignment_submissions")
        .select("id", { count: "exact", head: true })
        .eq("assignment_id", assignment.id)
        .eq("institute_id", context.instituteId),
    ]);

    return NextResponse.json({
      assignment: {
        ...toPublicAssignment(assignment),
        course,
        session,
        submissionCount: count ?? 0,
        signedUrl: await createSignedMaterialUrl(context, getStoredFilePath(assignment)),
      },
    });
  } catch (error) {
    return adminJsonError(error, "Unable to load assignment");
  }
}

export async function PATCH(request: Request, contextParams: RouteParams<"assignmentId">) {
  let uploadedPath: string | null = null;
  let cleanupContext: AdminRouteContext | null = null;

  try {
    const { assignmentId } = await contextParams.params;
    const context = await getAdminRouteContext();
    cleanupContext = context;
    const assignment = await getAdminAssignment(context, assignmentId);
    const { values, file } = await readAssignmentPatchPayload(request);
    const patch: Record<string, unknown> = {};

    let nextCourseId = "course_id" in values || "courseId" in values ? stringField(values.course_id ?? values.courseId) : assignment.course_id;
    let nextSessionId: string | null = assignment.session_id ?? null;

    if ("session_id" in values || "sessionId" in values) {
      const requestedSessionId = stringField(values.session_id ?? values.sessionId);
      nextSessionId = requestedSessionId || null;
    }

    if (nextSessionId) {
      const session = await getAdminSession(context, nextSessionId);
      nextCourseId = nextCourseId || session.course_id;
      if (nextCourseId !== session.course_id) {
        return NextResponse.json({ error: "Assignment course must match the session course" }, { status: 400 });
      }
    }

    await ensureAdminCourse(context, nextCourseId);
    patch.course_id = nextCourseId;
    patch.session_id = nextSessionId;

    if ("title" in values) {
      const title = stringField(values.title);
      if (!title) {
        return NextResponse.json({ error: "Assignment title is required" }, { status: 400 });
      }
      patch.title = title;
    }

    if ("description" in values) {
      patch.description = stringField(values.description) || null;
    }

    if ("instructions" in values) {
      patch.instructions = stringField(values.instructions) || null;
    }

    if ("due_date" in values || "dueDate" in values) {
      patch.due_date = nullableDate(values.due_date ?? values.dueDate);
    }

    if ("max_marks" in values || "maxMarks" in values) {
      const maxMarks = Number(values.max_marks ?? values.maxMarks);
      if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
        return NextResponse.json({ error: "Max marks must be greater than 0" }, { status: 400 });
      }
      patch.max_marks = Math.round(maxMarks);
    }

    if ("is_published" in values || "isPublished" in values) {
      patch.is_published = booleanField(values.is_published ?? values.isPublished, assignment.is_published);
    }

    if (file instanceof File && file.size > 0) {
      requirePdfFile(file, "Assignment file");
      uploadedPath = await uploadAdminFile(context, "materials", `assignments/${nextCourseId}`, file, "assignment", ".pdf");
      patch.file_path = uploadedPath;
    }

    const { data: updatedAssignment, error: updateError } = await context.serviceClient
      .from("assignments")
      .update(patch)
      .eq("id", assignment.id)
      .eq("institute_id", context.instituteId)
      .select(`${publicAssignmentColumns()}, file_path`)
      .single();

    if (updateError || !updatedAssignment) {
      await deleteMaterialFiles(context, [uploadedPath]);
      return NextResponse.json({ error: updateError?.message ?? "Unable to update assignment" }, { status: 500 });
    }

    const existingFilePath = getStoredFilePath(assignment);
    if (uploadedPath && existingFilePath && existingFilePath !== uploadedPath) {
      await deleteMaterialFiles(context, [existingFilePath]);
    }

    return NextResponse.json({
      assignment: {
        ...toPublicAssignment(updatedAssignment),
        signedUrl: await createSignedMaterialUrl(context, getStoredFilePath(updatedAssignment)),
      },
    });
  } catch (error) {
    if (cleanupContext && uploadedPath) {
      await deleteMaterialFiles(cleanupContext, [uploadedPath]);
    }
    return adminJsonError(error, "Unable to update assignment");
  }
}

export async function DELETE(_request: Request, contextParams: RouteParams<"assignmentId">) {
  try {
    const { assignmentId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const assignment = await getAdminAssignment(context, assignmentId);

    const { data: submissions } = await context.serviceClient
      .from("assignment_submissions")
      .select("file_path")
      .eq("assignment_id", assignment.id)
      .eq("institute_id", context.instituteId);

    const { error: deleteError } = await context.serviceClient
      .from("assignments")
      .delete()
      .eq("id", assignment.id)
      .eq("institute_id", context.instituteId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await deleteMaterialFiles(context, [
      getStoredFilePath(assignment),
      ...(submissions ?? []).map(getStoredFilePath),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminJsonError(error, "Unable to delete assignment");
  }
}
