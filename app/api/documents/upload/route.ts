import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/services/document.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ALLOWED = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 20MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveUploadedFile(buffer, file.name);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
