import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const docs = await prisma.knowledgeDocument.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      fileName: true,
      content: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ success: true, data: docs });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, category, fileName } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { success: false, error: "Title and content are required." },
      { status: 400 }
    );
  }

  const doc = await prisma.knowledgeDocument.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || "general",
      fileName: fileName?.trim() || null,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json({ success: true, data: doc }, { status: 201 });
}
