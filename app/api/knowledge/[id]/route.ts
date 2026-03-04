import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const doc = await prisma.knowledgeDocument.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await prisma.knowledgeDocument.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
