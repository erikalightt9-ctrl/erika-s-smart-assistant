"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench, Loader2 } from "lucide-react";

const SUBSIDIARIES = [
  "HOLDING_GDS_CAPITAL", "BUSINESS_MGMT_CONSULTANCY", "MEDIA_ADVERTISING",
  "EVENTS_IT", "TRAVEL_AGENCY", "VIRTUAL_PHYSICAL_OFFICE", "EV_CHARGERS",
];

const SUB_LABELS: Record<string, string> = {
  HOLDING_GDS_CAPITAL: "GDS Capital (Holding)",
  BUSINESS_MGMT_CONSULTANCY: "Business Mgmt. Consultancy",
  MEDIA_ADVERTISING: "Media & Advertising",
  EVENTS_IT: "Events & IT",
  TRAVEL_AGENCY: "Travel Agency",
  VIRTUAL_PHYSICAL_OFFICE: "Virtual/Physical Office",
  EV_CHARGERS: "EV Chargers",
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

export default function NewMaintenancePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    assetName: "",
    assetType: "",
    description: "",
    scheduledDate: "",
    subsidiary: "",
    performedBy: "",
    cost: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.assetName || !form.assetType || !form.scheduledDate || !form.subsidiary) {
      setError("Please fill in all required fields.");
      return;
    }

    const cost = form.cost ? parseFloat(form.cost) : null;
    if (form.cost && (isNaN(cost!) || cost! < 0)) {
      setError("Cost must be a valid positive number.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetName: form.assetName,
        assetType: form.assetType,
        description: form.description || null,
        scheduledDate: form.scheduledDate,
        subsidiary: form.subsidiary,
        performedBy: form.performedBy || null,
        cost,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create maintenance record.");
      return;
    }
    router.push("/departments/admin/maintenance");
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/departments/admin/maintenance"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Maintenance
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#ede9fe" }}>
            <Wrench className="h-5 w-5" style={{ color: "#7c3aed" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Maintenance Record</h1>
            <p className="text-sm text-slate-400">Schedule an asset or facility maintenance</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Asset Name *</label>
            <input
              value={form.assetName}
              onChange={(e) => set("assetName", e.target.value)}
              placeholder="e.g. Conference Room AC Unit"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Asset Type *</label>
            <select
              value={form.assetType}
              onChange={(e) => set("assetType", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white"
            >
              <option value="">Select type…</option>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Describe the maintenance work to be performed…"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Scheduled Date *</label>
            <input
              type="date"
              value={form.scheduledDate}
              onChange={(e) => set("scheduledDate", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Subsidiary *</label>
            <select
              value={form.subsidiary}
              onChange={(e) => set("subsidiary", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white"
            >
              <option value="">Select subsidiary…</option>
              {SUBSIDIARIES.map((s) => (
                <option key={s} value={s}>{SUB_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Performed By</label>
            <input
              value={form.performedBy}
              onChange={(e) => set("performedBy", e.target.value)}
              placeholder="Technician or vendor name"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Cost (₱)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Additional notes…"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/departments/admin/maintenance"
            className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#0a1628" }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Record
          </button>
        </div>
      </form>
    </div>
  );
}
