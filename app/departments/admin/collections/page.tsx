"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, Plus, DollarSign, AlertCircle, CheckCircle,
  Clock, X, Search, Loader2, ChevronDown,
} from "lucide-react";
import { formatShortDate } from "@/lib/utils";

interface CollectionRecord {
  id: string;
  clientName: string;
  invoiceNumber: string;
  description: string | null;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  paidAmount: number | null;
  notes: string | null;
  subsidiary: string;
  createdBy: { name: string };
  createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:     { label: "Pending",     bg: "#fef3c7", text: "#d97706" },
  PARTIAL:     { label: "Partial",     bg: "#dbeafe", text: "#2563eb" },
  PAID:        { label: "Paid",        bg: "#d1fae5", text: "#16a34a" },
  OVERDUE:     { label: "Overdue",     bg: "#fee2e2", text: "#dc2626" },
  WRITTEN_OFF: { label: "Written Off", bg: "#f3f4f6", text: "#6b7280" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

const fmt = (n: number) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CollectionsPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updateModal, setUpdateModal] = useState<CollectionRecord | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = ["ERIKA", "ADMIN", "EXEC"].includes(session?.user?.role ?? "");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const url = statusFilter ? `/api/admin/collections?status=${statusFilter}` : "/api/admin/collections";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.data ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = records.filter((r) =>
    !search || r.clientName.toLowerCase().includes(search.toLowerCase()) ||
    r.invoiceNumber.toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    total: records.reduce((s, r) => s + Number(r.amount), 0),
    outstanding: records.filter((r) => !["PAID", "WRITTEN_OFF"].includes(r.status))
      .reduce((s, r) => s + Number(r.amount), 0),
    overdue: records.filter((r) => r.status === "OVERDUE").length,
  };

  async function handleUpdate() {
    if (!updateModal) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/collections/${updateModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: updateStatus || undefined,
        paidAmount: paidAmount ? parseFloat(paidAmount) : undefined,
        paidAt: updateStatus === "PAID" || updateStatus === "PARTIAL" ? new Date().toISOString() : undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setUpdateModal(null);
    fetchRecords();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href="/departments/admin" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Admin Panel
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Collection Monitoring</h1>
              <p className="text-sm text-slate-400">Outstanding invoices & receivables</p>
            </div>
          </div>
          {canEdit && (
            <Link href="/departments/admin/collections/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#0a1628" }}>
              <Plus className="h-4 w-4" /> Add Record
            </Link>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Total Billed</p>
          <p className="text-lg font-bold text-slate-800">{fmt(totals.total)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Outstanding</p>
          <p className="text-lg font-bold text-red-600">{fmt(totals.outstanding)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Overdue Items</p>
          <p className="text-lg font-bold text-red-600">{totals.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search client or invoice…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
          />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white">
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
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No collection records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Invoice #</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Subsidiary</th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.clientName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.invoiceNumber}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(r.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatShortDate(r.dueDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.subsidiary.replace(/_/g, " ")}</td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <button onClick={() => { setUpdateModal(r); setUpdateStatus(r.status); setPaidAmount(""); setError(null); }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
                          Update
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {updateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Update Collection</h3>
              <button onClick={() => setUpdateModal(null)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{updateModal.clientName} · {updateModal.invoiceNumber}</p>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Status</label>
                <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none">
                  {Object.entries(STATUS_CFG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {["PARTIAL", "PAID"].includes(updateStatus) && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Amount Paid (₱)</label>
                  <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder={`Max: ${fmt(updateModal.amount)}`}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setUpdateModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleUpdate} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "#0a1628" }}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
