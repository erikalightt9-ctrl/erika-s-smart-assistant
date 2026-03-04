"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  UserPlus, Search, RefreshCw, Building2, Upload,
  CheckCircle2, XCircle, Shield, ShieldCheck, User, Briefcase,
  ToggleLeft, ToggleRight, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ERIKA: { label: "Super Admin", color: "#c9a227", bg: "#0a1628",  icon: ShieldCheck },
  ADMIN: { label: "Admin",       color: "#2563eb", bg: "#eff6ff",  icon: Shield       },
  EXEC:  { label: "Executive",   color: "#7c3aed", bg: "#f5f3ff",  icon: Briefcase    },
  STAFF: { label: "Staff",       color: "#16a34a", bg: "#f0fdf4",  icon: User         },
};

const SUBSIDIARY_LABEL: Record<string, { name: string; short: string; color: string; bg: string }> = {
  HOLDING_GDS_CAPITAL:       { name: "GDS Capital Inc.",                           short: "GDS Capital",  color: "#0a1628", bg: "#f1f5f9" },
  MEDIA_ADVERTISING:         { name: "Philippine Dragon Media Network Corp",        short: "PDMN Corp",    color: "#dc2626", bg: "#fef2f2" },
  VIRTUAL_PHYSICAL_OFFICE:   { name: "GDS Payment Solutions Inc.",                  short: "GPS Inc.",     color: "#2563eb", bg: "#eff6ff" },
  TRAVEL_AGENCY:             { name: "GDS International Travel Agency Inc.",        short: "GITA Inc.",    color: "#16a34a", bg: "#f0fdf4" },
  BUSINESS_MGMT_CONSULTANCY: { name: "Starlight Business Consulting Services Inc.", short: "Starlight",    color: "#d97706", bg: "#fffbeb" },
  EVENTS_IT:                 { name: "Supernova Innovation Inc.",                   short: "Supernova",    color: "#7c3aed", bg: "#f5f3ff" },
  EV_CHARGERS:               { name: "DragonAI Media Inc.",                         short: "DragonAI",     color: "#0891b2", bg: "#ecfeff" },
};

const ROLES    = ["ERIKA", "ADMIN", "EXEC", "STAFF"];
const STATUSES = [
  { value: "",         label: "All Users"  },
  { value: "active",   label: "Active"     },
  { value: "inactive", label: "Inactive"   },
];

interface UserRow {
  id:         string;
  name:       string;
  email:      string;
  role:       string;
  subsidiary: string | null;
  department: string | null;
  position:   string | null;
  isActive:   boolean;
  createdAt:  string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toggling, setToggling]     = useState<string | null>(null); // id being toggled
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (q: string, role: string, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q)      params.set("search",     q);
      if (role)   params.set("role",       role);
      if (status) params.set("status",     status);

      const res  = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {
      // silent — keep stale list
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchUsers("", "", ""); }, [fetchUsers]);

  // Search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(search, roleFilter, statusFilter);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, roleFilter, statusFilter, fetchUsers]);

  // ── Toggle active/inactive ───────────────────────────────────────────────
  const toggleActive = async (user: UserRow) => {
    if (user.role === "ERIKA") return; // cannot deactivate Super Admin
    setToggling(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u)
        );
      }
    } finally {
      setToggling(null);
    }
  };

  // ── Derived counts ───────────────────────────────────────────────────────
  const activeCount   = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage accounts, roles, and subsidiary assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/users/bulk">
            <Button
              variant="outline"
              className="gap-2 font-semibold"
              style={{ borderColor: "#0a1628", color: "#0a1628" }}
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </Link>
          <Link href="/users/new">
            <Button
              className="gap-2 font-semibold"
              style={{ backgroundColor: "#0a1628", color: "white" }}
            >
              <UserPlus className="h-4 w-4" />
              Register User
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Users",    value: users.length,  color: "#0a1628", bg: "#f1f5f9" },
          { label: "Active",         value: activeCount,   color: "#16a34a", bg: "#f0fdf4" },
          { label: "Inactive",       value: inactiveCount, color: "#dc2626", bg: "#fef2f2" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border px-4 py-3 text-center"
            style={{ borderColor: "#e8edf3" }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: "#e8edf3" }}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRoleFilter("")}
            className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all border"
            style={
              roleFilter === ""
                ? { backgroundColor: "#0a1628", color: "white", borderColor: "#0a1628" }
                : { backgroundColor: "white",   color: "#64748b", borderColor: "#e2e8f0" }
            }
          >
            All Roles
          </button>
          {ROLES.map((r) => {
            const cfg = ROLE_CONFIG[r];
            const active = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(active ? "" : r)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all border"
                style={
                  active
                    ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.bg }
                    : { backgroundColor: "white", color: "#64748b", borderColor: "#e2e8f0" }
                }
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all border"
              style={
                statusFilter === s.value
                  ? { backgroundColor: "#0a1628", color: "white", borderColor: "#0a1628" }
                  : { backgroundColor: "white",   color: "#64748b", borderColor: "#e2e8f0" }
              }
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => fetchUsers(search, roleFilter, statusFilter)}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border text-muted-foreground hover:bg-gray-50 transition-all"
            style={{ borderColor: "#e2e8f0" }}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── User Table ── */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e8edf3" }}>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No users found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "#f1f5f9", backgroundColor: "#f8fafc" }}>
                  <th className="px-5 py-3 font-semibold text-xs text-muted-foreground">User</th>
                  <th className="px-4 py-3 font-semibold text-xs text-muted-foreground">Role</th>
                  <th className="px-4 py-3 font-semibold text-xs text-muted-foreground hidden md:table-cell">Company</th>
                  <th className="px-4 py-3 font-semibold text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-semibold text-xs text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                {users.map((user) => {
                  const roleCfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.STAFF;
                  const RoleIcon = roleCfg.icon;
                  const subInfo  = user.subsidiary ? SUBSIDIARY_LABEL[user.subsidiary] ?? null : null;
                  const isSuper  = user.role === "ERIKA";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 transition-colors"
                      style={{ opacity: user.isActive ? 1 : 0.55 }}
                    >
                      {/* User cell */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs select-none"
                            style={{ backgroundColor: isSuper ? "#0a1628" : roleCfg.bg === "#f1f5f9" ? "#94a3b8" : roleCfg.color + "22" }}
                          >
                            <span style={{ color: isSuper ? "#c9a227" : roleCfg.color }}>
                              {initials(user.name)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: "#0f172a" }}>{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            {(user.position || user.department) && (
                              <p className="text-xs truncate mt-0.5" style={{ color: "#64748b" }}>
                                {[user.position, user.department].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role cell */}
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{
                            backgroundColor: isSuper ? "#0a1628" : roleCfg.bg,
                            color: isSuper ? "#c9a227" : roleCfg.color,
                          }}
                        >
                          <RoleIcon className="h-3 w-3 shrink-0" />
                          {roleCfg.label}
                        </span>
                      </td>

                      {/* Company cell */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {subInfo ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: subInfo.bg, color: subInfo.color }}
                          >
                            <Building2 className="h-3 w-3 shrink-0" />
                            {subInfo.short}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {isSuper ? "All Subsidiaries" : "—"}
                          </span>
                        )}
                      </td>

                      {/* Status cell */}
                      <td className="px-4 py-3.5">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                            <XCircle className="h-3.5 w-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions cell */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <Link
                            href={`/users/${user.id}/edit`}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium hover:bg-gray-50 transition-colors"
                            style={{ borderColor: "#e2e8f0", color: "#475569" }}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Link>

                          {/* Toggle active — not allowed for Super Admin */}
                          {!isSuper && (
                            <button
                              onClick={() => toggleActive(user)}
                              disabled={toggling === user.id}
                              title={user.isActive ? "Deactivate" : "Activate"}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors"
                              style={{
                                borderColor: user.isActive ? "#fca5a5" : "#86efac",
                                color:       user.isActive ? "#dc2626"  : "#16a34a",
                                backgroundColor: user.isActive ? "#fef2f2" : "#f0fdf4",
                              }}
                            >
                              {user.isActive
                                ? <ToggleRight className="h-3.5 w-3.5" />
                                : <ToggleLeft  className="h-3.5 w-3.5" />}
                              {toggling === user.id ? "…" : user.isActive ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && users.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
