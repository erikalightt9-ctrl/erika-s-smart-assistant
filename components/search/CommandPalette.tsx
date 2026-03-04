"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  FileText,
  CreditCard,
  Users,
  BookOpen,
  X,
  Loader2,
  LayoutDashboard,
  Clock,
  BadgeDollarSign,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "document" | "billing" | "user" | "knowledge";
  title: string;
  subtitle: string;
  href: string;
}

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Timekeeping", href: "/timekeeping", icon: Clock },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Mandatories", href: "/contributions", icon: BadgeDollarSign },
];

const TYPE_CONFIG = {
  document:  { icon: FileText,  color: "#dc2626", bg: "#fef2f2", label: "Document" },
  billing:   { icon: CreditCard, color: "#7c3aed", bg: "#f5f3ff", label: "Billing" },
  user:      { icon: Users,     color: "#2563eb", bg: "#eff6ff", label: "User" },
  knowledge: { icon: BookOpen,  color: "#059669", bg: "#ecfdf5", label: "Knowledge" },
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened, reset when closed
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) setResults(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
  }, [query, doSearch]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border bg-background hover:bg-muted transition-all text-muted-foreground"
        style={{ borderColor: "#e2e8f0" }}
        aria-label="Open search"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:block text-xs">Search…</span>
        <kbd
          className="hidden sm:flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border bg-muted font-mono shrink-0"
          style={{ borderColor: "#d1d5db" }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div
            className="fixed z-50 top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: "#ffffff" }}
          >
            {/* Search input row */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 border-b"
              style={{ borderColor: "#e2e8f0" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
              ) : (
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents, billing, users…"
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
              />
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results area */}
            <div className="max-h-80 overflow-y-auto">
              {/* Empty state — show quick links */}
              {!query.trim() && (
                <div className="py-3 px-2">
                  <p className="text-xs font-semibold text-muted-foreground px-3 pb-2">
                    Quick links
                  </p>
                  {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                    <a
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
                      style={{ color: "#0f172a" }}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </a>
                  ))}
                </div>
              )}

              {/* No results */}
              {query.trim() && !loading && results.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}

              {/* Search results */}
              {results.map((r) => {
                const cfg = TYPE_CONFIG[r.type];
                const Icon = cfg.icon;
                return (
                  <a
                    key={r.id}
                    href={r.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors border-b last:border-0"
                    style={{ borderColor: "#f1f5f9" }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "#0f172a" }}
                      >
                        {r.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.subtitle}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </a>
                );
              })}
            </div>

            {/* Footer hint */}
            <div
              className="px-4 py-2 border-t text-[10px] text-muted-foreground flex gap-4"
              style={{ borderColor: "#f1f5f9" }}
            >
              <span>↵ to open</span>
              <span>Esc to close</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
