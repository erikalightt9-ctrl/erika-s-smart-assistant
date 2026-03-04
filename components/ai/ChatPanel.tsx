"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  RefreshCw,
  Bot,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How do I file a leave request?",
  "Explain the AI billing separator",
  "How does the document approval workflow work?",
  "What are the contribution deadlines?",
];

export function ChatPanel() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString()
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
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

      if (!res.body) throw new Error("No response body");

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
            const { text, error } = JSON.parse(payload);
            if (error) throw new Error(error);
            if (text) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + text },
                ];
              });
            }
          } catch {
            /* skip malformed */
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            content:
              "Sorry, I couldn't process your request. Please try again.",
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "#0a1628" }}
          aria-label="Open AI Assistant"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: "#c9a227" }}
          >
            AI
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden bg-black/30"
            onClick={() => setOpen(false)}
          />

          <div
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col shadow-2xl border-l"
            style={{
              width: "min(420px, 100vw)",
              backgroundColor: "#ffffff",
              borderColor: "#e2e8f0",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ backgroundColor: "#0a1628" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#c9a227" }}
                >
                  <Bot className="h-5 w-5" style={{ color: "#0a1628" }} />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">
                    AILE Assistant
                  </div>
                  <div className="text-white/50 text-xs">Powered by Claude AI</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-white/50 hover:text-white p-1.5 rounded transition-colors"
                    title="Clear conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/50 hover:text-white p-1.5 rounded transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: "#f5f3ff" }}
                  >
                    <Bot className="h-8 w-8" style={{ color: "#7c3aed" }} />
                  </div>
                  <p
                    className="font-semibold text-sm"
                    style={{ color: "#0f172a" }}
                  >
                    Hi {firstName}! 👋
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
                    I can help you navigate the system, answer questions, and
                    guide you through your tasks.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                        className="text-xs px-3 py-1.5 rounded-full border font-medium transition-all hover:bg-muted text-left"
                        style={{ borderColor: "#e2e8f0", color: "#475569" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ backgroundColor: "#f5f3ff" }}
                    >
                      <Bot
                        className="h-3.5 w-3.5"
                        style={{ color: "#7c3aed" }}
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words ${
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

            {/* Input */}
            <div
              className="px-4 py-4 border-t shrink-0"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything…"
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 min-h-[44px] max-h-[120px] disabled:opacity-50"
                  style={{ borderColor: "#e2e8f0" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 hover:opacity-90"
                  style={{ backgroundColor: "#0a1628" }}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
