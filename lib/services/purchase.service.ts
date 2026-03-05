import prisma from "@/lib/prisma";
import { PurchaseStatus, Subsidiary } from "@prisma/client";
import { randomUUID } from "crypto";

export interface CreatePurchaseInput {
  title: string;
  vendor: string;
  description?: string;
  amount: number;
  subsidiary: Subsidiary;
  category?: string;
  notes?: string;
  requestedById: string;
}

export async function listPurchases(filters?: {
  status?: PurchaseStatus;
  subsidiary?: Subsidiary;
}) {
  return prisma.purchaseOrder.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.subsidiary ? { subsidiary: filters.subsidiary } : {}),
    },
    include: {
      requester: { select: { id: true, name: true, role: true } },
      approver:  { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseById(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, role: true } },
      approver:  { select: { id: true, name: true, role: true } },
    },
  });
}

export async function createPurchase(input: CreatePurchaseInput) {
  return prisma.purchaseOrder.create({
    data: {
      id: randomUUID(),
      title: input.title,
      vendor: input.vendor,
      description: input.description ?? null,
      amount: input.amount,
      subsidiary: input.subsidiary,
      category: input.category ?? null,
      notes: input.notes ?? null,
      requestedById: input.requestedById,
    },
  });
}

export async function approvePurchase(id: string, approverId: string) {
  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "APPROVED" as PurchaseStatus,
      approvedById: approverId,
      approvedAt: new Date(),
    },
  });
}

export async function rejectPurchase(id: string, approverId: string) {
  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "REJECTED" as PurchaseStatus,
      approvedById: approverId,
      approvedAt: new Date(),
    },
  });
}

export async function updatePurchaseStatus(id: string, status: PurchaseStatus) {
  return prisma.purchaseOrder.update({ where: { id }, data: { status } });
}

export async function getPurchaseStats() {
  const [pending, approved, rejected, ordered, received] = await Promise.all([
    prisma.purchaseOrder.aggregate({ where: { status: "PENDING" },  _count: true, _sum: { amount: true } }),
    prisma.purchaseOrder.aggregate({ where: { status: "APPROVED" }, _count: true, _sum: { amount: true } }),
    prisma.purchaseOrder.aggregate({ where: { status: "REJECTED" }, _count: true, _sum: { amount: true } }),
    prisma.purchaseOrder.aggregate({ where: { status: "ORDERED" },  _count: true, _sum: { amount: true } }),
    prisma.purchaseOrder.aggregate({ where: { status: "RECEIVED" }, _count: true, _sum: { amount: true } }),
  ]);
  return { pending, approved, rejected, ordered, received };
}
