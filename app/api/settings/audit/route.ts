import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET /api/settings/audit ────────────────────────────────────────────────
// Returns recent document audit log entries — Super Admin / Admin only
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ERIKA" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const logs = await prisma.documentAuditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      document: { select: { title: true, id: true } },
      user:     { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ success: true, data: logs });
}
