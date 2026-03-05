"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, Plus, ShoppingCart, Loader2, ChevronDown,
  CheckCircle, XCircle, Search,
} from "lucide-react";
import { formatShortDate } from "@/lib/utils";

interface PurchaseOrder {
  id: string;
  title: string;
  vendor: string;
  description: string | null;
  amount: number;
  status: string;
  subsidiary: string;
  category: string | null;
  requester: { name: string };
  approver: { name: string } | null;
  createdAt: string;
  approvedAt: string | null;
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:   { label: "Pending",   bg: "#fef3c7", text: "#d97706" },
  APPROVED:  { label: "Approved",  bg: "#d1fae5", text: "#16a34a" },
  REJECTED:  { label: "Rejected",  bg: "#fee2e2", text: "#dc2626" },
  ORDERED:   { label: "Ordered",   bg: "#dbeafe", text: "#2563eb" },
  RECEIVED:  { label: "Received",  bg: "#dcfce7", text: "#15803d" },
  CANCELLED: { label: "Cancelled", bg: "#f3f4f6", text: "#6b7280" },
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

export default function PurchasesPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canApprove = ["ERIKA", "ADMIN"].includes(session?.user?.role ?? "");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const url = statusFilter
      ? `/api/admin/purchases?status=${statusFilter}`
      : "/api/admin/purchases";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.data ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter((o) =>
    !search ||
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.vendor.toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    count: orders.length,
    amount: orders.reduce((s, o) => s + Number(o.amount), 0),
    pending: orders.filter((o) => o.status === "PENDING").length,
  };

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(`${id}-${action}`);
    setError(null);
    const res = await fetch(`/api/admin/purchases/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setActionLoading(null);
    if (!res.ok) {
      setError(data.error ?? `Failed to ${action} order.`);
      return;
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: action === "approve" ? "APPROVED" : "REJECTED" }
          : o
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
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Purchases Monitoring</h1>
              <p className="text-sm text-slate-400">Purchase orders &amp; vendor tracking</p>
            </div>
          </div>
          <Link
            href="/departments/admin/purchases/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#0a1628" }}
          >
            <Plus className="h-4 w-4" /> Add PO
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Total POs</p>
          <p className="text-lg font-bold text-slate-800">{totals.count}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Total Amount</p>
          <p className="text-lg font-bold text-slate-800">{fmt(totals.amount)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Pending Approval</p>
          <p className="text-lg font-bold text-amber-600">{totals.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search title or vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30"
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
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No purchase orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Vendor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Requester</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Subsidiary</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {o.title}
                      {o.category && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          {o.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.vendor}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {fmt(o.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{o.requester.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {SUB_LABELS[o.subsidiary] ?? o.subsidiary.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {formatShortDate(o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {canApprove && o.status === "PENDING" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAction(o.id, "approve")}
                            disabled={actionLoading !== null}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-semibold hover:bg-green-100 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === `${o.id}-approve` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(o.id, "reject")}
                            disabled={actionLoading !== null}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === `${o.id}-reject` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Reject
                          </button>
                        </div>
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
