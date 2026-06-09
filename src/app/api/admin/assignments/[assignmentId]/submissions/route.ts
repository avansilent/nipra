import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import {
  adminJsonError,
  createSignedMaterialUrl,
  getAdminAssignment,
  getStoredFilePath,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";

async function loadAuthPhones(context: Awaited<ReturnType<typeof getAdminRouteContext>>, studentIds: string[]) {
  const studentIdSet = new Set(studentIds);
  const phoneByStudentId = new Map<string, string | null>();
  const perPage = 1000;

  for (let page = 1; page <= 20 && phoneByStudentId.size < studentIds.length; page += 1) {
    const { data, error } = await context.serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      break;
    }

    for (const authUser of data.users ?? []) {
      if (studentIdSet.has(authUser.id)) {
        phoneByStudentId.set(authUser.id, authUser.phone ?? null);
      }
    }

    if ((data.users ?? []).length < perPage) {
      break;
    }
  }

  return phoneByStudentId;
}

export async function GET(_request: Request, contextParams: RouteParams<"assignmentId">) {
  try {
    const { assignmentId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const assignment = await getAdminAssignment(context, assignmentId);

    const { data: submissions, error } = await context.serviceClient
      .from("assignment_submissions")
      .select("id, assignment_id, student_id, text_response, file_path, submitted_at, marks_obtained, feedback, graded_at, graded_by")
      .eq("assignment_id", assignment.id)
      .eq("institute_id", context.instituteId)
      .order("submitted_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const studentIds = [...new Set((submissions ?? []).map((submission) => submission.student_id))];
    const [{ data: students }, phoneByStudentId] = await Promise.all([
      studentIds.length > 0
        ? context.serviceClient.from("users").select("id, name, email, login_id").in("id", studentIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; email: string | null; login_id: string | null }> }),
      loadAuthPhones(context, studentIds),
    ]);

    const studentById = new Map((students ?? []).map((student) => [student.id, student]));
    const safeSubmissions = await Promise.all(
      (submissions ?? []).map(async (submission) => {
        const filePath = getStoredFilePath(submission);
        const safeSubmission = { ...(submission as Record<string, unknown>) };
        delete safeSubmission.file_path;
        const student = studentById.get(submission.student_id);

        return {
          ...safeSubmission,
          hasFile: Boolean(filePath),
          signedUrl: await createSignedMaterialUrl(context, filePath),
          student: {
            id: submission.student_id,
            name: student?.name ?? "Student",
            email: student?.email ?? null,
            login_id: student?.login_id ?? null,
            phone: phoneByStudentId.get(submission.student_id) ?? null,
          },
        };
      })
    );

    return NextResponse.json({ submissions: safeSubmissions });
  } catch (error) {
    return adminJsonError(error, "Unable to load assignment submissions");
  }
}
