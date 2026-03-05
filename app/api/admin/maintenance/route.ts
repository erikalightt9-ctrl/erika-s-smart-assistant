import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createMaintenance, listMaintenance } from "@/lib/services/maintenance.service";
import { AssetType, MaintenanceStatus, Subsidiary } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status    = searchParams.get("status")    as MaintenanceStatus | null;
  const assetType = searchParams.get("assetType") as AssetType | null;
  const subsidiary = searchParams.get("subsidiary") as Subsidiary | null;

  const records = await listMaintenance({
    ...(status     ? { status }               : {}),
    ...(assetType  ? { assetType }            : {}),
    ...(subsidiary ? { subsidiary }           : {}),
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
  const { assetName, assetType, description, scheduledDate, subsidiary, performedBy, cost, notes } = body;

  if (!assetName || !assetType || !scheduledDate || !subsidiary) {
    return NextResponse.json({ error: "assetName, assetType, scheduledDate, and subsidiary are required" }, { status: 400 });
  }

  const record = await createMaintenance({
    assetName, assetType, description, scheduledDate, subsidiary,
    performedBy, notes,
    cost: cost ? parseFloat(cost) : undefined,
    createdById: session.user.id,
  });

  return NextResponse.json({ success: true, data: record }, { status: 201 });
}
