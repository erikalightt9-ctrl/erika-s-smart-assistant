import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, Subsidiary } from "@prisma/client";
import bcrypt from "bcryptjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["ADMIN", "EXEC", "STAFF"] as const;
const VALID_SUBS  = Object.values(Subsidiary) as string[];

function generatePassword(): string {
  // 10-char alphanumeric (no ambiguous chars like 0/O, 1/l/I)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 10 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export interface BulkUserRow {
  name:       string;
  email:      string;
  role?:      string;
  subsidiary?: string;
  department?: string;
  position?:  string;
  password?:  string;
}

export interface BulkFailure {
  row:   number;
  email: string;
  name:  string;
  error: string;
}

// ── POST /api/users/bulk ──────────────────────────────────────────────────────
// Bulk-create users from a parsed CSV array.
// Admin + Super Admin only. Admin cannot create ADMIN/ERIKA accounts.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = session.user.role;
  if (callerRole !== "ERIKA" && callerRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const users: BulkUserRow[] = body.users;

  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json({ error: "No users provided" }, { status: 400 });
  }
  if (users.length > 200) {
    return NextResponse.json({ error: "Maximum 200 users per import" }, { status: 400 });
  }

  const successList: string[] = [];
  const failedList: BulkFailure[] = [];

  for (let i = 0; i < users.length; i++) {
    const u   = users[i];
    const row = i + 1;

    // ── Validate required fields ─────────────────────────────────────────────
    if (!u.name?.trim()) {
      failedList.push({ row, email: u.email ?? "", name: u.name ?? "", error: "Name is required" });
      continue;
    }
    if (!u.email?.trim()) {
      failedList.push({ row, email: "", name: u.name, error: "Email is required" });
      continue;
    }
    if (!EMAIL_RE.test(u.email.trim())) {
      failedList.push({ row, email: u.email, name: u.name, error: "Invalid email format" });
      continue;
    }

    // ── Role ─────────────────────────────────────────────────────────────────
    const role = (u.role?.trim().toUpperCase() || "STAFF") as string;
    if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
      failedList.push({ row, email: u.email, name: u.name, error: `Invalid role "${u.role}". Use ADMIN, EXEC, or STAFF` });
      continue;
    }
    if (callerRole === "ADMIN" && role === "ADMIN") {
      failedList.push({ row, email: u.email, name: u.name, error: "Admins cannot create Admin accounts" });
      continue;
    }

    // ── Subsidiary ───────────────────────────────────────────────────────────
    let subsidiary: Subsidiary | null = null;
    if (u.subsidiary?.trim()) {
      const sub = u.subsidiary.trim().toUpperCase();
      if (!VALID_SUBS.includes(sub)) {
        failedList.push({ row, email: u.email, name: u.name, error: `Invalid company value "${u.subsidiary}"` });
        continue;
      }
      subsidiary = sub as Subsidiary;
    }

    // ── Email uniqueness ─────────────────────────────────────────────────────
    const normalEmail = u.email.toLowerCase().trim();
    const existing    = await prisma.user.findUnique({ where: { email: normalEmail } });
    if (existing) {
      failedList.push({ row, email: u.email, name: u.name, error: "Email already registered" });
      continue;
    }

    // ── Create user ───────────────────────────────────────────────────────────
    const rawPassword  = u.password?.trim() || generatePassword();
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    try {
      await prisma.user.create({
        data: {
          name:         u.name.trim(),
          email:        normalEmail,
          passwordHash,
          role:         role as Role,
          subsidiary,
          department:   u.department?.trim() || null,
          position:     u.position?.trim()   || null,
          isActive:     true,
        },
      });
      successList.push(normalEmail);
    } catch {
      failedList.push({ row, email: u.email, name: u.name, error: "Database error — please try again" });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      imported: successList.length,
      failed:   failedList.length,
      failures: failedList,
    },
  });
}
