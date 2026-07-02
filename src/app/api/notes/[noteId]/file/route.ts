import { getAuthorizedResourceFile } from "../../../../../lib/resourceAccess";
import { createStorageFileResponse } from "../../../../../lib/storageFileResponse";

type RouteParams = {
  params: Promise<{ noteId: string }>;
};

const getDispositionMode = (request: Request) =>
  new URL(request.url).searchParams.get("mode") === "download" ? "attachment" : "inline";

export async function GET(request: Request, { params }: RouteParams) {
  const { noteId } = await params;
  const access = await getAuthorizedResourceFile("note", noteId);

  if (!access.ok) {
    return access.response;
  }

  return createStorageFileResponse(request, access.resource.file_url, access.resource.title, getDispositionMode(request), "notes");
}
