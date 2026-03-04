"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Plus, Search, PenLine, Eye, ArrowRight, X, Inbox,
} from "lucide-react";
import Link from "next/link";

// ── 10-status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT:                 { label: "Draft",             bg: "bg-gray-100",    text: "text-gray-700",    dot: "#6b7280" },
  SUBMITTED:             { label: "Submitted",          bg: "bg-blue-100",    text: "text-blue-700",    dot: "#3b82f6" },
  PENDING_REVIEW:        { label: "Pending Review",     bg: "bg-amber-100",   text: "text-amber-700",   dot: "#f59e0b" },
  PENDING_SIGNATURE:     { label: "Pending Signature",  bg: "bg-orange-100",  text: "text-orange-700",  dot: "#f97316" },
  SIGNED:                { label: "Signed",             bg: "bg-violet-100",  text: "text-violet-700",  dot: "#8b5cf6" },
  APPROVED:              { label: "Approved",           bg: "bg-green-100",   text: "text-green-700",   dot: "#22c55e" },
  REJECTED:              { label: "Rejected",           bg: "bg-red-100",     text: "text-red-700",     dot: "#ef4444" },
  RETURNED_FOR_REVISION: { label: "Returned",           bg: "bg-pink-100",    text: "text-pink-700",    dot: "#ec4899" },
  COMPLETED:             { label: "Completed",          bg: "bg-emerald-100", text: "text-emerald-700", dot: "#10b981" },
  ARCHIVED:              { label: "Archived",           bg: "bg-slate-100",   text: "text-slate-600",   dot: "#64748b" },
};

const FLOW_STATUSES = [
  "DRAFT", "SUBMITTED", "PENDING_REVIEW", "PENDING_SIGNATURE",
  "SIGNED", "APPROVED", "COMPLETED",
];

interface DocItem {
  id: string;
  title: string;
  purpose: string;
  senderName: string;
  department: string;
  status: string;
  priority: string;
  requiresESignature: boolean;
  createdAt: string;
  dueDate: string | null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function DocRow({ doc }: { doc: DocItem }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-muted/40 transition-colors border-b last:border-b-0 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate max-w-[260px]">{doc.title}</span>
          {doc.requiresESignature && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 shrink-0">
              <PenLine className="h-2.5 w-2.5" />E-SIG
            </span>
          )}
          {doc.priority === "URGENT" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 shrink-0">
              🔴 URGENT
            </span>
          )}
          {doc.priority === "IMPORTANT" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">
              🟠 IMPORTANT
            </span>
          )}
          {doc.priority === "IMPORTANT_NOT_URGENT" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 shrink-0">
              🟡 IMPORTANT, NOT URGENT
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {doc.purpose && <span className="truncate max-w-[180px]">{doc.purpose}</span>}
          {doc.senderName && (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{doc.senderName}</span>
            </>
          )}
          {doc.department && (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{doc.department}</span>
            </>
          )}
          <span>·</span>
          <span>
            {new Date(doc.createdAt).toLocaleDateString("en-PH", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </span>
          {doc.dueDate && (
            <>
              <span>·</span>
              <span className="text-red-600 font-medium">
                Due&nbsp;
                {new Date(doc.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge status={doc.status} />
        <Link href={`/documents/${doc.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // All docs for sidebar counts (fetched once, larger limit)
  const [allDocs, setAllDocs] = useState<DocItem[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  // Fetch filtered list
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (activeStatus !== "all") params.set("status", activeStatus);
    const res = await fetch(`/api/documents?${params}`);
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [debouncedSearch, activeStatus]);

  // Fetch all docs for status counts
  const fetchAllDocs = useCallback(async () => {
    const res = await fetch("/api/documents?limit=500");
    if (res.ok) {
      const data = await res.json();
      setAllDocs(data.documents ?? []);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => { fetchAllDocs(); }, [fetchAllDocs]);

  const countFor = (s: string) => allDocs.filter((d) => d.status === s).length;
  const pendingCount = allDocs.filter((d) =>
    ["SUBMITTED", "PENDING_REVIEW", "PENDING_SIGNATURE"].includes(d.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" style={{ color: "var(--navy)" }} />
            Document Approval Workflow
          </h1>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {pendingCount} document{pendingCount !== 1 ? "s" : ""} awaiting action
            </p>
          )}
        </div>
        <Link href="/documents/new">
          <Button style={{ backgroundColor: "var(--navy)", color: "white" }} className="gap-2">
            <Plus className="h-4 w-4" />
            Submit Document
          </Button>
        </Link>
      </div>

      {/* ── Status Flow Strip ── */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1 text-xs flex-wrap">
            <span className="text-muted-foreground font-medium mr-1 shrink-0">Flow:</span>
            {FLOW_STATUSES.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                <StatusBadge status={s} />
              </div>
            ))}
            <span className="text-muted-foreground ml-1">·</span>
            <StatusBadge status="REJECTED" />
            <StatusBadge status="RETURNED_FOR_REVISION" />
            <StatusBadge status="ARCHIVED" />
          </div>
        </CardContent>
      </Card>

      {/* ── Search ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents…"
          className="pl-9 pr-8"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {search && (
          <button
            onClick={() => { setSearch(""); setDebouncedSearch(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Status Filter Buttons ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveStatus("all")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
            activeStatus === "all"
              ? "border-transparent text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-400 bg-white"
          }`}
          style={activeStatus === "all" ? { backgroundColor: "var(--navy)" } : {}}
        >
          All ({allDocs.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = countFor(key);
          return (
            <button
              key={key}
              onClick={() => setActiveStatus(key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                activeStatus === key
                  ? `${cfg.bg} ${cfg.text} border-transparent`
                  : "border-gray-200 text-gray-600 hover:border-gray-400 bg-white"
              }`}
            >
              {cfg.label}
              {count > 0 && ` (${count})`}
            </button>
          );
        })}
      </div>

      {/* ── Documents List ── */}
      <Card>
        {loading ? (
          <CardContent className="py-14 text-center text-muted-foreground text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-3" />
            Loading documents…
          </CardContent>
        ) : docs.length === 0 ? (
          <CardContent className="py-14 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-25" />
            <p className="font-medium text-sm">No documents found</p>
            <p className="text-xs mt-1">
              {activeStatus !== "all" || debouncedSearch
                ? "Try adjusting your filters or search query"
                : "Submit your first document to get started"}
            </p>
            {activeStatus === "all" && !debouncedSearch && (
              <Link href="/documents/new">
                <Button
                  size="sm"
                  className="mt-4"
                  style={{ backgroundColor: "var(--navy)", color: "white" }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Submit Document
                </Button>
              </Link>
            )}
          </CardContent>
        ) : (
          <div>
            <div className="px-4 py-2.5 border-b text-xs text-muted-foreground font-medium bg-muted/30 rounded-t-lg">
              {total} document{total !== 1 ? "s" : ""}
              {activeStatus !== "all" && (
                <span className="ml-1 text-gray-500">
                  · filtered by {STATUS_CONFIG[activeStatus]?.label}
                </span>
              )}
              {debouncedSearch && (
                <span className="ml-1 text-gray-500">
                  · matching &ldquo;{debouncedSearch}&rdquo;
                </span>
              )}
            </div>
            {docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
