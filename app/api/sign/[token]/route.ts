import { NextRequest, NextResponse } from "next/server";
import { getDocumentByToken, signDocument, saveUploadedFile } from "@/lib/services/document.service";

// GET — Return public document info for the signing page
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await getDocumentByToken(token);

  if (!doc) {
    return NextResponse.json(
      { error: "This signing link is invalid, expired, or has already been used." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    document: {
      id: doc.id,
      title: doc.title,
      purpose: doc.purpose,
      senderName: doc.senderName,
      department: doc.department,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      dueDate: doc.dueDate,
      priority: doc.priority,
      signatoryName: doc.signatoryName,
      signatoryEmail: doc.signatoryEmail,
      routedBy: doc.routedBy.name,
      createdAt: doc.createdAt,
      signatureRequestSentAt: doc.signatureRequestSentAt,
    },
  });
}

// POST — Submit signed document (multipart/form-data)
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request — expected multipart/form-data" }, { status: 400 });
  }

  const signatoryName  = formData.get("signatoryName")  as string | null;
  const signatoryEmail = formData.get("signatoryEmail") as string | null;
  const file           = formData.get("file")           as File   | null;

  if (!signatoryName || !signatoryEmail || !file) {
    return NextResponse.json(
      { error: "signatoryName, signatoryEmail, and signed file are required" },
      { status: 400 }
    );
  }

  // Save the uploaded signed document
  const buffer = Buffer.from(await file.arrayBuffer());
  let savedFile: { filePath: string; fileName: string; fileSize: number; mimeType: string };
  try {
    savedFile = await saveUploadedFile(buffer, file.name, "signed-documents");
  } catch {
    return NextResponse.json({ error: "Failed to save the uploaded file" }, { status: 500 });
  }

  const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined;

  try {
    await signDocument(token, signatoryName, signatoryEmail, savedFile.filePath, file.name, ipAddress);
    return NextResponse.json({ success: true, message: "Document signed successfully." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signing failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
