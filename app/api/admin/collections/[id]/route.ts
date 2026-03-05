import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollectionById, updateCollection } from "@/lib/services/collection.service";
import { CollectionStatus } from "@prisma/client";

const VALID_STATUSES: CollectionStatus[] = ["PENDING", "PARTIAL", "PAID", "OVERDUE", "WRITTEN_OFF"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await getCollectionById(params.id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: record });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ERIKA", "ADMIN", "EXEC"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { status, paidAmount, paidAt, notes } = body;

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const record = await updateCollection(params.id, {
    ...(status     ? { status }     : {}),
    ...(paidAmount ? { paidAmount: parseFloat(paidAmount) } : {}),
    ...(paidAt     ? { paidAt }     : {}),
    ...(notes !== undefined ? { notes } : {}),
  });

  return NextResponse.json({ success: true, data: record });
}
