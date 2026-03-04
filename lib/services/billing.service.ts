import { prisma } from "@/lib/prisma";
import { BillingStatementStatus, Subsidiary } from "@prisma/client";
import { extractBillingStatement } from "./claude-ocr.service";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "billing");

export async function saveUploadedFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ filePath: string; fileSize: number }> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  await fs.writeFile(filePath, buffer);
  return { filePath, fileSize: buffer.length };
}

export async function processBillingStatement(
  uploadedById: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string
) {
  const { filePath, fileSize } = await saveUploadedFile(buffer, fileName, mimeType);

  // Create the statement record in PROCESSING state
  const statement = await prisma.billingStatement.create({
    data: {
      uploadedById,
      fileName,
      fileSize,
      filePath,
      mimeType,
      status: BillingStatementStatus.PROCESSING,
    },
  });

  // Convert buffer to base64 and call Claude AI
  const base64Image = buffer.toString("base64");

  try {
    const extracted = await extractBillingStatement(base64Image, mimeType);

    // Update statement with AI data
    await prisma.billingStatement.update({
      where: { id: statement.id },
      data: {
        status: BillingStatementStatus.REVIEW,
        aiRawResponse: JSON.stringify(extracted),
        statementDate: extracted.statementDate ? new Date(extracted.statementDate) : undefined,
        cardLast4: extracted.cardLast4,
        bankName: extracted.bankName,
        totalAmount: extracted.totalAmount,
      },
    });

    // Create line items
    if (extracted.lineItems.length > 0) {
      await prisma.billingLineItem.createMany({
        data: extracted.lineItems.map((item) => ({
          statementId: statement.id,
          transactionDate: item.transactionDate ? new Date(item.transactionDate) : undefined,
          description: item.description,
          amount: item.amount,
          subsidiary: item.subsidiary as Subsidiary | undefined,
          category: item.category,
          isAiTagged: true,
        })),
      });
    }

    return { statementId: statement.id, itemCount: extracted.lineItems.length };
  } catch (error) {
    await prisma.billingStatement.update({
      where: { id: statement.id },
      data: { status: BillingStatementStatus.REVIEW },
    });
    throw error;
  }
}

export async function updateLineItem(
  itemId: string,
  data: {
    subsidiary?: Subsidiary | null;
    category?: string;
    notes?: string;
    description?: string;
    amount?: number;
  }
) {
  return prisma.billingLineItem.update({
    where: { id: itemId },
    data: { ...data, isAiTagged: false },
  });
}

export async function finalizeStatement(statementId: string) {
  return prisma.billingStatement.update({
    where: { id: statementId },
    data: { status: BillingStatementStatus.FINALIZED },
  });
}

export async function getStatements(uploadedById: string, page = 1, limit = 20) {
  const [statements, total] = await Promise.all([
    prisma.billingStatement.findMany({
      where: { uploadedById },
      include: { _count: { select: { lineItems: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.billingStatement.count({ where: { uploadedById } }),
  ]);

  return { statements, total, page, limit };
}

export async function getStatementWithItems(statementId: string) {
  return prisma.billingStatement.findUnique({
    where: { id: statementId },
    include: {
      lineItems: { orderBy: { transactionDate: "asc" } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });
}

export function generateBillingCSV(
  items: Array<{
    transactionDate: Date | null;
    description: string;
    amount: number | { toString(): string };
    subsidiary: string | null;
    category: string | null;
    notes: string | null;
  }>
): string {
  const header = "Date,Description,Amount,Subsidiary,Category,Notes\n";
  const rows = items
    .map((item) => {
      const date = item.transactionDate ? item.transactionDate.toISOString().split("T")[0] : "";
      const amount = typeof item.amount === "object" ? item.amount.toString() : item.amount;
      return [
        date,
        `"${item.description.replace(/"/g, '""')}"`,
        amount,
        item.subsidiary ?? "",
        item.category ?? "",
        `"${(item.notes ?? "").replace(/"/g, '""')}"`,
      ].join(",");
    })
    .join("\n");

  return header + rows;
}
