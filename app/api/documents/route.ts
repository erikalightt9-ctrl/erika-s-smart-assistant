import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocuments, createDocument } from "@/lib/services/document.service";
import { DocumentPriority, DocumentStatus, Subsidiary } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as DocumentStatus | null;
  const search = searchParams.get("search") ?? undefined;
  const department = searchParams.get("department") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const role = session.user.role;

  const result = await getDocuments({
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(department ? { department } : {}),
    ...(role === "EXEC" ? { assigneeId: session.user.id } : {}),
    ...(role === "STAFF" ? { routedById: session.user.id } : {}),
    page,
  });

  return NextResponse.json({ success: true, ...result });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    title, purpose, senderName, department, description,
    filePath, fileName, fileSize, mimeType,
    fromSubsidiary, priority, requiresESignature,
    signatoryName, signatoryEmail, assigneeIds, dueDate, notes,
  } = body;

  if (!title || !purpose || !senderName || !department || !filePath) {
    return NextResponse.json({ error: "title, purpose, senderName, department, and filePath are required" }, { status: 400 });
  }

  if (requiresESignature && (!signatoryName || !signatoryEmail)) {
    return NextResponse.json({ error: "Signatory name and email are required for e-signature" }, { status: 400 });
  }

  try {
    const document = await createDocument({
      title,
      purpose,
      senderName,
      department,
      description,
      filePath,
      fileName: fileName ?? "document",
      fileSize: fileSize ?? 0,
      mimeType: mimeType ?? "application/pdf",
      fromSubsidiary: fromSubsidiary as Subsidiary | undefined,
      priority: (priority as DocumentPriority) ?? DocumentPriority.NORMAL,
      requiresESignature: requiresESignature ?? false,
      signatoryName,
      signatoryEmail,
      assigneeIds: assigneeIds ?? [],
      routedById: session.user.id,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
    });

    return NextResponse.json({ success: true, data: document }, { status: 201 });
  } catch (error) {
    console.error("Document creation error:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
