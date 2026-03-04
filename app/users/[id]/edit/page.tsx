"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Eye, EyeOff, Loader2 } from "lucide-react";
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
  { value: "",                          label: "— No specific subsidiary —"                  },
  { value: "HOLDING_GDS_CAPITAL",       label: "GDS Capital Inc. (Holding)"                  },
  { value: "MEDIA_ADVERTISING",         label: "Philippine Dragon Media Network Corp"         },
  { value: "VIRTUAL_PHYSICAL_OFFICE",   label: "GDS Payment Solutions Inc."                  },
  { value: "TRAVEL_AGENCY",             label: "GDS International Travel Agency Inc."        },
  { value: "BUSINESS_MGMT_CONSULTANCY", label: "Starlight Business Consulting Services Inc." },
  { value: "EVENTS_IT",                 label: "Supernova Innovation Inc."                   },
  { value: "EV_CHARGERS",               label: "DragonAI Media Inc."                         },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [showPw,     setShowPw]     = useState(false);

  const [form, setForm] = useState({
    name:       "",
    role:       "STAFF",
    subsidiary: "",
    department: "",
    position:   "",
    isActive:   true,
    password:   "", // optional reset
  });

  const [originalRole, setOriginalRole] = useState("");

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const u = data.data;
          setForm({
            name:       u.name,
            role:       u.role,
            subsidiary: u.subsidiary  ?? "",
            department: u.department  ?? "",
            position:   u.position    ?? "",
            isActive:   u.isActive,
            password:   "",
          });
          setOriginalRole(u.role);
        } else {
          setLoadError(data.error ?? "User not found.");
        }
      })
      .catch(() => setLoadError("Failed to load user."))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!form.name.trim()) { setError("Full name is required."); return; }
    if (form.password && form.password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name:       form.name.trim(),
        subsidiary: form.subsidiary || null,
        department: form.department.trim() || null,
        position:   form.position.trim()   || null,
        isActive:   form.isActive,
      };
      // Only allow role change if not modifying a Super Admin
      if (originalRole !== "ERIKA") body.role = form.role;
      if (form.password.trim()) body.password = form.password;

      const res = await fetch(`/api/users/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/users"), 1200);
      } else {
        setError(data.error ?? "Failed to update user.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading user…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <p className="text-red-600 font-medium">{loadError}</p>
        <Link href="/users" className="text-sm text-muted-foreground underline mt-2 inline-block">
          Back to Users
        </Link>
      </div>
    );
  }

  const isSuper = originalRole === "ERIKA";

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* ── Back nav ── */}
      <div>
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
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Edit User</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Update this user&apos;s name, role, company assignment, or status.
        </p>
      </div>

      {/* ── Super Admin notice ── */}
      {isSuper && (
        <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800">
          ⚠ This is the <strong>Super Admin</strong> account. Role cannot be changed.
          You may update the name or reset the password only.
        </div>
      )}

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
            placeholder="Full name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>

        {/* Role — locked for Super Admin */}
        {!isSuper && (
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
        )}

        {/* Subsidiary */}
        {!isSuper && (
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
          </div>
        )}

        {/* Department + Position */}
        {!isSuper && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="e.g. Finance, HR, IT"
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                placeholder="e.g. Accountant, Manager"
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Status toggle */}
        {!isSuper && (
          <div className="space-y-1.5">
            <Label>Account Status</Label>
            <div className="flex gap-2">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => set("isActive", val)}
                  className="flex-1 py-2 rounded-lg border text-sm font-semibold transition-all"
                  style={
                    form.isActive === val
                      ? {
                          backgroundColor: val ? "#f0fdf4" : "#fef2f2",
                          borderColor:     val ? "#16a34a" : "#dc2626",
                          color:           val ? "#16a34a" : "#dc2626",
                        }
                      : { backgroundColor: "white", borderColor: "#e2e8f0", color: "#94a3b8" }
                  }
                >
                  {val ? "✓ Active" : "✕ Inactive"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Password reset (optional) */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Reset Password <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              placeholder="Leave blank to keep current password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Min. 8 characters if changing.</p>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
            ✓ User updated successfully. Redirecting…
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
            <Save className="h-4 w-4" />
            {submitting ? "Saving changes…" : "Save Changes"}
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
