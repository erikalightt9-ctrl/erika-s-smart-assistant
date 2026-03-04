import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OvertimeStatus } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hoursRequested: z
    .number()
    .min(0.5, "Minimum 0.5 hours")
    .max(12, "Maximum 12 hours"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { date, hoursRequested, reason } = parsed.data;

  const request = await prisma.overtimeRequest.create({
    data: {
      userId: session.user.id,
      date: new Date(date),
      hoursRequested,
      reason,
      status: OvertimeStatus.PENDING,
    },
  });

  return NextResponse.json({ success: true, data: request }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? session.user.id;

  const canViewAll = ["ERIKA", "ADMIN"].includes(session.user.role);
  const targetUserId =
    canViewAll ? (userId === "all" ? undefined : userId) : session.user.id;

  const requests = await prisma.overtimeRequest.findMany({
    where: targetUserId ? { userId: targetUserId } : {},
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ success: true, data: requests });
}

// PATCH /api/timekeeping/overtime — approve/reject (ERIKA/ADMIN only)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status } = body as { id: string; status: string };

  if (!id || !["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updated = await prisma.overtimeRequest.update({
    where: { id },
    data: {
      status: status as OvertimeStatus,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
