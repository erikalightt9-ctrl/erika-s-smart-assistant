import prisma from "@/lib/prisma";
import { CollectionStatus, Subsidiary } from "@prisma/client";
import { randomUUID } from "crypto";

export interface CreateCollectionInput {
  clientName: string;
  invoiceNumber: string;
  description?: string;
  amount: number;
  dueDate: string; // ISO date string
  subsidiary: Subsidiary;
  notes?: string;
  createdById: string;
}

export interface UpdateCollectionInput {
  status?: CollectionStatus;
  paidAmount?: number;
  paidAt?: string;
  notes?: string;
}

export async function listCollections(filters?: {
  status?: CollectionStatus;
  subsidiary?: Subsidiary;
}) {
  return prisma.collectionRecord.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.subsidiary ? { subsidiary: filters.subsidiary } : {}),
    },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
    orderBy: { dueDate: "asc" },
  });
}

export async function getCollectionById(id: string) {
  return prisma.collectionRecord.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
  });
}

export async function createCollection(input: CreateCollectionInput) {
  return prisma.collectionRecord.create({
    data: {
      id: randomUUID(),
      clientName: input.clientName,
      invoiceNumber: input.invoiceNumber,
      description: input.description ?? null,
      amount: input.amount,
      dueDate: new Date(input.dueDate),
      subsidiary: input.subsidiary,
      notes: input.notes ?? null,
      createdById: input.createdById,
    },
  });
}

export async function updateCollection(id: string, input: UpdateCollectionInput) {
  return prisma.collectionRecord.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.paidAmount !== undefined ? { paidAmount: input.paidAmount } : {}),
      ...(input.paidAt !== undefined ? { paidAt: new Date(input.paidAt) } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
}

export async function getCollectionStats() {
  const [pending, partial, paid, overdue, writtenOff, all] = await Promise.all([
    prisma.collectionRecord.aggregate({ where: { status: "PENDING" }, _count: true, _sum: { amount: true } }),
    prisma.collectionRecord.aggregate({ where: { status: "PARTIAL" }, _count: true, _sum: { amount: true } }),
    prisma.collectionRecord.aggregate({ where: { status: "PAID" }, _count: true, _sum: { paidAmount: true } }),
    prisma.collectionRecord.aggregate({ where: { status: "OVERDUE" }, _count: true, _sum: { amount: true } }),
    prisma.collectionRecord.aggregate({ where: { status: "WRITTEN_OFF" }, _count: true, _sum: { amount: true } }),
    prisma.collectionRecord.aggregate({ _count: true, _sum: { amount: true } }),
  ]);
  return { pending, partial, paid, overdue, writtenOff, all };
}

/** Mark overdue records whose due date has passed and are still PENDING/PARTIAL */
export async function markOverdueCollections() {
  const now = new Date();
  return prisma.collectionRecord.updateMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });
}
