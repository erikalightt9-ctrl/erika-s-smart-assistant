"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "ADMIN", label: "Admin",     desc: "Manage users, view all modules" },
  { value: "EXEC",  label: "Executive", desc: "Document signing queue, financial overview" },
  { value: "STAFF", label: "Staff",     desc: "Submit docs, log time, view own data" },
];

const SUBSIDIARIES = [
  { value: "",                          label: "— No specific subsidiary —"               },
  { value: "HOLDING_GDS_CAPITAL",       label: "GDS Capital Inc. (Holding)"               },
  { value: "MEDIA_ADVERTISING",         label: "Philippine Dragon Media Network Corp"      },
  { value: "VIRTUAL_PHYSICAL_OFFICE",   label: "GDS Payment Solutions Inc."               },
  { value: "TRAVEL_AGENCY",             label: "GDS International Travel Agency Inc."     },
  { value: "BUSINESS_MGMT_CONSULTANCY", label: "Starlight Business Consulting Services Inc." },
  { value: "EVENTS_IT",                 label: "Supernova Innovation Inc."                },
  { value: "EV_CHARGERS",               label: "DragonAI Media Inc."                      },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewUserPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name:       "",
    email:      "",
    password:   "",
    role:       "STAFF",
    subsidiary: "",
  });
  const [showPw,    setShowPw]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState("");

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim())     { setError("Full name is required.");     return; }
    if (!form.email.trim())    { setError("Email address is required."); return; }
    if (!form.password.trim()) { setError("Password is required.");      return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:       form.name.trim(),
          email:      form.email.trim().toLowerCase(),
          password:   form.password,
          role:       form.role,
          subsidiary: form.subsidiary || null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/users");
      } else {
        setError(data.error ?? "Failed to create user.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* ── Back nav ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/users"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </div>

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Add New User</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create an account and assign the user to a role and company.
        </p>
      </div>

      {/* ── Form card ── */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border p-6 space-y-5"
        style={{ borderColor: "#e8edf3" }}
      >
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            placeholder="e.g. Maria Santos"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
          <Input
            id="email"
            type="email"
            placeholder="e.g. maria@gdscapital.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">The user can change this password after logging in.</p>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label>Role <span className="text-red-500">*</span></Label>
          <div className="grid gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                style={{
                  borderColor:     form.role === r.value ? "#0a1628" : "#e2e8f0",
                  backgroundColor: form.role === r.value ? "#f8fafc"  : "white",
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={form.role === r.value}
                  onChange={() => set("role", r.value)}
                  className="accent-[#0a1628]"
                />
                <div>
                  <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>{r.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Subsidiary */}
        <div className="space-y-1.5">
          <Label htmlFor="subsidiary">Assigned Company</Label>
          <select
            id="subsidiary"
            value={form.subsidiary}
            onChange={(e) => set("subsidiary", e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0a1628]/20"
            style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
          >
            {SUBSIDIARIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            This determines which company is shown on the user&apos;s dashboard.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-1">
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 gap-2 h-11 font-semibold"
            style={{ backgroundColor: "#0a1628", color: "white" }}
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? "Creating account…" : "Create User Account"}
          </Button>
          <Link href="/users">
            <Button type="button" variant="outline" className="h-11 px-5">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
