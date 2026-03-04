"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BrainCircuit,
  Loader2,
  Send,
  FileText,
  ImageIcon,
  FileSpreadsheet,
  AlertTriangle,
  CheckSquare,
  Square,
  Sparkles,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

interface DocMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface DocSession {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  aiSummary: string | null;
  aiKeyPoints: string[] | null;
  aiActionItems: string[] | null;
  aiTopics: string[] | null;
  aiSentiment: string | null;
  aiRiskFlags: string[] | null;
  status: string;
  createdAt: string;
  messages: DocMessage[];
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  positive: { label: "Positive", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  neutral: { label: "Neutral", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  negative: { label: "Negative", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  mixed: { label: "Mixed", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-purple-500" />;
  return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
}

function MessageBubble({ msg }: { msg: DocMessage | { role: string; content: string; streaming?: boolean } }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-muted" : ""
        }`}
        style={!isUser ? { backgroundColor: "var(--navy)" } : {}}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Bot className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-muted text-foreground"
            : "rounded-tl-sm bg-white border text-foreground"
        }`}
      >
        {"streaming" in msg && msg.streaming ? (
          <span>
            {msg.content}
            <span className="inline-block ml-0.5 animate-pulse">▋</span>
          </span>
        ) : (
          msg.content
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Summarize the key obligations in this document",
  "What are the payment terms and deadlines?",
  "Identify any clauses I should be concerned about",
  "What actions do I need to take after reading this?",
  "Explain any technical or legal terms used",
  "What is the overall tone and intent of this document?",
];

export default function DocumentSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<DocSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/document-assistant/${sessionId}`);
    if (res.ok) {
      const json = await res.json();
      setSession(json.data);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streamingText]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput("");

    // Optimistic update
    const userMsg: DocMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setSession((prev) => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch(`/api/document-assistant/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text } = JSON.parse(payload);
            if (text) {
              fullText += text;
              setStreamingText(fullText);
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Commit final message
      const assistantMsg: DocMessage = {
        id: `tmp-a-${Date.now()}`,
        role: "assistant",
        content: fullText,
        createdAt: new Date().toISOString(),
      };
      setSession((prev) =>
        prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : prev
      );
    } catch (err) {
      console.error(err);
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Document not found.{" "}
        <Link href="/document-assistant" className="underline text-foreground">
          Go back
        </Link>
      </div>
    );
  }

  const sentiment = session.aiSentiment ? SENTIMENT_CONFIG[session.aiSentiment] : null;

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-7rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/document-assistant">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          {fileIcon(session.mimeType)}
          <h1 className="font-semibold text-base truncate">{session.fileName}</h1>
          <span className="text-xs text-muted-foreground shrink-0">{formatBytes(session.fileSize)}</span>
        </div>
        {sentiment && (
          <span
            className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${sentiment.bg} ${sentiment.color}`}
          >
            {sentiment.label} sentiment
          </span>
        )}
      </div>

      {/* Split panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Insights */}
        <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">

          {/* Topics */}
          {session.aiTopics && session.aiTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.aiTopics.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {/* Summary */}
          <Card className="border">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Executive Summary
                </span>
                <button onClick={() => setSummaryExpanded((v) => !v)} className="text-muted-foreground hover:text-foreground">
                  {summaryExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </CardTitle>
            </CardHeader>
            {summaryExpanded && (
              <CardContent className="px-4 pb-3">
                <p className="text-sm leading-relaxed text-foreground/80">
                  {session.aiSummary ?? "No summary available."}
                </p>
              </CardContent>
            )}
          </Card>

          {/* Key Points */}
          {session.aiKeyPoints && session.aiKeyPoints.length > 0 && (
            <Card className="border">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Key Points
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ul className="space-y-1.5">
                  {session.aiKeyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className="mt-0.5 h-4 w-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                        style={{ backgroundColor: "var(--navy)" }}
                      >
                        {i + 1}
                      </span>
                      <span className="leading-snug text-foreground/80">{pt}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {session.aiActionItems && session.aiActionItems.length > 0 && (
            <Card className="border">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Square className="h-3.5 w-3.5 text-blue-500" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ul className="space-y-2">
                  {session.aiActionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckSquare className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                      <span className="leading-snug text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Risk Flags */}
          {session.aiRiskFlags && session.aiRiskFlags.length > 0 && (
            <Card className="border border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Risk Flags
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ul className="space-y-1.5">
                  {session.aiRiskFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="leading-snug">{flag}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Chat */}
        <div className="flex-1 flex flex-col min-w-0 border rounded-xl bg-white overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {session.messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "var(--navy)" }}
                >
                  <BrainCircuit className="h-6 w-6" style={{ color: "var(--gold)" }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">Ask anything about this document</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Claude has already read and analyzed it — ask for insights, clarifications, or specific details.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-2">
                  {SUGGESTIONS.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left text-xs px-3 py-2 rounded-lg border hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {session.messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {streaming && streamingText && (
              <MessageBubble
                msg={{ role: "assistant", content: streamingText, streaming: true }}
              />
            )}

            {streaming && !streamingText && (
              <div className="flex gap-2.5">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--navy)" }}
                >
                  <Bot className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
                </div>
                <div className="rounded-2xl rounded-tl-sm border px-3.5 py-2.5 bg-white">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about this document…"
                rows={1}
                className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[38px] max-h-28 overflow-y-auto"
                style={{ lineHeight: "1.5" }}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                size="icon"
                className="shrink-0"
                style={{ backgroundColor: "var(--navy)" }}
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
