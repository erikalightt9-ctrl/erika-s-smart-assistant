import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ERIKA", "ADMIN", "EXEC"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "this_month"; // this_month | last_month | this_year

  const now = new Date();
  let from: Date, to: Date;

  if (period === "last_month") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (period === "this_year") {
    from = new Date(now.getFullYear(), 0, 1);
    to   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else {
    // this_month (default)
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const [
    collections,
    purchases,
    contributions,
    billing,
    documents,
    vehicles,
    maintenance,
  ] = await Promise.all([
    // Collections
    prisma.collectionRecord.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      _sum: { amount: true, paidAmount: true },
    }),
    // Purchases
    prisma.purchaseOrder.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      _sum: { amount: true },
    }),
    // Government contributions
    prisma.contributionRecord.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      _sum: { totalContribution: true },
    }),
    // Billing statements
    prisma.billingStatement.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    // Documents summary
    prisma.document.groupBy({
      by: ["status"],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
    }),
    // Vehicle stats (not period-filtered — fleet is always current)
    prisma.vehicle.groupBy({ by: ["status"], _count: true }),
    // Maintenance stats for period
    prisma.maintenanceRecord.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      _sum: { cost: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      collections: {
        count: collections._count,
        totalBilled: Number(collections._sum.amount ?? 0),
        totalCollected: Number(collections._sum.paidAmount ?? 0),
      },
      purchases: {
        count: purchases._count,
        totalAmount: Number(purchases._sum.amount ?? 0),
      },
      contributions: {
        count: contributions._count,
        totalAmount: Number(contributions._sum.totalContribution ?? 0),
      },
      billing: {
        count: billing._count,
        totalAmount: Number(billing._sum.totalAmount ?? 0),
      },
      documents: documents.map((d) => ({ status: d.status, count: d._count })),
      vehicles: vehicles.reduce((acc, v) => ({ ...acc, [v.status]: v._count }), {} as Record<string, number>),
      maintenance: {
        count: maintenance._count,
        totalCost: Number(maintenance._sum.cost ?? 0),
      },
    },
  });
}
