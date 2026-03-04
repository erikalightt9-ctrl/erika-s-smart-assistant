import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDTR } from "@/lib/services/timekeeping.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const userId = searchParams.get("userId") ?? session.user.id;

  // Only ERIKA/ADMIN can view other users' DTR
  if (userId !== session.user.id && !["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dtr = await getDTR(userId, year, month);
  return NextResponse.json({ success: true, data: dtr });
}
