import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMaintenanceById, updateMaintenance } from "@/lib/services/maintenance.service";
import { MaintenanceStatus } from "@prisma/client";

const VALID_STATUSES: MaintenanceStatus[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await getMaintenanceById(params.id);
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
  const { status, completedAt, performedBy, cost, notes } = body;

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const record = await updateMaintenance(params.id, {
    ...(status      !== undefined ? { status }      : {}),
    ...(completedAt !== undefined ? { completedAt } : {}),
    ...(performedBy !== undefined ? { performedBy } : {}),
    ...(cost        !== undefined ? { cost: parseFloat(cost) } : {}),
    ...(notes       !== undefined ? { notes }       : {}),
  });

  return NextResponse.json({ success: true, data: record });
}
