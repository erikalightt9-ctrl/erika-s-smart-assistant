import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVehicle, listVehicles } from "@/lib/services/vehicle.service";
import { Subsidiary, VehicleStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status     = searchParams.get("status")     as VehicleStatus | null;
  const subsidiary = searchParams.get("subsidiary") as Subsidiary    | null;

  const vehicles = await listVehicles({
    ...(status     ? { status }     : {}),
    ...(subsidiary ? { subsidiary } : {}),
  });

  return NextResponse.json({ success: true, data: vehicles });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { plateNumber, make, model, year, color, subsidiary, assignedToId, notes } = body;

  if (!plateNumber || !make || !model || !year || !subsidiary) {
    return NextResponse.json({ error: "plateNumber, make, model, year, and subsidiary are required" }, { status: 400 });
  }

  const vehicle = await createVehicle({
    plateNumber, make, model, color, subsidiary, assignedToId, notes,
    year: parseInt(year),
  });

  return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
}
