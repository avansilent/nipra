import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../lib/admin/route";
import { isBunnyStreamReference } from "../../../../../lib/bunnyStreamReference";
import { revalidateAdminContent } from "../../../../../lib/cacheInvalidation";

type RouteParams = {
  params: Promise<{ materialId: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function DELETE(_request: Request, contextParams: RouteParams) {
  try {
    const { materialId } = await contextParams.params;

    if (!isUuid(materialId)) {
      return NextResponse.json({ error: "Invalid material" }, { status: 400 });
    }

    const context = await getAdminRouteContext();
    const { data: material, error: loadError } = await context.serviceClient
      .from("materials")
      .select("id, file_url")
      .eq("id", materialId)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const { error: deleteError } = await context.serviceClient
      .from("materials")
      .delete()
      .eq("id", material.id)
      .eq("institute_id", context.instituteId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (material.file_url && !isBunnyStreamReference(material.file_url)) {
      await context.serviceClient.storage.from("materials").remove([material.file_url]);
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete material";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
