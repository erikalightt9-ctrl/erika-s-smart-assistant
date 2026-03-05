import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVehicleById, updateVehicle } from "@/lib/services/vehicle.service";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vehicle = await getVehicleById(params.id);
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: vehicle });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { make, model, year, color, subsidiary, assignedToId, status, notes } = body;

  const vehicle = await updateVehicle(params.id, {
    ...(make         !== undefined ? { make }                         : {}),
    ...(model        !== undefined ? { model }                        : {}),
    ...(year         !== undefined ? { year: parseInt(year) }         : {}),
    ...(color        !== undefined ? { color }                        : {}),
    ...(subsidiary   !== undefined ? { subsidiary }                   : {}),
    ...(assignedToId !== undefined ? { assignedToId }                 : {}),
    ...(status       !== undefined ? { status }                       : {}),
    ...(notes        !== undefined ? { notes }                        : {}),
  });

  return NextResponse.json({ success: true, data: vehicle });
}
