import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startReview } from "@/lib/services/document.service";

// POST /api/documents/[id]/submit — Move document to UNDER_REVIEW and send signing email
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["ERIKA", "ADMIN", "EXEC"].includes(role)) {
    return NextResponse.json({ error: "Only Admin or Exec can start document review" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const doc = await startReview(id, session.user.id);
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to start review" }, { status: 500 });
  }
}
