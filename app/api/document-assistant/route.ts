import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessions } from "@/lib/services/document-assistant.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await getSessions(session.user.id);

  // Parse JSON fields before sending
  const data = sessions.map((s: typeof sessions[number]) => ({
    ...s,
    aiTopics: s.aiTopics ? (JSON.parse(s.aiTopics) as string[]) : null,
  }));

  return NextResponse.json({ success: true, data });
}
