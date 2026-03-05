import prisma from "@/lib/prisma";
import { AssetType, MaintenanceStatus, Subsidiary } from "@prisma/client";
import { randomUUID } from "crypto";

export interface CreateMaintenanceInput {
  assetName: string;
  assetType: AssetType;
  description?: string;
  scheduledDate: string; // ISO date string
  subsidiary: Subsidiary;
  performedBy?: string;
  cost?: number;
  notes?: string;
  createdById: string;
}

export interface UpdateMaintenanceInput {
  status?: MaintenanceStatus;
  completedAt?: string;
  performedBy?: string;
  cost?: number;
  notes?: string;
}

export async function listMaintenance(filters?: {
  status?: MaintenanceStatus;
  assetType?: AssetType;
  subsidiary?: Subsidiary;
}) {
  return prisma.maintenanceRecord.findMany({
    where: {
      ...(filters?.status    ? { status: filters.status }       : {}),
      ...(filters?.assetType ? { assetType: filters.assetType } : {}),
      ...(filters?.subsidiary ? { subsidiary: filters.subsidiary } : {}),
    },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
    orderBy: { scheduledDate: "asc" },
  });
}

export async function getMaintenanceById(id: string) {
  return prisma.maintenanceRecord.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
  });
}

export async function createMaintenance(input: CreateMaintenanceInput) {
  return prisma.maintenanceRecord.create({
    data: {
      id: randomUUID(),
      assetName: input.assetName,
      assetType: input.assetType,
      description: input.description ?? null,
      scheduledDate: new Date(input.scheduledDate),
      subsidiary: input.subsidiary,
      performedBy: input.performedBy ?? null,
      cost: input.cost ?? null,
      notes: input.notes ?? null,
      createdById: input.createdById,
    },
  });
}

export async function updateMaintenance(id: string, input: UpdateMaintenanceInput) {
  return prisma.maintenanceRecord.update({
    where: { id },
    data: {
      ...(input.status      !== undefined ? { status: input.status }                      : {}),
      ...(input.completedAt !== undefined ? { completedAt: new Date(input.completedAt) }  : {}),
      ...(input.performedBy !== undefined ? { performedBy: input.performedBy }            : {}),
      ...(input.cost        !== undefined ? { cost: input.cost }                          : {}),
      ...(input.notes       !== undefined ? { notes: input.notes }                        : {}),
    },
  });
}

export async function getMaintenanceStats() {
  const [scheduled, inProgress, completed, overdue, cancelled] = await Promise.all([
    prisma.maintenanceRecord.aggregate({ where: { status: "SCHEDULED" },   _count: true, _sum: { cost: true } }),
    prisma.maintenanceRecord.aggregate({ where: { status: "IN_PROGRESS" }, _count: true, _sum: { cost: true } }),
    prisma.maintenanceRecord.aggregate({ where: { status: "COMPLETED" },   _count: true, _sum: { cost: true } }),
    prisma.maintenanceRecord.aggregate({ where: { status: "OVERDUE" },     _count: true }),
    prisma.maintenanceRecord.aggregate({ where: { status: "CANCELLED" },   _count: true }),
  ]);
  return { scheduled, inProgress, completed, overdue, cancelled };
}

/** Auto-mark overdue maintenance records */
export async function markOverdueMaintenance() {
  const now = new Date();
  return prisma.maintenanceRecord.updateMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });
}
