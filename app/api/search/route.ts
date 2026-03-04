import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const isAdmin = ["ERIKA", "ADMIN"].includes(session.user.role);

  const [documents, billingStatements, users, knowledgeDocs] =
    await Promise.all([
      // Documents
      prisma.document.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { purpose: { contains: q, mode: "insensitive" } },
            { senderName: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, status: true, department: true },
        take: 5,
      }),

      // Billing statements (admin only)
      isAdmin
        ? prisma.billingStatement.findMany({
            where: {
              OR: [
                { fileName: { contains: q, mode: "insensitive" } },
                { bankName: { contains: q, mode: "insensitive" } },
                { cardLast4: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true, fileName: true, bankName: true, cardLast4: true, status: true },
            take: 5,
          })
        : Promise.resolve([]),

      // Users (admin only)
      isAdmin
        ? prisma.user.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true, email: true, role: true },
            take: 5,
          })
        : Promise.resolve([]),

      // Knowledge base
      prisma.knowledgeDocument.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, category: true },
        take: 3,
      }),
    ]);

  const results = [
    ...documents.map((d) => ({
      id: d.id,
      type: "document" as const,
      title: d.title,
      subtitle: `${d.department} · ${d.status.replace(/_/g, " ")}`,
      href: `/documents/${d.id}`,
    })),
    ...billingStatements.map((b) => ({
      id: b.id,
      type: "billing" as const,
      title: b.fileName,
      subtitle: `${b.bankName ?? "Unknown bank"}${b.cardLast4 ? ` ···· ${b.cardLast4}` : ""} · ${b.status}`,
      href: `/billing/${b.id}`,
    })),
    ...users.map((u) => ({
      id: u.id,
      type: "user" as const,
      title: u.name,
      subtitle: `${u.email} · ${u.role}`,
      href: `/users/${u.id}`,
    })),
    ...knowledgeDocs.map((k) => ({
      id: k.id,
      type: "knowledge" as const,
      title: k.title,
      subtitle: `Knowledge Base · ${k.category}`,
      href: `/knowledge`,
    })),
  ];

  return NextResponse.json({ success: true, data: results });
}
