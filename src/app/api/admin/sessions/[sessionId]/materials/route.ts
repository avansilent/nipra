import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import {
  adminJsonError,
  createSignedMaterialUrl,
  deleteMaterialFiles,
  getAdminSession,
  getStoredFilePath,
  normalizeMaterialType,
  publicMaterialColumns,
  requirePdfFile,
  stringField,
  toIstDate,
  toPublicMaterial,
  type RouteParams,
  uploadAdminFile,
} from "../../../../../../lib/admin/onlineClasses";

function safeExternalUrl(value: unknown) {
  const nextValue = stringField(value);
  if (!nextValue) {
    return null;
  }

  try {
    const url = new URL(nextValue);
    if (url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    const { data: materials, error } = await context.serviceClient
      .from("session_materials")
      .select(`${publicMaterialColumns()}, file_path`)
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeMaterials = await Promise.all(
      (materials ?? []).map(async (material) => ({
        ...toPublicMaterial(material),
        signedUrl: await createSignedMaterialUrl(context, getStoredFilePath(material)),
      }))
    );

    return NextResponse.json({ materials: safeMaterials });
  } catch (error) {
    return adminJsonError(error, "Unable to load session materials");
  }
}

export async function POST(request: Request, contextParams: RouteParams<"sessionId">) {
  let uploadedPath: string | null = null;

  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);
    const formData = await request.formData();
    const materialType = normalizeMaterialType(formData.get("material_type") ?? formData.get("materialType"));
    const title = stringField(formData.get("title"));
    const description = stringField(formData.get("description")) || null;
    const externalUrl = safeExternalUrl(formData.get("external_url") ?? formData.get("externalUrl"));
    const sortOrder = Number(formData.get("sort_order") ?? formData.get("sortOrder") ?? 0);
    const file = formData.get("file");

    if (!title) {
      return NextResponse.json({ error: "Material title is required" }, { status: 400 });
    }

    if (materialType === "link") {
      if (!externalUrl) {
        return NextResponse.json({ error: "A valid HTTPS link is required" }, { status: 400 });
      }
    } else {
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
      }

      requirePdfFile(file, "Material file");
      uploadedPath = await uploadAdminFile(context, "materials", `sessions/${session.id}/materials`, file, "session-material", ".pdf");
    }

    const visibleFrom = toIstDate(session.session_date, session.end_time).toISOString();
    const { data: inserted, error: insertError } = await context.serviceClient
      .from("session_materials")
      .insert({
        institute_id: context.instituteId,
        session_id: session.id,
        material_type: materialType,
        title,
        description,
        file_path: uploadedPath,
        external_url: externalUrl,
        visible_from: visibleFrom,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      .select(`${publicMaterialColumns()}, file_path`)
      .single();

    if (insertError || !inserted) {
      await deleteMaterialFiles(context, [uploadedPath]);
      return NextResponse.json({ error: insertError?.message ?? "Unable to save material" }, { status: 500 });
    }

    return NextResponse.json({
      material: {
        ...toPublicMaterial(inserted),
        signedUrl: await createSignedMaterialUrl(context, getStoredFilePath(inserted)),
      },
    });
  } catch (error) {
    return adminJsonError(error, "Unable to save session material");
  }
}
