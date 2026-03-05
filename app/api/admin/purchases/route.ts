import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPurchase, listPurchases } from "@/lib/services/purchase.service";
import { PurchaseStatus, Subsidiary } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as PurchaseStatus | null;
  const subsidiary = searchParams.get("subsidiary") as Subsidiary | null;

  const records = await listPurchases({
    ...(status ? { status } : {}),
    ...(subsidiary ? { subsidiary } : {}),
  });

  return NextResponse.json({ success: true, data: records });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, vendor, description, amount, subsidiary, category, notes } = body;

  if (!title || !vendor || !amount || !subsidiary) {
    return NextResponse.json({ error: "title, vendor, amount, and subsidiary are required" }, { status: 400 });
  }

  const record = await createPurchase({
    title, vendor, description, category, notes,
    amount: parseFloat(amount),
    subsidiary,
    requestedById: session.user.id,
  });

  return NextResponse.json({ success: true, data: record }, { status: 201 });
}
