import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const CONFIG_KEY = "admin_module_access";

// Default: minimum role required to access each admin sub-module
const DEFAULT_ACCESS: Record<string, string> = {
  collections:    "EXEC",
  purchases:      "EXEC",
  maintenance:    "EXEC",
  vehicles:       "EXEC",
  reports:        "EXEC",
  "access-control": "ADMIN",
};

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ERIKA", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
  const access = config ? JSON.parse(config.value) : DEFAULT_ACCESS;

  return NextResponse.json({ success: true, data: access });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ERIKA") {
    return NextResponse.json({ error: "Only ERIKA can modify access control rules" }, { status: 403 });
  }

  const body = await req.json();
  const VALID_ROLES = ["ERIKA", "ADMIN", "EXEC", "STAFF"];
  const VALID_MODULES = Object.keys(DEFAULT_ACCESS);

  // Validate all keys
  for (const [mod, role] of Object.entries(body)) {
    if (!VALID_MODULES.includes(mod)) return NextResponse.json({ error: `Unknown module: ${mod}` }, { status: 400 });
    if (!VALID_ROLES.includes(role as string)) return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
  }

  // Read current config and merge
  const existing = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
  const current = existing ? JSON.parse(existing.value) : DEFAULT_ACCESS;
  const updated = { ...current, ...body };

  await prisma.systemConfig.upsert({
    where:  { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: JSON.stringify(updated) },
    update: { value: JSON.stringify(updated) },
  });

  return NextResponse.json({ success: true, data: updated });
}
