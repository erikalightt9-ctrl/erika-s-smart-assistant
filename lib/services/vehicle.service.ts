import prisma from "@/lib/prisma";
import { Subsidiary, VehicleLogType, VehicleStatus } from "@prisma/client";
import { randomUUID } from "crypto";

export interface CreateVehicleInput {
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  subsidiary: Subsidiary;
  assignedToId?: string;
  notes?: string;
}

export interface CreateVehicleLogInput {
  vehicleId: string;
  logType: VehicleLogType;
  description: string;
  date: string; // ISO date
  mileage?: number;
  cost?: number;
  driverName?: string;
  notes?: string;
  createdById: string;
}

export async function listVehicles(filters?: {
  status?: VehicleStatus;
  subsidiary?: Subsidiary;
}) {
  return prisma.vehicle.findMany({
    where: {
      ...(filters?.status     ? { status: filters.status }         : {}),
      ...(filters?.subsidiary ? { subsidiary: filters.subsidiary } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, role: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVehicleById(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, role: true } },
      logs: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
        take: 50,
      },
    },
  });
}

export async function createVehicle(input: CreateVehicleInput) {
  return prisma.vehicle.create({
    data: {
      id: randomUUID(),
      plateNumber: input.plateNumber,
      make: input.make,
      model: input.model,
      year: input.year,
      color: input.color ?? null,
      subsidiary: input.subsidiary,
      assignedToId: input.assignedToId ?? null,
      notes: input.notes ?? null,
    },
  });
}

export async function updateVehicle(
  id: string,
  data: Partial<Omit<CreateVehicleInput, "plateNumber">> & { status?: VehicleStatus }
) {
  return prisma.vehicle.update({
    where: { id },
    data: {
      ...(data.make          !== undefined ? { make: data.make }                   : {}),
      ...(data.model         !== undefined ? { model: data.model }                 : {}),
      ...(data.year          !== undefined ? { year: data.year }                   : {}),
      ...(data.color         !== undefined ? { color: data.color }                 : {}),
      ...(data.subsidiary    !== undefined ? { subsidiary: data.subsidiary }       : {}),
      ...(data.assignedToId  !== undefined ? { assignedToId: data.assignedToId }  : {}),
      ...(data.status        !== undefined ? { status: data.status }               : {}),
      ...(data.notes         !== undefined ? { notes: data.notes }                 : {}),
    },
  });
}

export async function addVehicleLog(input: CreateVehicleLogInput) {
  return prisma.vehicleLog.create({
    data: {
      id: randomUUID(),
      vehicleId: input.vehicleId,
      logType: input.logType,
      description: input.description,
      date: new Date(input.date),
      mileage: input.mileage ?? null,
      cost: input.cost ?? null,
      driverName: input.driverName ?? null,
      notes: input.notes ?? null,
      createdById: input.createdById,
    },
  });
}

export async function getVehicleStats() {
  const [active, maintenance, inactive, sold] = await Promise.all([
    prisma.vehicle.count({ where: { status: "ACTIVE" } }),
    prisma.vehicle.count({ where: { status: "MAINTENANCE" } }),
    prisma.vehicle.count({ where: { status: "INACTIVE" } }),
    prisma.vehicle.count({ where: { status: "SOLD" } }),
  ]);
  return { active, maintenance, inactive, sold, total: active + maintenance + inactive + sold };
}
