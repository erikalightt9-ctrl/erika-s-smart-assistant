import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, Subsidiary } from "@prisma/client";
import bcrypt from "bcryptjs";

// ── GET /api/users ─────────────────────────────────────────────────────────
// Super Admin and Admin only
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ERIKA" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search     = searchParams.get("search") ?? "";
  const roleFilter = searchParams.get("role") ?? "";
  const subFilter  = searchParams.get("subsidiary") ?? "";
  const status     = searchParams.get("status") ?? ""; // "active" | "inactive" | ""

  const users = await prisma.user.findMany({
    where: {
      ...(search ? {
        OR: [
          { name:  { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
      ...(roleFilter ? { role: roleFilter as Role } : {}),
      ...(subFilter  ? { subsidiary: subFilter as Subsidiary } : {}),
      ...(status === "active"   ? { isActive: true  } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
    },
    select: {
      id:         true,
      name:       true,
      email:      true,
      role:       true,
      subsidiary: true,
      isActive:   true,
      createdAt:  true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ success: true, data: users });
}

// ── POST /api/users ────────────────────────────────────────────────────────
// Create a new user — Super Admin only
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ERIKA") {
    return NextResponse.json({ error: "Only Super Admin can create users" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, subsidiary } = body;

  if (!name?.trim())     return NextResponse.json({ error: "Name is required" },     { status: 400 });
  if (!email?.trim())    return NextResponse.json({ error: "Email is required" },    { status: 400 });
  if (!password?.trim()) return NextResponse.json({ error: "Password is required" }, { status: 400 });
  if (!role)             return NextResponse.json({ error: "Role is required" },     { status: 400 });

  // Validate role
  const validRoles: Role[] = ["ERIKA", "ADMIN", "EXEC", "STAFF"];
  if (!validRoles.includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name:       name.trim(),
        email:      email.toLowerCase().trim(),
        passwordHash,
        role:       role as Role,
        subsidiary: subsidiary ? (subsidiary as Subsidiary) : null,
        isActive:   true,
      },
      select: {
        id:         true,
        name:       true,
        email:      true,
        role:       true,
        subsidiary: true,
        isActive:   true,
        createdAt:  true,
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
