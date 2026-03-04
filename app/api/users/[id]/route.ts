import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, Subsidiary } from "@prisma/client";
import bcrypt from "bcryptjs";

// ── GET /api/users/[id] ────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ERIKA" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id:         true,
      name:       true,
      email:      true,
      role:       true,
      subsidiary: true,
      isActive:   true,
      createdAt:  true,
      updatedAt:  true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: user });
}

// ── PATCH /api/users/[id] ──────────────────────────────────────────────────
// Update name, role, subsidiary, isActive, or reset password
// Super Admin can update anyone; Admin cannot touch ERIKA accounts
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = session.user.role;
  if (callerRole !== "ERIKA" && callerRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Fetch existing user
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Admin cannot modify another ERIKA account
  if (callerRole === "ADMIN" && existing.role === "ERIKA") {
    return NextResponse.json({ error: "Cannot modify Super Admin account" }, { status: 403 });
  }

  const body = await req.json();
  const { name, role, subsidiary, isActive, password } = body;

  // Build update payload (immutable pattern — only set defined fields)
  const updateData: Record<string, unknown> = {};
  if (name !== undefined)       updateData.name       = name.trim();
  if (role !== undefined)       updateData.role       = role as Role;
  if (isActive !== undefined)   updateData.isActive   = Boolean(isActive);
  if (subsidiary !== undefined) updateData.subsidiary = subsidiary ? (subsidiary as Subsidiary) : null;
  if (password?.trim())         updateData.passwordHash = await bcrypt.hash(password, 12);

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id:         true,
        name:       true,
        email:      true,
        role:       true,
        subsidiary: true,
        isActive:   true,
        updatedAt:  true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
