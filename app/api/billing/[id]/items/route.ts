import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateLineItem } from "@/lib/services/billing.service";
import { Subsidiary } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await params; // consume params
  const body = await req.json();
  const { itemId, subsidiary, category, notes } = body;

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const updated = await updateLineItem(itemId, {
    subsidiary: subsidiary as Subsidiary | null,
    category,
    notes,
  });

  return NextResponse.json({ success: true, data: updated });
}
