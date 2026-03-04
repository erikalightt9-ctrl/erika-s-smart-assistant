import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocument, getAbsoluteFilePath } from "@/lib/services/document.service";
import fs from "fs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "STAFF" && doc.routedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const absPath = getAbsoluteFilePath(doc.filePath);
  if (!fs.existsSync(absPath)) {
    return NextResponse.json({ error: "File not found on server" }, { status: 404 });
  }

  const buffer = fs.readFileSync(absPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
    },
  });
}
