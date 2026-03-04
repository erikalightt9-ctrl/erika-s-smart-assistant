import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocument, getAbsoluteFilePath } from "@/lib/services/document.service";
import fs from "fs";
import path from "path";

// Serve the signed document uploaded by the recipient
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!doc.signature?.signedFilePath) {
    return NextResponse.json({ error: "No signed document available" }, { status: 404 });
  }

  const absPath = getAbsoluteFilePath(doc.signature.signedFilePath);
  if (!fs.existsSync(absPath)) {
    return NextResponse.json({ error: "Signed file not found on server" }, { status: 404 });
  }

  const buffer = fs.readFileSync(absPath);
  const ext = path.extname(doc.signature.signedFileName ?? "").toLowerCase();
  const mimeMap: Record<string, string> = {
    ".pdf":  "application/pdf",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
    ".doc":  "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  const contentType = mimeMap[ext] ?? "application/octet-stream";
  const fileName = doc.signature.signedFileName ?? "signed-document";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
