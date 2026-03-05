import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPurchaseById, rejectPurchase } from "@/lib/services/purchase.service";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const po = await getPurchaseById(params.id);
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["PENDING", "APPROVED"].includes(po.status)) {
    return NextResponse.json({ error: "Cannot reject in current status" }, { status: 400 });
  }

  const updated = await rejectPurchase(params.id, session.user.id);
  return NextResponse.json({ success: true, data: updated });
}
