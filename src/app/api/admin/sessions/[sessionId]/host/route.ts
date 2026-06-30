import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import {
  adminJsonError,
  getAdminSession,
  getMeetingLink,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";
import {
  createCloudflareStreamEmbedUrl,
  getCloudflareLiveInputHostDetails,
} from "../../../../../../lib/cloudflareStream";
import { isCloudflareLiveInputReference } from "../../../../../../lib/storageReferences";

export async function GET(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);
    const meetingLink = await getMeetingLink(context, session.id);

    if (!meetingLink?.join_url || !isCloudflareLiveInputReference(meetingLink.join_url)) {
      return NextResponse.json(
        { error: "Create the direct live stream before joining as teacher." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const [hostDetails, viewerUrl] = await Promise.all([
      getCloudflareLiveInputHostDetails(meetingLink.join_url),
      createCloudflareStreamEmbedUrl(meetingLink.join_url),
    ]);

    return NextResponse.json(
      {
        host: {
          webRtcUrl: hostDetails?.webRtcUrl ?? null,
          rtmpsUrl: hostDetails?.rtmpsUrl ?? meetingLink.host_url,
          streamKey: hostDetails?.streamKey ?? meetingLink.passcode,
          viewerUrl,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return adminJsonError(error, "Unable to open teacher live studio");
  }
}
