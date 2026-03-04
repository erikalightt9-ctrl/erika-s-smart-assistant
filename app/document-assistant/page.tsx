"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  Upload,
  FileText,
  ImageIcon,
  FileSpreadsheet,
  Loader2,
  Trash2,
  MessageSquare,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface DocSession {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  aiSummary: string | null;
  aiTopics: string[] | null;
  aiSentiment: string | null;
  status: string;
  createdAt: string;
  _count: { messages: number };
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-700 border-green-200",
  neutral: "bg-blue-50 text-blue-700 border-blue-200",
  negative: "bg-red-100 text-red-700 border-red-200",
  mixed: "bg-amber-100 text-amber-700 border-amber-200",
};

function fileTypeIcon(mimeType: string) {
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-purple-500" />;
  return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DocumentAssistantPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [sessions, setSessions] = useState<DocSession[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/document-assistant");
    if (res.ok) {
      const json = await res.json();
      setSessions(json.data ?? []);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg("Uploading and analyzing with Claude AI…");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/document-assistant/upload", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) {
        setUploadMsg(json.error ?? "Upload failed");
        setTimeout(() => setUploadMsg(""), 4000);
        return;
      }

      router.push(`/document-assistant/${json.sessionId}`);
    } catch {
      setUploadMsg("Upload failed. Please try again.");
      setTimeout(() => setUploadMsg(""), 4000);
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/document-assistant/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "var(--navy)" }}
        >
          <BrainCircuit className="h-5 w-5" style={{ color: "var(--gold)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Business Document Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Upload any business document — Claude will extract insights, identify risks, and let you
            ask questions.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <Card
        className={`border-2 border-dashed transition-all cursor-pointer ${
          dragOver ? "border-blue-400 bg-blue-50/40" : "border-muted-foreground/20 hover:border-muted-foreground/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">{uploadMsg}</p>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center">
                <Upload className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  Drop your document here or{" "}
                  <span className="underline" style={{ color: "var(--gold)" }}>
                    browse
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF · JPEG · PNG · WebP · TXT · CSV &nbsp;·&nbsp; Max 10 MB
                </p>
              </div>
              {uploadMsg && (
                <p className="text-sm text-destructive font-medium">{uploadMsg}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv"
        className="hidden"
        onChange={onFileChange}
      />

      {/* What Claude analyzes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: "📋", label: "Executive Summary", desc: "Quick overview of the document" },
          { icon: "🎯", label: "Key Points", desc: "Critical facts and findings" },
          { icon: "✅", label: "Action Items", desc: "Follow-ups and next steps" },
          { icon: "🏷️", label: "Topics & Themes", desc: "Main subject areas identified" },
          { icon: "⚠️", label: "Risk Flags", desc: "Concerns and red flags" },
          { icon: "💬", label: "Conversational Q&A", desc: "Ask anything about the document" },
        ].map(({ icon, label, desc }) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-3 flex items-start gap-3"
          >
            <span className="text-2xl leading-none mt-0.5">{icon}</span>
            <div>
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Recent Documents</h2>
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="shrink-0">{fileTypeIcon(s.mimeType)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate max-w-[240px]">
                        {s.fileName}
                      </span>
                      {s.aiSentiment && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${
                            SENTIMENT_COLORS[s.aiSentiment] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {s.aiSentiment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{formatBytes(s.fileSize)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelative(s.createdAt)}
                      </span>
                      {s._count.messages > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {s._count.messages} msg{s._count.messages !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {s.aiTopics && s.aiTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.aiTopics.slice(0, 3).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] py-0">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.preventDefault(); handleDelete(s.id); }}
                      disabled={deletingId === s.id}
                    >
                      {deletingId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Link href={`/document-assistant/${s.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        Open
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
