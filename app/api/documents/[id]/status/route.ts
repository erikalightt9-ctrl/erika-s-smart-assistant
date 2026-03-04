import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateDocumentStatus } from "@/lib/services/document-routing.service";
import { DocumentStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, notes } = body;

  if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });

  try {
    const document = await updateDocumentStatus(
      id,
      status as DocumentStatus,
      session.user.id,
      notes
    );
    return NextResponse.json({ success: true, data: document });
  } catch {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
