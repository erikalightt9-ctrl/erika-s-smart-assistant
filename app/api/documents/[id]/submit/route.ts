import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submitForSignature } from "@/lib/services/document.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const doc = await submitForSignature(id, session.user.id);
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit document" }, { status: 500 });
  }
}
