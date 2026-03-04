import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ALLOWED_TYPES,
  MAX_SIZE,
  analyzeDocument,
  saveFile,
  createSession,
} from "@/lib/services/document-assistant.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Supported: PDF, JPEG, PNG, WebP, TXT, CSV" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Save file to disk
    const filePath = await saveFile(session.user.id, file.name, buffer);

    // Analyze with Claude
    const analysis = await analyzeDocument(buffer, file.type, file.name);

    // Persist session to DB
    const docSession = await createSession(
      session.user.id,
      file.name,
      file.size,
      file.type,
      filePath,
      analysis
    );

    return NextResponse.json({ success: true, sessionId: docSession.id }, { status: 201 });
  } catch (error) {
    console.error("Document assistant upload error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document. Please try again." },
      { status: 500 }
    );
  }
}
