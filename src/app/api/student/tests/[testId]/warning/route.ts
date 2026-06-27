import { NextResponse } from "next/server";
import {
  getStudentRouteContext,
  studentJsonError,
  StudentRouteError,
  stringField,
  type RouteParams,
} from "../../../../../../lib/student/onlineClasses";
import { getStudentTest } from "../../../../../../lib/tests/studentTestAccess";

type WarningPayload = {
  reason?: unknown;
};

type AttemptWarningEvent = {
  at: string;
  reason: string;
};

export async function POST(request: Request, contextArg: RouteParams<"testId">) {
  try {
    const context = await getStudentRouteContext();
    const { testId } = await contextArg.params;
    const test = await getStudentTest(context, testId);
    const body = (await request.json().catch(() => ({}))) as WarningPayload;
    const reason = stringField(body.reason).slice(0, 80) || "focus_changed";

    const { data: attempt, error: attemptError } = await context.serviceClient
      .from("test_attempts")
      .select("id, status, warning_count, warning_events")
      .eq("institute_id", context.instituteId)
      .eq("test_id", test.id)
      .eq("student_id", context.userId)
      .maybeSingle();

    if (attemptError) {
      return NextResponse.json({ error: attemptError.message }, { status: 500 });
    }

    if (!attempt || attempt.status !== "in_progress") {
      throw new StudentRouteError("No active test attempt found.", 400, "attempt_not_active");
    }

    const now = new Date().toISOString();
    const currentEvents = Array.isArray(attempt.warning_events) ? attempt.warning_events as AttemptWarningEvent[] : [];
    const warningEvents = [...currentEvents.slice(-19), { at: now, reason }];
    const warningCount = Number(attempt.warning_count ?? 0) + 1;

    const { data: updatedAttempt, error: updateError } = await context.serviceClient
      .from("test_attempts")
      .update({
        warning_count: warningCount,
        warning_events: warningEvents,
        last_warning_at: now,
      })
      .eq("id", attempt.id)
      .eq("institute_id", context.instituteId)
      .select("id, warning_count, last_warning_at")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ warning: updatedAttempt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return studentJsonError(error, "Unable to record warning");
  }
}
