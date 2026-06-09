import { NextResponse } from "next/server";
import {
  assertValidSubmissionFile,
  createSignedMaterialUrl,
  getStoredFilePath,
  getStudentAssignment,
  getStudentRouteContext,
  removeSubmissionFile,
  stringField,
  studentJsonError,
  StudentRouteError,
  type RouteParams,
  uploadSubmissionFile,
} from "../../../../../../lib/student/onlineClasses";

type SubmissionPayload = {
  hasTextResponse: boolean;
  textResponse: string;
  file: FormDataEntryValue | null;
};

async function readSubmissionPayload(request: Request): Promise<SubmissionPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const hasTextResponse =
      formData.has("text_response") ||
      formData.has("textResponse") ||
      formData.has("answer");

    return {
      hasTextResponse,
      textResponse: stringField(formData.get("text_response") ?? formData.get("textResponse") ?? formData.get("answer")),
      file: formData.get("file"),
    };
  }

  const body = (await request.json()) as Record<string, unknown>;
  const hasTextResponse = "text_response" in body || "textResponse" in body || "answer" in body;

  return {
    hasTextResponse,
    textResponse: stringField(body.text_response ?? body.textResponse ?? body.answer),
    file: null,
  };
}

function isGradedSubmission(submission: Record<string, unknown> | null | undefined) {
  if (!submission) {
    return false;
  }

  return Boolean(
    submission.graded_at ||
      submission.graded_by ||
      (submission.marks_obtained !== null && typeof submission.marks_obtained !== "undefined")
  );
}

function toSafeSubmission(submission: Record<string, unknown>, signedUrl: string | null) {
  const safeSubmission = { ...submission };
  const filePath = getStoredFilePath(safeSubmission);
  delete safeSubmission.file_path;

  return {
    ...safeSubmission,
    hasFile: Boolean(filePath),
    signedUrl,
  };
}

export async function POST(request: Request, contextParams: RouteParams<"assignmentId">) {
  let uploadedPath: string | null = null;
  let cleanupContext: Awaited<ReturnType<typeof getStudentRouteContext>> | null = null;

  try {
    const { assignmentId } = await contextParams.params;
    const context = await getStudentRouteContext();
    cleanupContext = context;
    const assignment = await getStudentAssignment(context, assignmentId);

    if (assignment.due_date && new Date(assignment.due_date).getTime() < Date.now()) {
      throw new StudentRouteError("Assignment due date has passed.", 403, "due_date_passed");
    }

    const payload = await readSubmissionPayload(request);
    const { data: existingSubmission, error: existingError } = await context.serviceClient
      .from("assignment_submissions")
      .select("id, assignment_id, student_id, text_response, file_path, submitted_at, marks_obtained, feedback, graded_at, graded_by")
      .eq("assignment_id", assignment.id)
      .eq("student_id", context.userId)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (isGradedSubmission(existingSubmission)) {
      throw new StudentRouteError("This submission is already graded and cannot be changed.", 409, "already_graded");
    }

    if (payload.file instanceof File && payload.file.size > 0) {
      assertValidSubmissionFile(payload.file);
      uploadedPath = await uploadSubmissionFile(context, assignment.id, payload.file);
    }

    const existingFilePath = getStoredFilePath(existingSubmission);
    const nextFilePath = uploadedPath ?? existingFilePath;
    const nextTextResponse = payload.hasTextResponse
      ? payload.textResponse
      : stringField((existingSubmission as { text_response?: string | null } | null)?.text_response);

    if (!nextTextResponse && !nextFilePath) {
      throw new StudentRouteError("Add an answer or upload a file before submitting.", 400, "empty_submission");
    }

    const submittedAt = new Date().toISOString();
    const submissionPatch = {
      institute_id: context.instituteId,
      assignment_id: assignment.id,
      student_id: context.userId,
      text_response: nextTextResponse || null,
      file_path: nextFilePath,
      submitted_at: submittedAt,
    };

    const result = existingSubmission
      ? await context.serviceClient
          .from("assignment_submissions")
          .update(submissionPatch)
          .eq("id", existingSubmission.id)
          .eq("assignment_id", assignment.id)
          .eq("student_id", context.userId)
          .eq("institute_id", context.instituteId)
          .is("marks_obtained", null)
          .is("graded_at", null)
          .is("graded_by", null)
          .select("id, assignment_id, student_id, text_response, file_path, submitted_at, marks_obtained, feedback, graded_at")
          .maybeSingle()
      : await context.serviceClient
          .from("assignment_submissions")
          .insert(submissionPatch)
          .select("id, assignment_id, student_id, text_response, file_path, submitted_at, marks_obtained, feedback, graded_at")
          .single();

    if (result.error || !result.data) {
      if (uploadedPath) {
        await removeSubmissionFile(context, uploadedPath);
        uploadedPath = null;
      }

      const message = existingSubmission
        ? "This submission was graded before the update completed."
        : result.error?.message ?? "Unable to submit assignment";
      return NextResponse.json({ error: message, code: existingSubmission ? "already_graded" : undefined }, { status: existingSubmission ? 409 : 500 });
    }

    if (uploadedPath && existingFilePath && uploadedPath !== existingFilePath) {
      await removeSubmissionFile(context, existingFilePath);
    }

    return NextResponse.json(
      {
        success: true,
        submission: toSafeSubmission(
          result.data as Record<string, unknown>,
          await createSignedMaterialUrl(context, getStoredFilePath(result.data))
        ),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (cleanupContext && uploadedPath) {
      await removeSubmissionFile(cleanupContext, uploadedPath);
    }
    return studentJsonError(error, "Unable to submit assignment");
  }
}
