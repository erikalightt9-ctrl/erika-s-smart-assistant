import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { anthropic } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  topics: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  riskFlags: string[];
}

export interface SessionWithMessages {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  aiSummary: string | null;
  aiKeyPoints: string[] | null;
  aiActionItems: string[] | null;
  aiTopics: string[] | null;
  aiSentiment: string | null;
  aiRiskFlags: string[] | null;
  status: string;
  createdAt: Date;
  messages: { id: string; role: string; content: string; createdAt: Date }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
];

export const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ANALYSIS_PROMPT = `You are an expert business document analyst for GDS Capital, a Philippine holding company. Analyze this document thoroughly.

Respond ONLY with valid JSON using this exact structure:
{
  "summary": "A clear 2-3 paragraph executive summary covering the document's purpose, key content, and significance",
  "keyPoints": ["Up to 8 specific, concrete insights or findings from the document"],
  "actionItems": ["Specific follow-up tasks, deadlines, or recommendations if present — empty array if none"],
  "topics": ["3-6 main subject areas or themes covered"],
  "sentiment": "one of: positive, neutral, negative, mixed",
  "riskFlags": ["Any concerns, compliance issues, risks, ambiguous terms, or red flags — empty array if none"]
}

Rules:
- Be specific and concrete, referencing actual content from the document
- For keyPoints: extract the most important facts, numbers, dates, decisions
- For actionItems: only include if there are actual tasks or deadlines
- For riskFlags: flag missing signatures, unusual clauses, tight deadlines, compliance issues
- Return ONLY the JSON object, no markdown, no extra text`;

const CHAT_SYSTEM_PROMPT = `You are an expert business document analyst for GDS Capital, a Philippine holding company. A user has uploaded a business document and you have already analyzed it.

Your role:
- Answer questions about the document accurately and precisely
- Reference specific sections, numbers, dates, or clauses when relevant
- Provide actionable business intelligence and insights
- Point out implications the user may not have considered
- If information isn't in the document, say so clearly
- Use a professional yet conversational tone`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonField(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function formatSession(raw: {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  aiSummary: string | null;
  aiKeyPoints: string | null;
  aiActionItems: string | null;
  aiTopics: string | null;
  aiSentiment: string | null;
  aiRiskFlags: string | null;
  status: string;
  createdAt: Date;
  messages: { id: string; role: string; content: string; createdAt: Date }[];
}): SessionWithMessages {
  return {
    ...raw,
    aiKeyPoints: parseJsonField(raw.aiKeyPoints),
    aiActionItems: parseJsonField(raw.aiActionItems),
    aiTopics: parseJsonField(raw.aiTopics),
    aiRiskFlags: parseJsonField(raw.aiRiskFlags),
  };
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

export async function analyzeDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<DocumentAnalysis> {
  let rawText: string;

  if (mimeType === "application/pdf") {
    // Use Claude's native PDF reading via beta
    const response = await (anthropic as any).beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      betas: ["pdfs-2024-09-25"],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: buffer.toString("base64"),
              },
              title: fileName,
            },
            { type: "text", text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });
    rawText = response.content[0]?.text ?? "{}";
  } else if (mimeType.startsWith("image/")) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
                data: buffer.toString("base64"),
              },
            },
            { type: "text", text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });
    rawText = response.content[0]?.type === "text" ? response.content[0].text : "{}";
  } else {
    // text/plain, text/csv
    const text = buffer.toString("utf-8");
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Document: "${fileName}"\n\n${text}\n\n${ANALYSIS_PROMPT}`,
        },
      ],
    });
    rawText = response.content[0]?.type === "text" ? response.content[0].text : "{}";
  }

  // Extract JSON (strip markdown code blocks if present)
  const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returned invalid analysis response");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    summary: parsed.summary ?? "",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    sentiment: parsed.sentiment ?? "neutral",
    riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [],
  };
}

// ─── File Storage ─────────────────────────────────────────────────────────────

export async function saveFile(
  userId: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const dir = join(process.cwd(), "uploads", "document-assistant", userId);
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = join(dir, safeName);
  await writeFile(filePath, buffer);
  return filePath;
}

// ─── DB Operations ────────────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  filePath: string,
  analysis: DocumentAnalysis
) {
  return prisma.documentAnalysisSession.create({
    data: {
      userId,
      fileName,
      fileSize,
      mimeType,
      filePath,
      aiSummary: analysis.summary,
      aiKeyPoints: JSON.stringify(analysis.keyPoints),
      aiActionItems: JSON.stringify(analysis.actionItems),
      aiTopics: JSON.stringify(analysis.topics),
      aiSentiment: analysis.sentiment,
      aiRiskFlags: JSON.stringify(analysis.riskFlags),
      status: "READY",
    },
  });
}

export async function getSession(
  sessionId: string,
  userId: string
): Promise<SessionWithMessages | null> {
  const raw = await prisma.documentAnalysisSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!raw) return null;
  return formatSession(raw);
}

export async function getSessions(userId: string) {
  return prisma.documentAnalysisSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      aiSummary: true,
      aiTopics: true,
      aiSentiment: true,
      status: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export async function deleteSession(sessionId: string, userId: string) {
  const session = await prisma.documentAnalysisSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found");
  await prisma.documentAnalysisSession.delete({ where: { id: sessionId } });
}

// ─── Chat Streaming Context ───────────────────────────────────────────────────

export async function buildChatMessages(session: SessionWithMessages) {
  const buffer = await readFile(session.filePath);

  // Virtual first pair: document + ready message
  let docContent: unknown[];

  if (session.mimeType === "application/pdf") {
    docContent = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64"),
        },
        title: session.fileName,
      },
      {
        type: "text",
        text: "Please help me understand and analyze this business document. I'll ask you questions about it.",
      },
    ];
  } else if (session.mimeType.startsWith("image/")) {
    docContent = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: session.mimeType,
          data: buffer.toString("base64"),
        },
      },
      {
        type: "text",
        text: "Please help me understand and analyze this business document. I'll ask you questions about it.",
      },
    ];
  } else {
    const text = buffer.toString("utf-8");
    docContent = [
      {
        type: "text",
        text: `Document: "${session.fileName}"\n\n${text}\n\nPlease help me understand and analyze this business document. I'll ask you questions about it.`,
      },
    ];
  }

  const readyMessage = `I've reviewed "${session.fileName}". ${
    session.aiSummary ? session.aiSummary.substring(0, 150) + "..." : "I'm ready to help."
  } What would you like to know?`;

  return [
    { role: "user" as const, content: docContent },
    { role: "assistant" as const, content: readyMessage },
    ...session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
}

export { CHAT_SYSTEM_PROMPT };
