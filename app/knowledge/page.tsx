"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  ExternalLink,
  Sparkles,
  Upload,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  fileName: string | null;
  createdAt: string;
  uploadedBy: { name: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "policy", label: "Policy" },
  { value: "sop", label: "SOP / Procedure" },
  { value: "faq", label: "FAQ" },
  { value: "announcement", label: "Announcement" },
  { value: "general", label: "General" },
];

const CATEGORY_CONFIG: Record<string, { color: string; bg: string }> = {
  policy:       { color: "#2563eb", bg: "#eff6ff" },
  sop:          { color: "#7c3aed", bg: "#f5f3ff" },
  faq:          { color: "#d97706", bg: "#fffbeb" },
  announcement: { color: "#dc2626", bg: "#fef2f2" },
  general:      { color: "#64748b", bg: "#f1f5f9" },
};

type Tab = "library" | "document-ai";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>("library");

  // Knowledge library state
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "general",
    fileName: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      if (data.success) setDocs(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ title: "", content: "", category: "general", fileName: "" });
        setShowForm(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#0f172a" }}>
          <BrainCircuit className="h-6 w-6" style={{ color: "#7c3aed" }} />
          Knowledge Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage company knowledge and analyze documents with AI
        </p>
      </div>

      {/* ── Tab switcher ── */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ backgroundColor: "#f1f5f9" }}
      >
        {(
          [
            { id: "library",     label: "Knowledge Library",    icon: BookOpen },
            { id: "document-ai", label: "AI Document Analysis", icon: Sparkles },
          ] as { id: Tab; label: string; icon: React.ElementType }[]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              activeTab === id
                ? { backgroundColor: "#0a1628", color: "white" }
                : { color: "#64748b" }
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Knowledge Library tab ── */}
      {activeTab === "library" && (
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Documents added here are referenced by the AI Assistant when answering questions.
            </p>
            <Button
              onClick={() => setShowForm((v) => !v)}
              className="gap-2 shrink-0"
              style={{ backgroundColor: "#0a1628", color: "white" }}
            >
              {showForm ? (
                <><X className="h-4 w-4" /> Cancel</>
              ) : (
                <><Plus className="h-4 w-4" /> Add Document</>
              )}
            </Button>
          </div>

          {/* Add form */}
          {showForm && (
            <div
              className="bg-white rounded-xl border p-6 space-y-4"
              style={{ borderColor: "#e8edf3" }}
            >
              <h2 className="font-semibold text-sm" style={{ color: "#0f172a" }}>
                Add Knowledge Document
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Leave Policy, Overtime Guidelines"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">Category</Label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 rounded-md border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="content" className="text-xs font-semibold">
                  Content *{" "}
                  <span className="text-muted-foreground font-normal">
                    (paste text, policy details, or FAQ answers)
                  </span>
                </Label>
                <Textarea
                  id="content"
                  placeholder="Paste the document content here. The AI will use this to answer employee questions."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={8}
                  className="resize-y"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fileName" className="text-xs font-semibold">
                  Source File Name{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="fileName"
                  placeholder="e.g. HR-Leave-Policy-2024.pdf"
                  value={form.fileName}
                  onChange={(e) => setForm({ ...form, fileName: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.content.trim()}
                  className="gap-2"
                  style={{ backgroundColor: "#0a1628", color: "white" }}
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Saving…" : "Save Document"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ title: "", content: "", category: "general", fileName: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Info banner */}
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex gap-3 text-sm">
            <BookOpen className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-purple-800">
              <p className="font-semibold">How the Knowledge Library works</p>
              <p className="text-xs mt-0.5 text-purple-600">
                Documents added here are automatically provided as context to the AI Assistant.
                When employees ask about company policies or procedures, the AI references these
                documents to give accurate answers.
              </p>
            </div>
          </div>

          {/* Documents list */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading documents…
            </div>
          ) : docs.length === 0 ? (
            <div
              className="bg-white rounded-xl border py-12 text-center"
              style={{ borderColor: "#e8edf3" }}
            >
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-semibold text-sm" style={{ color: "#0f172a" }}>
                No documents yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first knowledge document to power the AI Assistant
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                {docs.length} document{docs.length !== 1 ? "s" : ""}
              </p>
              {docs.map((doc) => {
                const cfg = CATEGORY_CONFIG[doc.category] ?? CATEGORY_CONFIG.general;
                const isExpanded = expandedId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border overflow-hidden"
                    style={{ borderColor: "#e8edf3" }}
                  >
                    <div className="flex items-start gap-4 p-5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <FileText className="h-5 w-5" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>
                            {doc.title}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Added by {doc.uploadedBy.name} · {fmt(doc.createdAt)}
                          {doc.fileName && ` · ${doc.fileName}`}
                        </p>
                        <p
                          className="text-xs mt-1 line-clamp-2"
                          style={{ color: "#64748b" }}
                        >
                          {doc.content.slice(0, 180)}
                          {doc.content.length > 180 ? "…" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Delete document"
                        >
                          {deletingId === doc.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div
                        className="px-5 pb-5 pt-0 border-t"
                        style={{ borderColor: "#f1f5f9" }}
                      >
                        <p className="text-xs font-semibold text-muted-foreground mb-2 mt-4">
                          FULL CONTENT
                        </p>
                        <pre
                          className="text-xs whitespace-pre-wrap break-words p-4 rounded-lg"
                          style={{
                            backgroundColor: "#f8fafc",
                            color: "#334155",
                            fontFamily: "inherit",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {doc.content}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── AI Document Analysis tab ── */}
      {activeTab === "document-ai" && (
        <div className="space-y-6">

          {/* Hero CTA */}
          <div
            className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
            style={{ backgroundColor: "#0a1628" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#7c3aed22" }}
            >
              <BrainCircuit className="h-7 w-7" style={{ color: "#a78bfa" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-base">AI Document Analysis</h2>
              <p className="text-white/60 text-sm mt-0.5">
                Upload any document — contracts, reports, or statements — and ask Claude AI
                to read, summarize, and extract key information for you.
              </p>
            </div>
            <Link href="/document-assistant" className="shrink-0">
              <Button
                className="gap-2 font-semibold"
                style={{ backgroundColor: "#c9a227", color: "#0a1628" }}
              >
                <ExternalLink className="h-4 w-4" />
                Open Doc AI
              </Button>
            </Link>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Upload,
                color: "#2563eb",
                bg: "#eff6ff",
                title: "Upload Documents",
                desc: "Supports PDF, Word, images, and more. Claude reads the full contents.",
              },
              {
                icon: MessageSquare,
                color: "#7c3aed",
                bg: "#f5f3ff",
                title: "Ask Any Question",
                desc: "Summarize, extract data, find clauses, translate — all via natural language.",
              },
              {
                icon: Sparkles,
                color: "#d97706",
                bg: "#fffbeb",
                title: "AI-Powered Insights",
                desc: "Claude identifies key dates, amounts, parties, and action items automatically.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-xl border p-4"
                style={{ borderColor: "#e8edf3" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: card.bg }}
                >
                  <card.icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <p className="font-semibold text-sm mb-1" style={{ color: "#0f172a" }}>
                  {card.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Relation to knowledge library */}
          <div
            className="rounded-xl border p-4 flex gap-3 text-sm"
            style={{ borderColor: "#ddd6fe", backgroundColor: "#faf5ff" }}
          >
            <BookOpen className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-800">How it connects to the Knowledge Library</p>
              <p className="text-xs text-purple-600 mt-0.5 leading-relaxed">
                Use <strong>AI Document Analysis</strong> to analyze individual files on the fly.
                Use the <strong>Knowledge Library</strong> to store company-wide policies and SOPs
                that the AI Assistant permanently references for all employees.
              </p>
            </div>
          </div>

          <Link href="/document-assistant" className="block">
            <div
              className="group flex items-center justify-between rounded-xl border px-5 py-4 transition-all hover:shadow-md cursor-pointer"
              style={{ borderColor: "#ddd6fe", backgroundColor: "#faf5ff" }}
            >
              <div className="flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-semibold text-sm text-purple-800">Start a new analysis session</p>
                  <p className="text-xs text-purple-600">Upload a document and start chatting with Claude</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
