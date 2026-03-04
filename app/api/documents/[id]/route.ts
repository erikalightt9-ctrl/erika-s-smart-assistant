import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocument } from "@/lib/services/document.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // STAFF can only see their own documents
  if (session.user.role === "STAFF" && doc.routedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: doc });
}
