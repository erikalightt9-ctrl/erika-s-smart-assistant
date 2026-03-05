"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Wrench, Loader2, ChevronDown,
  AlertCircle, CheckCircle, Search,
} from "lucide-react";
import { formatShortDate } from "@/lib/utils";

interface MaintenanceRecord {
  id: string;
  assetName: string;
  assetType: string;
  description: string | null;
  scheduledDate: string;
  completedAt: string | null;
  status: string;
  performedBy: string | null;
  cost: number | null;
  subsidiary: string;
  createdBy: { name: string };
  createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  SCHEDULED:   { label: "Scheduled",   bg: "#dbeafe", text: "#2563eb" },
  IN_PROGRESS: { label: "In Progress", bg: "#fef3c7", text: "#d97706" },
  COMPLETED:   { label: "Completed",   bg: "#d1fae5", text: "#16a34a" },
  OVERDUE:     { label: "Overdue",     bg: "#fee2e2", text: "#dc2626" },
  CANCELLED:   { label: "Cancelled",   bg: "#f3f4f6", text: "#6b7280" },
};

const ASSET_TYPES = [
  "EQUIPMENT", "FURNITURE", "IT_HARDWARE", "VEHICLE", "FACILITY", "OTHER",
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  EQUIPMENT: "Equipment",
  FURNITURE: "Furniture",
  IT_HARDWARE: "IT Hardware",
  VEHICLE: "Vehicle",
  FACILITY: "Facility",
  OTHER: "Other",
};

const SUB_LABELS: Record<string, string> = {
  HOLDING_GDS_CAPITAL: "GDS Capital (Holding)",
  BUSINESS_MGMT_CONSULTANCY: "Business Mgmt. Consultancy",
  MEDIA_ADVERTISING: "Media & Advertising",
  EVENTS_IT: "Events & IT",
  TRAVEL_AGENCY: "Travel Agency",
  VIRTUAL_PHYSICAL_OFFICE: "Virtual/Physical Office",
  EV_CHARGERS: "EV Chargers",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

const fmt = (n: number) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MaintenancePage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [completing, setCompleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = ["ERIKA", "ADMIN", "EXEC"].includes(session?.user?.role ?? "");
  const canAdd = ["ERIKA", "ADMIN", "EXEC"].includes(session?.user?.role ?? "");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (assetTypeFilter) params.set("assetType", assetTypeFilter);
    const url = `/api/admin/maintenance${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.data ?? []);
    }
    setLoading(false);
  }, [statusFilter, assetTypeFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = records.filter((r) =>
    !search ||
    r.assetName.toLowerCase().includes(search.toLowerCase()) ||
    (r.performedBy ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const hasOverdue = records.some((r) => r.status === "OVERDUE");

  async function handleMarkComplete(id: string) {
    setCompleting(id);
    setError(null);
    const res = await fetch(`/api/admin/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    setCompleting(null);
    if (!res.ok) {
      setError(data.error ?? "Failed to mark as complete.");
      return;
    }
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "COMPLETED", completedAt: new Date().toISOString() }
          : r
      )
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/departments/admin"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin Panel
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#ede9fe" }}>
              <Wrench className="h-5 w-5" style={{ color: "#7c3aed" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Maintenance Monitoring</h1>
              <p className="text-sm text-slate-400">Asset &amp; facility maintenance records</p>
            </div>
          </div>
          {canAdd && (
            <Link
              href="/departments/admin/maintenance/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#0a1628" }}
            >
              <Plus className="h-4 w-4" /> Add Record
            </Link>
          )}
        </div>
      </div>

      {/* Overdue Alert */}
      {hasOverdue && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
          <p>
            <span className="font-semibold">Overdue maintenance items detected.</span> Please review and schedule completion as soon as possible.
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search asset or technician…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white"
          >
            <option value="">All Asset Types</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No maintenance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Asset Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Scheduled Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Performed By</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Subsidiary</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.assetName}
                      {r.description && (
                        <p className="text-xs text-slate-400 font-normal truncate max-w-48">{r.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {ASSET_TYPE_LABELS[r.assetType] ?? r.assetType}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatShortDate(r.scheduledDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {r.performedBy ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.cost != null ? fmt(r.cost) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {SUB_LABELS[r.subsidiary] ?? r.subsidiary.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && ["SCHEDULED", "IN_PROGRESS"].includes(r.status) && (
                        <button
                          onClick={() => handleMarkComplete(r.id)}
                          disabled={completing === r.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-semibold hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          {completing === r.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          Mark Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
