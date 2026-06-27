import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../../lib/cacheInvalidation";
import {
  createCloudflareLiveInput,
  findLatestCloudflareLiveRecording,
} from "../../../../../../lib/cloudflareStream";
import {
  adminJsonError,
  getAdminSession,
  getMeetingLink,
  getSessionJoinWindow,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";
import {
  getCloudflareLiveInputUid,
  isCloudflareLiveInputReference,
} from "../../../../../../lib/storageReferences";

type StreamAction = "prepare" | "sync-recording";

function getAction(value: unknown): StreamAction {
  return value === "sync-recording" ? "sync-recording" : "prepare";
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getRecordingSearchStart(session: Awaited<ReturnType<typeof getAdminSession>>) {
  const timeValue = session.start_time.length === 5 ? `${session.start_time}:00` : session.start_time;
  const sessionDate = new Date(`${session.session_date}T${timeValue}+05:30`);
  if (Number.isNaN(sessionDate.getTime())) {
    return undefined;
  }

  return new Date(sessionDate.getTime() - 30 * 60 * 1000).toISOString();
}

async function ensureStreamMeetingLink(context: Awaited<ReturnType<typeof getAdminRouteContext>>, session: Awaited<ReturnType<typeof getAdminSession>>) {
  const existingLink = await getMeetingLink(context, session.id);
  if (existingLink?.join_url && isCloudflareLiveInputReference(existingLink.join_url)) {
    return {
      meetingLink: existingLink,
      stream: {
        uid: getCloudflareLiveInputUid(existingLink.join_url),
        reference: existingLink.join_url,
        rtmpsUrl: existingLink.host_url,
        streamKey: existingLink.passcode,
      },
      reused: true,
    };
  }

  const stream = await createCloudflareLiveInput({
    title: session.title,
    sessionId: session.id,
    courseId: session.course_id,
    instituteId: context.instituteId,
  });
  const joinWindow = getSessionJoinWindow(session.session_date, session.start_time, session.end_time);

  const { data: meetingLink, error } = await context.serviceClient
    .from("class_session_meeting_links")
    .upsert(
      {
        institute_id: context.instituteId,
        session_id: session.id,
        provider: "other",
        join_url: stream.reference,
        host_url: stream.rtmpsUrl,
        meeting_id: stream.uid,
        passcode: stream.streamKey,
        ...joinWindow,
      },
      { onConflict: "session_id" }
    )
    .select("id, session_id, provider, join_url, host_url, meeting_id, passcode, join_window_opens_at, join_window_closes_at, created_at, updated_at")
    .single();

  if (error || !meetingLink) {
    return {
      error: NextResponse.json({ error: error?.message ?? "Unable to save Cloudflare Stream live input" }, { status: 500 }),
    };
  }

  await context.serviceClient
    .from("class_sessions")
    .update({ live_provider: "other" })
    .eq("id", session.id)
    .eq("institute_id", context.instituteId);

  return {
    meetingLink,
    stream,
    reused: false,
  };
}

async function syncRecording(
  context: Awaited<ReturnType<typeof getAdminRouteContext>>,
  session: Awaited<ReturnType<typeof getAdminSession>>,
  titleOverride?: string
) {
  const meetingLink = await getMeetingLink(context, session.id);
  if (!meetingLink?.join_url || !isCloudflareLiveInputReference(meetingLink.join_url)) {
    return NextResponse.json({ error: "Create a Cloudflare live input before syncing a recording." }, { status: 400 });
  }

  const recording = await findLatestCloudflareLiveRecording(meetingLink.join_url, getRecordingSearchStart(session));
  if (!recording?.reference) {
    return NextResponse.json(
      { error: "Cloudflare recording is not ready yet. End the stream in your encoder and try Sync Recording again in a few minutes." },
      { status: 404 }
    );
  }

  const title = titleOverride || recording.title || `${session.title} recording`;
  const now = new Date().toISOString();

  const { data: existingMaterial } = await context.serviceClient
    .from("materials")
    .select("id")
    .eq("file_url", recording.reference)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  const materialQuery = existingMaterial?.id
    ? context.serviceClient
        .from("materials")
        .update({
          title,
          course_id: session.course_id,
          visibility: "student",
        })
        .eq("id", existingMaterial.id)
        .eq("institute_id", context.instituteId)
    : context.serviceClient
        .from("materials")
        .insert({
          institute_id: context.instituteId,
          course_id: session.course_id,
          title,
          file_url: recording.reference,
          visibility: "student",
        });

  const { error: materialError } = await materialQuery;
  if (materialError) {
    return NextResponse.json({ error: materialError.message }, { status: 500 });
  }

  const { data: sessionRecording, error: recordingError } = await context.serviceClient
    .from("session_recordings")
    .upsert(
      {
        institute_id: context.instituteId,
        session_id: session.id,
        recording_provider: "external_link",
        title,
        external_url: recording.reference,
        bunny_video_id: null,
        bunny_library_id: null,
        available_from: now,
      },
      { onConflict: "session_id" }
    )
    .select("id, session_id, recording_provider, title, external_url, available_from, created_at, updated_at")
    .single();

  if (recordingError || !sessionRecording) {
    return NextResponse.json({ error: recordingError?.message ?? "Unable to save session recording" }, { status: 500 });
  }

  revalidateAdminContent("learning");

  return NextResponse.json({
    recording: sessionRecording,
    material: {
      title,
      course_id: session.course_id,
      file_url: recording.reference,
    },
  });
}

export async function POST(request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = getAction(body.action);

    if (action === "sync-recording") {
      return syncRecording(context, session, getString(body.title));
    }

    const prepared = await ensureStreamMeetingLink(context, session);
    if ("error" in prepared) {
      return prepared.error;
    }

    revalidateAdminContent("learning");

    return NextResponse.json({
      meetingLink: prepared.meetingLink,
      stream: prepared.stream,
      reused: prepared.reused,
    });
  } catch (error) {
    return adminJsonError(error, "Unable to manage Cloudflare Stream live class");
  }
}
