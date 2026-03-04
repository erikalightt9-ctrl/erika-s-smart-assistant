import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rejectDocument } from "@/lib/services/document.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ERIKA", "ADMIN", "EXEC"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (!body.reason) return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });

  try {
    const doc = await rejectDocument(id, session.user.id, body.reason);
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
