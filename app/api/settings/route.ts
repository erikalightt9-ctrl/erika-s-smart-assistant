import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Default config values ─────────────────────────────────────────────────
const DEFAULTS: Record<string, string> = {
  "deadline.sss":       "10",
  "deadline.philhealth": "10",
  "deadline.pagibig":   "10",
  "system.name":        "My Smart Assistant",
  "system.org":         "GDS Capital Inc.",
  "system.email":       "erikos@gdscapital.com",
};

// ── GET /api/settings ──────────────────────────────────────────────────────
// Returns all config as a flat key-value object, merged with defaults
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ERIKA" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.systemConfig.findMany();

  // Merge DB rows over defaults
  const config: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    config[row.key] = row.value;
  }

  return NextResponse.json({ success: true, data: config });
}

// ── PATCH /api/settings ────────────────────────────────────────────────────
// Upsert one or more config keys. Body: { "deadline.sss": "15", ... }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ERIKA" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as Record<string, string>;

  // Upsert each key-value pair
  const upserts = Object.entries(body).map(([key, value]) =>
    prisma.systemConfig.upsert({
      where:  { key },
      update: { value: String(value) },
      create: { key,   value: String(value) },
    })
  );

  await Promise.all(upserts);

  return NextResponse.json({ success: true });
}
