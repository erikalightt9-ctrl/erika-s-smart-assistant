import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clockIn } from "@/lib/services/timekeeping.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { latitude?: number; longitude?: number; locationAddress?: string; notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }

  try {
    const entry = await clockIn(session.user.id, {
      notes: body.notes,
      latitude: body.latitude,
      longitude: body.longitude,
      locationAddress: body.locationAddress,
    });
    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 400 }
    );
  }
}
