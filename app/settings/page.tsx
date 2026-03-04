"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings2, CalendarClock, ScrollText,
  Save, RefreshCw, CheckCircle2, Building2,
  Users, FileText, Clock, BadgeDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Config {
  "deadline.sss":        string;
  "deadline.philhealth": string;
  "deadline.pagibig":    string;
  "system.name":         string;
  "system.org":          string;
  "system.email":        string;
  [key: string]: string;
}

interface AuditEntry {
  id:         string;
  action:     string;
  status:     string;
  notes:      string | null;
  createdAt:  string;
  actorName:  string | null;
  document:   { id: string; title: string } | null;
  user:       { name: string; email: string } | null;
}

type Tab = "overview" | "deadlines" | "activity";

// ── Status color map ──────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  DRAFT:                  { color: "#64748b", bg: "#f8fafc" },
  SUBMITTED:              { color: "#2563eb", bg: "#eff6ff" },
  PENDING_REVIEW:         { color: "#d97706", bg: "#fffbeb" },
  PENDING_SIGNATURE:      { color: "#7c3aed", bg: "#f5f3ff" },
  SIGNED:                 { color: "#059669", bg: "#ecfdf5" },
  APPROVED:               { color: "#16a34a", bg: "#f0fdf4" },
  REJECTED:               { color: "#dc2626", bg: "#fef2f2" },
  RETURNED_FOR_REVISION:  { color: "#ea580c", bg: "#fff7ed" },
  COMPLETED:              { color: "#0891b2", bg: "#ecfeff" },
  ARCHIVED:               { color: "#94a3b8", bg: "#f1f5f9" },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("overview");

  // ── Config state ───────────────────────────────────────────────────────────
  const [config, setConfig]         = useState<Config | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saveOk, setSaveOk]         = useState(false);
  const [deadlines, setDeadlines]   = useState({ sss: "10", philhealth: "10", pagibig: "10" });

  // ── Audit log state ────────────────────────────────────────────────────────
  const [logs, setLogs]             = useState<AuditEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);

  // ── Stats state ────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ users: 0, documents: 0 });

  // ── Load config ────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res  = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        const cfg: Config = data.data;
        setConfig(cfg);
        setDeadlines({
          sss:        cfg["deadline.sss"]        ?? "10",
          philhealth: cfg["deadline.philhealth"]  ?? "10",
          pagibig:    cfg["deadline.pagibig"]     ?? "10",
        });
      }
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // ── Load stats ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const [usersRes, docsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/documents?limit=1"),
      ]);
      const [usersData, docsData] = await Promise.all([usersRes.json(), docsRes.json()]);
      setStats({
        users:     usersData.success ? usersData.data.length : 0,
        documents: docsData.success  ? (docsData.total ?? 0)  : 0,
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadConfig();
    loadStats();
  }, [loadConfig, loadStats]);

  // ── Load audit log on tab switch ───────────────────────────────────────────
  useEffect(() => {
    if (tab !== "activity" || logsLoaded) return;
    setLogsLoading(true);
    fetch("/api/settings/audit?limit=50")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLogs(data.data);
        setLogsLoaded(true);
      })
      .finally(() => setLogsLoading(false));
  }, [tab, logsLoaded]);

  // ── Save deadlines ─────────────────────────────────────────────────────────
  const saveDeadlines = async () => {
    const day = (v: string) => {
      const n = parseInt(v);
      return isNaN(n) || n < 1 || n > 31 ? null : String(n);
    };
    const sss        = day(deadlines.sss);
    const philhealth = day(deadlines.philhealth);
    const pagibig    = day(deadlines.pagibig);
    if (!sss || !philhealth || !pagibig) return;

    setSaving(true);
    setSaveOk(false);
    try {
      const res = await fetch("/api/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "deadline.sss":        sss,
          "deadline.philhealth": philhealth,
          "deadline.pagibig":    pagibig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Tab definitions ────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",  label: "Overview",       icon: Settings2    },
    { id: "deadlines", label: "Deadlines",       icon: CalendarClock },
    { id: "activity",  label: "Activity Log",    icon: ScrollText   },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          System configuration, deadlines, and activity log
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              tab === id
                ? { backgroundColor: "#0a1628", color: "white" }
                : { backgroundColor: "transparent", color: "#64748b" }
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-5">

          {/* System info card */}
          <div
            className="bg-white rounded-xl border p-6 space-y-5"
            style={{ borderColor: "#e8edf3" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>System Information</h2>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {configLoading ? (
                <p className="text-muted-foreground col-span-2">Loading…</p>
              ) : (
                <>
                  {[
                    { label: "System Name",  value: config?.["system.name"]  ?? "—" },
                    { label: "Organization", value: config?.["system.org"]   ?? "—" },
                    { label: "Contact Email",value: config?.["system.email"] ?? "—" },
                    { label: "Version",      value: "1.0.0 MVP"               },
                    { label: "Framework",    value: "Next.js 15 · TypeScript" },
                    { label: "Database",     value: "PostgreSQL 17 · Prisma 7" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="font-semibold" style={{ color: "#0f172a" }}>{value}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Total Users",     value: stats.users,     icon: Users,          color: "#0a1628", bg: "#f1f5f9" },
              { label: "Documents",       value: stats.documents,  icon: FileText,       color: "#dc2626", bg: "#fef2f2" },
              { label: "Active Modules",  value: 4,               icon: Settings2,      color: "#7c3aed", bg: "#f5f3ff" },
              { label: "Coming Soon",     value: 3,               icon: Clock,          color: "#d97706", bg: "#fffbeb" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="bg-white rounded-xl border p-4 flex items-center gap-4"
                style={{ borderColor: "#e8edf3" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                  <div className="text-xl font-bold" style={{ color }}>{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Modules status */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e8edf3" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#0f172a" }}>Module Status</h2>
            <div className="space-y-2">
              {[
                { name: "AI Billing Generator",          status: "live",   color: "#7c3aed"  },
                { name: "Regulatory Compliance Management", status: "live",   color: "#16a34a"  },
                { name: "Timekeeping / Attendance",      status: "live",   color: "#2563eb"  },
                { name: "Document Signature Routing",    status: "live",   color: "#dc2626"  },
                { name: "Asset Tracker",                 status: "soon",   color: "#0891b2"  },
                { name: "Purchase & Maintenance Tracker",status: "soon",   color: "#d97706"  },
                { name: "Billing Reminders & Payables",  status: "soon",   color: "#059669"  },
              ].map(({ name, status, color }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#f1f5f9" }}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status === "live" ? "#16a34a" : "#d1d5db" }} />
                    <span className="text-sm font-medium" style={{ color: "#0f172a" }}>{name}</span>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={
                      status === "live"
                        ? { backgroundColor: "#f0fdf4", color: "#16a34a" }
                        : { backgroundColor: "#f1f5f9", color: "#94a3b8" }
                    }
                  >
                    {status === "live" ? "● Live" : "Coming Soon"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: DEADLINES
      ══════════════════════════════════════════════════ */}
      {tab === "deadlines" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border p-6 space-y-6" style={{ borderColor: "#e8edf3" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Remittance Deadlines</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set the day of the month when each government contribution is due. This affects the alerts shown on the dashboard.
              </p>
            </div>

            {configLoading ? (
              <p className="text-sm text-muted-foreground">Loading configuration…</p>
            ) : (
              <div className="space-y-4">
                {[
                  { key: "sss",        label: "SSS Monthly Contribution",  icon: BadgeDollarSign, color: "#2563eb", bg: "#eff6ff" },
                  { key: "philhealth", label: "PhilHealth Premium",         icon: BadgeDollarSign, color: "#16a34a", bg: "#f0fdf4" },
                  { key: "pagibig",    label: "Pag-IBIG Contribution",      icon: BadgeDollarSign, color: "#d97706", bg: "#fffbeb" },
                ].map(({ key, label, icon: Icon, color, bg }) => (
                  <div
                    key={key}
                    className="flex items-center gap-4 p-4 rounded-xl border"
                    style={{ borderColor: "#e8edf3" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={key} className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Due on the __ th of the following month</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        id={key}
                        type="number"
                        min={1}
                        max={31}
                        value={deadlines[key as keyof typeof deadlines]}
                        onChange={(e) => setDeadlines((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-20 text-center font-bold text-base"
                        style={{ borderColor: color }}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">of next month</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={saveDeadlines}
                disabled={saving || configLoading}
                className="gap-2 font-semibold"
                style={{ backgroundColor: "#0a1628", color: "white" }}
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save Deadlines"}
              </Button>
              {saveOk && (
                <span className="flex items-center gap-1.5 text-sm text-green-700 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved successfully
                </span>
              )}
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">📋 Philippine Government Remittance Schedule</p>
            <p>SSS, PhilHealth, and Pag-IBIG contributions are typically due on the <strong>10th day of the following month</strong> for the previous month&apos;s payroll.</p>
            <p className="text-xs text-blue-600 mt-1">Adjust if your company has a different arrangement with the agencies.</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: ACTIVITY LOG
      ══════════════════════════════════════════════════ */}
      {tab === "activity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Last 50 system events — document status changes and actions</p>
            <button
              onClick={() => { setLogsLoaded(false); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border text-muted-foreground hover:bg-gray-50 transition-all"
              style={{ borderColor: "#e2e8f0" }}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e8edf3" }}>
            {logsLoading ? (
              <div className="p-12 text-center text-muted-foreground text-sm">Loading activity log…</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center">
                <ScrollText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">Document actions will appear here</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                {logs.map((log) => {
                  const statusCfg = STATUS_COLOR[log.status] ?? { color: "#64748b", bg: "#f8fafc" };
                  const when = new Date(log.createdAt).toLocaleString("en-PH", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  });
                  return (
                    <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                      {/* Status dot */}
                      <span
                        className="mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                      >
                        {log.status.replace(/_/g, " ")}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#0f172a" }}>
                          {log.document?.title ?? "Unknown Document"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.action}
                          {log.user && (
                            <span className="ml-1">· <span className="font-medium">{log.user.name}</span></span>
                          )}
                          {log.actorName && !log.user && (
                            <span className="ml-1">· <span className="font-medium">{log.actorName}</span></span>
                          )}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 italic truncate">{log.notes}</p>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{when}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
