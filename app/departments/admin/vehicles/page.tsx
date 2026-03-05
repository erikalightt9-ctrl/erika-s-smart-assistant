"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Car, Loader2, ChevronDown, ChevronRight,
} from "lucide-react";

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  status: string;
  subsidiary: string;
  assignee: { name: string } | null;
  _count: { logs: number };
  createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ACTIVE:      { label: "Active",      bg: "#d1fae5", text: "#16a34a", dot: "#16a34a" },
  MAINTENANCE: { label: "Maintenance", bg: "#fef3c7", text: "#d97706", dot: "#d97706" },
  INACTIVE:    { label: "Inactive",    bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" },
  SOLD:        { label: "Sold",        bg: "#fee2e2", text: "#dc2626", dot: "#dc2626" },
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
  const cfg = STATUS_CFG[status] ?? { label: status, bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function ColorDot({ color }: { color: string | null }) {
  if (!color) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-full border border-slate-200 flex-shrink-0"
        style={{ backgroundColor: color.startsWith("#") ? color : undefined, background: !color.startsWith("#") ? color : undefined }}
      />
      <span className="text-xs text-slate-500">{color}</span>
    </span>
  );
}

export default function VehiclesPage() {
  const { data: session } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const canAdd = ["ERIKA", "ADMIN"].includes(session?.user?.role ?? "");

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    const url = statusFilter
      ? `/api/admin/vehicles?status=${statusFilter}`
      : "/api/admin/vehicles";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setVehicles(data.data ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const counts = {
    active: vehicles.filter((v) => v.status === "ACTIVE").length,
    maintenance: vehicles.filter((v) => v.status === "MAINTENANCE").length,
    total: vehicles.length,
  };

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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e0f2fe" }}>
              <Car className="h-5 w-5" style={{ color: "#0284c7" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Vehicle Fleet</h1>
              <p className="text-sm text-slate-400">Fleet management &amp; usage logs</p>
            </div>
          </div>
          {canAdd && (
            <Link
              href="/departments/admin/vehicles/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#0a1628" }}
            >
              <Plus className="h-4 w-4" /> Add Vehicle
            </Link>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Total Fleet</p>
          <p className="text-lg font-bold text-slate-800">{counts.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Active</p>
          <p className="text-lg font-bold text-green-600">{counts.active}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">In Maintenance</p>
          <p className="text-lg font-bold text-amber-600">{counts.maintenance}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex justify-end">
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
      </div>

      {/* Vehicle Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white border border-slate-200 rounded-2xl">
          No vehicles found.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/departments/admin/vehicles/${v.id}`}
              className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-3"
            >
              {/* Plate Number */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-xl text-slate-900 tracking-widest">
                  {v.plateNumber}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>

              {/* Make / Model / Year */}
              <div>
                <p className="font-semibold text-slate-700 text-sm">
                  {v.year} {v.make} {v.model}
                </p>
                <ColorDot color={v.color} />
              </div>

              {/* Status */}
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={v.status} />
                <span className="text-xs text-slate-400">
                  {v._count.logs} log{v._count.logs !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Assignee & Subsidiary */}
              <div className="border-t border-slate-100 pt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Assigned to</span>
                  <span className="font-medium text-slate-700">
                    {v.assignee ? v.assignee.name : (
                      <span className="text-slate-400 font-normal">Unassigned</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Subsidiary</span>
                  <span className="text-slate-500 text-right max-w-36 truncate">
                    {SUB_LABELS[v.subsidiary] ?? v.subsidiary.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
