import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/claude";
import {
  getSession,
  buildChatMessages,
  CHAT_SYSTEM_PROMPT,
} from "@/lib/services/document-assistant.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { sessionId } = await params;
  const { message } = await req.json();

  if (!message?.trim()) return new Response("Bad Request", { status: 400 });

  const docSession = await getSession(sessionId, session.user.id);
  if (!docSession) return new Response("Not found", { status: 404 });

  // Save user message
  await prisma.docChatMessage.create({
    data: { sessionId, role: "user", content: message },
  });

  // Build messages with document context (re-reads file from disk)
  const messages = await buildChatMessages(docSession);
  // Append the new user message
  messages.push({ role: "user", content: message });

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    let fullResponse = "";
    try {
      const isPdf = docSession.mimeType === "application/pdf";
      const streamOptions = {
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: CHAT_SYSTEM_PROMPT,
        messages,
      };

      const claudeStream = isPdf
        ? await (anthropic as any).beta.messages.stream({
            ...streamOptions,
            messages: streamOptions.messages as any,
            betas: ["pdfs-2024-09-25"],
          })
        : anthropic.messages.stream({
            ...streamOptions,
            messages: streamOptions.messages as any,
          });

      for await (const chunk of claudeStream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          const text = chunk.delta.text;
          fullResponse += text;
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
          );
        }
      }

      await prisma.docChatMessage.create({
        data: { sessionId, role: "assistant", content: fullResponse },
      });

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      console.error("Document chat error:", err);
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
