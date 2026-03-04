import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { anthropic } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages, sessionId } = await req.json();
  if (!Array.isArray(messages) || !sessionId) {
    return new Response("Bad Request", { status: 400 });
  }

  // Fetch knowledge base for context
  const knowledgeDocs = await prisma.knowledgeDocument.findMany({
    where: { isActive: true },
    select: { title: true, content: true, category: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const knowledgeContext =
    knowledgeDocs.length > 0
      ? `\n\n--- Company Knowledge Base ---\n${knowledgeDocs
          .map((d) => `## ${d.title} [${d.category}]\n${d.content}`)
          .join("\n\n")}\n--- End of Knowledge Base ---`
      : "";

  const systemPrompt = `You are AILE Assistant (AI Leverage), the intelligent AI assistant for GDS Capital's My Smart Office Assistant system. You help employees navigate the system, answer questions, and improve their productivity.

Current user: ${session.user.name} (Role: ${session.user.role})${session.user.subsidiary ? `\nSubsidiary: ${session.user.subsidiary}` : "\nScope: All Subsidiaries"}

System modules available:
- AI Billing Generator (/billing): Upload credit card statements — Claude AI reads and extracts every line item, then auto-tags expenses per subsidiary.
- Regulatory Compliance Management (/contributions): Auto-compute SSS, PhilHealth, Pag-IBIG contributions. Generate remittance reports.
- Timekeeping/Attendance (/timekeeping): Log time-in/out, generate DTR reports, manage overtime and leave requests.
- Document Approval Workflow (/documents): Submit documents for review/approval, e-signature workflow, full audit trail.
- AI Assistant (/assistant): This chat interface — ask anything about the system or company.
- Knowledge Base (/knowledge): Company policies, SOPs, and reference documents.
${knowledgeContext}

Guidelines:
- Be helpful, concise, and professional.
- When asked about system features, explain clearly and provide navigation paths.
- Reference the knowledge base when relevant.
- For HR or policy questions, cite the appropriate knowledge base document if available.
- Always respond in English unless the user writes in another language.`;

  // Save user message
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role === "user") {
    await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        role: "user",
        content: lastMsg.content,
        sessionId,
      },
    });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    let fullResponse = "";
    try {
      const response = await anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });

      for await (const chunk of response) {
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

      // Save assistant response
      await prisma.chatMessage.create({
        data: {
          userId: session.user.id,
          role: "assistant",
          content: fullResponse,
          sessionId,
        },
      });

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch {
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ error: "Failed to get a response. Please try again." })}\n\n`
        )
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
