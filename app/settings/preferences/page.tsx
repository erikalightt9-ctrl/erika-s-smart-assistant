"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  FileText,
  Clock,
  CalendarDays,
  Save,
  RefreshCw,
  CheckCircle2,
  Palette,
  Zap,
  CreditCard,
  BadgeDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

interface Preferences {
  emailNotifications: boolean;
  notifyDocStatus: boolean;
  notifyLeaveStatus: boolean;
  notifyDeadlines: boolean;
  pinnedModules: string[];
}

const PINNABLE_MODULES = [
  {
    id: "billing",
    label: "AI Billing Generator",
    icon: CreditCard,
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    id: "contributions",
    label: "Regulatory Compliance Management",
    icon: BadgeDollarSign,
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    id: "timekeeping",
    label: "Timekeeping",
    icon: Clock,
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    color: "#dc2626",
    bg: "#fef2f2",
  },
  {
    id: "assistant",
    label: "AI Assistant",
    icon: Zap,
    color: "#d97706",
    bg: "#fffbeb",
  },
];

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<Preferences>({
    emailNotifications: true,
    notifyDocStatus: true,
    notifyLeaveStatus: true,
    notifyDeadlines: true,
    pinnedModules: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/preferences");
      const data = await res.json();
      if (data.success) setPrefs(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePin = (id: string) => {
    setPrefs((prev) => ({
      ...prev,
      pinnedModules: prev.pinnedModules.includes(id)
        ? prev.pinnedModules.filter((m) => m !== id)
        : [...prev.pinnedModules, id],
    }));
  };

  const toggle = (field: keyof Preferences) => {
    setPrefs((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground text-sm">
        Loading preferences…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
          My Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize your AILE experience
        </p>
      </div>

      {/* ── Appearance ── */}
      <section
        className="bg-white rounded-xl border p-6 space-y-4"
        style={{ borderColor: "#e8edf3" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm" style={{ color: "#0f172a" }}>
            Appearance
          </h2>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3">
            THEME
          </p>
          <div className="flex gap-3">
            {[
              { id: "light", label: "Light", desc: "Clean & bright" },
              { id: "dark", label: "Dark", desc: "Easy on the eyes" },
              { id: "system", label: "System", desc: "Follows your OS" },
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`flex-1 flex flex-col items-center py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all`}
                style={
                  theme === id
                    ? { borderColor: "#0a1628", color: "#0a1628", backgroundColor: "#f1f5f9" }
                    : { borderColor: "#e2e8f0", color: "#64748b" }
                }
              >
                <span>{label}</span>
                <span className="text-[10px] font-normal mt-0.5">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section
        className="bg-white rounded-xl border p-6 space-y-4"
        style={{ borderColor: "#e8edf3" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm" style={{ color: "#0f172a" }}>
            Notifications
          </h2>
        </div>

        {[
          {
            field: "emailNotifications" as keyof Preferences,
            icon: Bell,
            label: "Email Notifications",
            desc: "Receive notifications via email",
            color: "#0a1628",
            bg: "#f1f5f9",
          },
          {
            field: "notifyDocStatus" as keyof Preferences,
            icon: FileText,
            label: "Document Status Updates",
            desc: "Notify when a document's status changes",
            color: "#dc2626",
            bg: "#fef2f2",
          },
          {
            field: "notifyLeaveStatus" as keyof Preferences,
            icon: CalendarDays,
            label: "Leave Request Updates",
            desc: "Notify when leave is approved or rejected",
            color: "#2563eb",
            bg: "#eff6ff",
          },
          {
            field: "notifyDeadlines" as keyof Preferences,
            icon: Clock,
            label: "Remittance Deadline Alerts",
            desc: "Alert before SSS, PhilHealth, Pag-IBIG deadlines",
            color: "#d97706",
            bg: "#fffbeb",
          },
        ].map(({ field, icon: Icon, label, desc, color, bg }) => (
          <div
            key={field}
            className="flex items-center justify-between py-3 border-b last:border-0"
            style={{ borderColor: "#f1f5f9" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: bg }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              onClick={() => toggle(field)}
              className="relative w-11 h-6 rounded-full transition-all shrink-0"
              style={{
                backgroundColor: prefs[field] ? "#0a1628" : "#d1d5db",
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                style={{
                  left: prefs[field] ? "calc(100% - 20px - 2px)" : "2px",
                }}
              />
            </button>
          </div>
        ))}
      </section>

      {/* ── Pinned Quick Actions ── */}
      <section
        className="bg-white rounded-xl border p-6"
        style={{ borderColor: "#e8edf3" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm" style={{ color: "#0f172a" }}>
            Pinned Quick Actions
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select modules to pin as quick access buttons in the sidebar
        </p>

        <div className="space-y-2">
          {PINNABLE_MODULES.map(({ id, label, icon: Icon, color, bg }) => {
            const isPinned = prefs.pinnedModules.includes(id);
            return (
              <button
                key={id}
                onClick={() => togglePin(id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                style={{
                  borderColor: isPinned ? color : "#e8edf3",
                  backgroundColor: isPinned ? bg : "transparent",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: isPinned ? "#ffffff" : bg }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span
                  className="flex-1 text-sm font-medium"
                  style={{ color: isPinned ? color : "#64748b" }}
                >
                  {label}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={
                    isPinned
                      ? { backgroundColor: color, color: "white" }
                      : { backgroundColor: "#f1f5f9", color: "#94a3b8" }
                  }
                >
                  {isPinned ? "Pinned" : "Pin"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3 pb-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
          style={{ backgroundColor: "#0a1628", color: "white" }}
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save Preferences"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-700 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
