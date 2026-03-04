import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStatementWithItems, finalizeStatement } from "@/lib/services/billing.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const statement = await getStatementWithItems(id);

  if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (statement.uploadedById !== session.user.id && !["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: statement });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.action === "finalize") {
    const updated = await finalizeStatement(id);
    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
