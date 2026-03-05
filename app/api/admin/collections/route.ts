import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCollection, listCollections } from "@/lib/services/collection.service";
import { CollectionStatus, Subsidiary } from "@prisma/client";

const ALLOWED_ROLES = ["ERIKA", "ADMIN", "EXEC", "STAFF"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as CollectionStatus | null;
  const subsidiary = searchParams.get("subsidiary") as Subsidiary | null;

  const records = await listCollections({
    ...(status ? { status } : {}),
    ...(subsidiary ? { subsidiary } : {}),
  });

  return NextResponse.json({ success: true, data: records });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ERIKA", "ADMIN", "EXEC"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { clientName, invoiceNumber, description, amount, dueDate, subsidiary, notes } = body;

  if (!clientName || !invoiceNumber || !amount || !dueDate || !subsidiary) {
    return NextResponse.json({ error: "clientName, invoiceNumber, amount, dueDate, and subsidiary are required" }, { status: 400 });
  }

  const record = await createCollection({
    clientName,
    invoiceNumber,
    description,
    amount: parseFloat(amount),
    dueDate,
    subsidiary,
    notes,
    createdById: session.user.id,
  });

  return NextResponse.json({ success: true, data: record }, { status: 201 });
}
