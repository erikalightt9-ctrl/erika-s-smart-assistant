import { NextRequest, NextResponse } from "next/server";
import { getDocumentByToken, getAbsoluteFilePath } from "@/lib/services/document.service";
import fs from "fs";

// Serve the file for the public signing page (token-authenticated, no login required)
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await getDocumentByToken(token);

  if (!doc) return NextResponse.json({ error: "Invalid or expired signing link" }, { status: 404 });

  const absPath = getAbsoluteFilePath(doc.filePath);
  if (!fs.existsSync(absPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(absPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
    },
  });
}
