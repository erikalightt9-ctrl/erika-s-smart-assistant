import { prisma } from "@/lib/prisma";
import { AttendanceType } from "@prisma/client";

interface LocationData {
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
}

export async function clockIn(userId: string, options?: { notes?: string } & LocationData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendanceEntry.findFirst({
    where: { userId, date: today, type: AttendanceType.TIME_IN },
    orderBy: { timestamp: "desc" },
  });

  if (existing) {
    throw new Error("Already clocked in today.");
  }

  return prisma.attendanceEntry.create({
    data: {
      userId,
      type: AttendanceType.TIME_IN,
      date: today,
      notes: options?.notes,
      latitude: options?.latitude,
      longitude: options?.longitude,
      locationAddress: options?.locationAddress,
    },
  });
}

export async function clockOut(userId: string, options?: { notes?: string } & LocationData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timeIn = await prisma.attendanceEntry.findFirst({
    where: { userId, date: today, type: AttendanceType.TIME_IN },
  });

  if (!timeIn) {
    throw new Error("No time-in record found for today.");
  }

  const existingOut = await prisma.attendanceEntry.findFirst({
    where: { userId, date: today, type: AttendanceType.TIME_OUT },
  });

  if (existingOut) {
    throw new Error("Already clocked out today.");
  }

  return prisma.attendanceEntry.create({
    data: {
      userId,
      type: AttendanceType.TIME_OUT,
      date: today,
      notes: options?.notes,
      latitude: options?.latitude,
      longitude: options?.longitude,
      locationAddress: options?.locationAddress,
    },
  });
}

export async function getTodayStatus(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries = await prisma.attendanceEntry.findMany({
    where: { userId, date: today },
    orderBy: { timestamp: "asc" },
  });

  const timeIn = entries.find((e) => e.type === AttendanceType.TIME_IN);
  const timeOut = entries.find((e) => e.type === AttendanceType.TIME_OUT);

  return { timeIn, timeOut, entries };
}

export async function getDTR(userId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  const entries = await prisma.attendanceEntry.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: [{ date: "asc" }, { timestamp: "asc" }],
  });

  const daysInMonth = endDate.getDate();
  const dtrRows = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = date.toISOString().split("T")[0];
    const dayEntries = entries.filter((e) => e.date.toISOString().split("T")[0] === dateStr);

    const timeIn = dayEntries.find((e) => e.type === AttendanceType.TIME_IN);
    const timeOut = dayEntries.find((e) => e.type === AttendanceType.TIME_OUT);

    let totalHours: number | undefined;
    if (timeIn && timeOut) {
      const diff = timeOut.timestamp.getTime() - timeIn.timestamp.getTime();
      totalHours = Math.round((diff / 3600000) * 100) / 100;
    }

    dtrRows.push({
      date: dateStr,
      dayOfWeek: date.toLocaleDateString("en-PH", { weekday: "short" }),
      timeIn: timeIn?.timestamp.toISOString(),
      timeOut: timeOut?.timestamp.toISOString(),
      totalHours,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      timeInLocation: timeIn
        ? {
            latitude: timeIn.latitude,
            longitude: timeIn.longitude,
            address: timeIn.locationAddress,
          }
        : null,
      timeOutLocation: timeOut
        ? {
            latitude: timeOut.latitude,
            longitude: timeOut.longitude,
            address: timeOut.locationAddress,
          }
        : null,
    });
  }

  return dtrRows;
}

export async function getAttendanceList(filters: {
  userId?: string;
  subsidiaryUserIds?: string[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const { userId, startDate, endDate, page = 1, limit = 50 } = filters;

  const where = {
    ...(userId ? { userId } : {}),
    ...(startDate || endDate
      ? {
          date: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.attendanceEntry.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true, subsidiary: true } } },
      orderBy: [{ date: "desc" }, { timestamp: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendanceEntry.count({ where }),
  ]);

  return { entries, total, page, limit };
}
