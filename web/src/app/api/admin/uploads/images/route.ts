import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { uploadEditorialImage } from "@/lib/cloudinary/uploads";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const upload = await uploadEditorialImage(file);

    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("[cloudinary upload]", message);
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
