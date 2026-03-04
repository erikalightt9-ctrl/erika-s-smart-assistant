import { NextRequest, NextResponse } from "next/server";
import { getDocumentByToken, signDocument } from "@/lib/services/document.service";

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
    data: {
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
      routedBy: doc.routedBy.name,
      createdAt: doc.createdAt,
    },
  });
}

// POST — Submit signature
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: { signatoryName?: string; signatoryEmail?: string; signatureImage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { signatoryName, signatoryEmail, signatureImage } = body;

  if (!signatoryName || !signatoryEmail || !signatureImage) {
    return NextResponse.json(
      { error: "signatoryName, signatoryEmail, and signatureImage are required" },
      { status: 400 }
    );
  }

  const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined;

  try {
    await signDocument(token, signatoryName, signatoryEmail, signatureImage, ipAddress);
    return NextResponse.json({ success: true, message: "Document signed successfully." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signing failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
