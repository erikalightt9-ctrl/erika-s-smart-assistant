import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const prefs = await prisma.userPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      emailNotifications: true,
      notifyDocStatus: true,
      notifyLeaveStatus: true,
      notifyDeadlines: true,
      pinnedModules: [],
    },
    update: {},
  });

  return NextResponse.json({ success: true, data: prefs });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const body = await req.json();
  const allowedFields = [
    "emailNotifications",
    "notifyDocStatus",
    "notifyLeaveStatus",
    "notifyDeadlines",
    "pinnedModules",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  const prefs = await prisma.userPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      emailNotifications: true,
      notifyDocStatus: true,
      notifyLeaveStatus: true,
      notifyDeadlines: true,
      pinnedModules: [],
      ...updates,
    },
    update: updates,
  });

  return NextResponse.json({ success: true, data: prefs });
}
