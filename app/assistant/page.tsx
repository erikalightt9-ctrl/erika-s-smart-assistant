"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Bot,
  Send,
  RefreshCw,
  Trash2,
  MessageSquarePlus,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { emoji: "📋", text: "How do I file a leave request?" },
  { emoji: "💳", text: "How does the AI Billing Separator work?" },
  { emoji: "📄", text: "Walk me through the document approval workflow" },
  { emoji: "💰", text: "Explain government contributions (SSS, PhilHealth, Pag-IBIG)" },
  { emoji: "⏰", text: "How do I log my time-in and time-out?" },
  { emoji: "🔍", text: "What modules are available in AILE?" },
];

// Ensure session check on server side is handled by middleware
export default function AssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: msg,
      };

      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setLoading(true);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next.map((m) => ({ role: m.role, content: m.content })),
            sessionId,
          }),
        });

        if (!res.body) throw new Error("No body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
              const { text: chunk, error } = JSON.parse(payload);
              if (error) throw new Error(error);
              if (chunk) {
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: last.content + chunk },
                  ];
                });
              }
            } catch {
              /* skip */
            }
          }
        }
      } catch {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...last, content: "Sorry, I couldn't respond. Please try again." },
          ];
        });
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [input, loading, messages, sessionId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-56px)]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0"
        style={{ borderColor: "#e8edf3" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#f5f3ff" }}
          >
            <Bot className="h-5 w-5" style={{ color: "#7c3aed" }} />
          </div>
          <div>
            <h1 className="font-bold text-base" style={{ color: "#0f172a" }}>
              AI Assistant
            </h1>
            <p className="text-xs text-muted-foreground">
              Powered by Claude AI · Context-aware
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all hover:bg-muted text-muted-foreground"
              style={{ borderColor: "#e2e8f0" }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
          <button
            onClick={() => {
              setMessages([]);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all hover:bg-muted font-semibold"
            style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            {/* Welcome */}
            <div className="text-center mb-8">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: "#0a1628" }}
              >
                <Bot className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#0f172a" }}>
                Hi {firstName}, how can I help?
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                I&apos;m your AILE assistant. Ask me anything about the
                system, company policies, or your tasks.
              </p>
            </div>

            {/* Suggestion grid */}
            <div className="grid sm:grid-cols-2 gap-3">
              {SUGGESTIONS.map(({ emoji, text }) => (
                <button
                  key={text}
                  onClick={() => sendMessage(text)}
                  className="flex items-start gap-3 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 bg-white"
                  style={{ borderColor: "#e8edf3" }}
                >
                  <span className="text-xl shrink-0">{emoji}</span>
                  <span
                    className="text-sm font-medium leading-snug"
                    style={{ color: "#0f172a" }}
                  >
                    {text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        <div className="max-w-2xl mx-auto w-full space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{ backgroundColor: "#f5f3ff" }}
                >
                  <Bot className="h-4 w-4" style={{ color: "#7c3aed" }} />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                }`}
                style={
                  msg.role === "user"
                    ? { backgroundColor: "#0a1628", color: "white" }
                    : {
                        backgroundColor: "#f8fafc",
                        color: "#0f172a",
                        border: "1px solid #e2e8f0",
                      }
                }
              >
                {msg.content || (
                  <span className="flex gap-1 items-center py-0.5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          backgroundColor:
                            msg.role === "user" ? "white" : "#94a3b8",
                          animationDelay: `${delay}ms`,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="px-6 py-4 border-t bg-white shrink-0"
        style={{ borderColor: "#e8edf3" }}
      >
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about AILE or company policies…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 min-h-[48px] max-h-[160px] disabled:opacity-50"
            style={{ borderColor: "#e2e8f0" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: "#0a1628" }}
          >
            {loading ? (
              <RefreshCw className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Enter to send · Shift+Enter for new line · Responses from Claude AI
        </p>
      </div>
    </div>
  );
}
