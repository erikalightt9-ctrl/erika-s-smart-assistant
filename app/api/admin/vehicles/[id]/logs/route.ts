import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addVehicleLog, getVehicleById } from "@/lib/services/vehicle.service";
import { VehicleLogType } from "@prisma/client";

const VALID_LOG_TYPES: VehicleLogType[] = ["FUEL", "MAINTENANCE", "TRIP", "INSPECTION", "INCIDENT"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vehicle = await getVehicleById(params.id);
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: vehicle.logs });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { logType, description, date, mileage, cost, driverName, notes } = body;

  if (!logType || !description || !date) {
    return NextResponse.json({ error: "logType, description, and date are required" }, { status: 400 });
  }
  if (!VALID_LOG_TYPES.includes(logType)) {
    return NextResponse.json({ error: "Invalid logType" }, { status: 400 });
  }

  const log = await addVehicleLog({
    vehicleId: params.id,
    logType, description, date, driverName, notes,
    mileage: mileage ? parseInt(mileage) : undefined,
    cost: cost ? parseFloat(cost) : undefined,
    createdById: session.user.id,
  });

  return NextResponse.json({ success: true, data: log }, { status: 201 });
}
