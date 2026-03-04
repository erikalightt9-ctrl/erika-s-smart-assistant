import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTodayStatus } from "@/lib/services/timekeeping.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getTodayStatus(session.user.id);
  return NextResponse.json({ success: true, data: status });
}
