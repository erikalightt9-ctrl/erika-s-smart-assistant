import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaveStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leaveType, startDate, endDate, reason } = body;

  if (!leaveType || !startDate || !endDate || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: LeaveStatus.PENDING,
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
  const targetUserId = canViewAll ? (userId === "all" ? undefined : userId) : session.user.id;

  const requests = await prisma.leaveRequest.findMany({
    where: targetUserId ? { userId: targetUserId } : {},
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ success: true, data: requests });
}
