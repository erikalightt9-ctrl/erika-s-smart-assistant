"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, Loader2 } from "lucide-react";

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

const CURRENT_YEAR = new Date().getFullYear();

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    plateNumber: "",
    make: "",
    model: "",
    year: String(CURRENT_YEAR),
    color: "",
    subsidiary: "",
    assignedToId: "",
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

    if (!form.plateNumber || !form.make || !form.model || !form.year || !form.subsidiary) {
      setError("Please fill in all required fields.");
      return;
    }

    const year = parseInt(form.year, 10);
    if (isNaN(year) || year < 1900 || year > CURRENT_YEAR + 1) {
      setError(`Year must be between 1900 and ${CURRENT_YEAR + 1}.`);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plateNumber: form.plateNumber.toUpperCase(),
        make: form.make,
        model: form.model,
        year,
        color: form.color || null,
        subsidiary: form.subsidiary,
        assignedToId: form.assignedToId || null,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to add vehicle.");
      return;
    }
    router.push("/departments/admin/vehicles");
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/departments/admin/vehicles"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Vehicles
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e0f2fe" }}>
            <Car className="h-5 w-5" style={{ color: "#0284c7" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Add Vehicle</h1>
            <p className="text-sm text-slate-400">Register a new vehicle to the fleet</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Plate Number *</label>
          <input
            value={form.plateNumber}
            onChange={(e) => set("plateNumber", e.target.value.toUpperCase())}
            placeholder="e.g. AAA-1234"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400/30 font-mono uppercase"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Make *</label>
            <input
              value={form.make}
              onChange={(e) => set("make", e.target.value)}
              placeholder="e.g. Toyota"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Model *</label>
            <input
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder="e.g. Fortuner"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Year *</label>
            <input
              type="number"
              min="1900"
              max={CURRENT_YEAR + 1}
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
              placeholder={String(CURRENT_YEAR)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Color</label>
            <input
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              placeholder="e.g. Pearl White"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
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

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">
            Assigned To (User ID)
            <span className="ml-1 text-slate-400 font-normal">— optional</span>
          </label>
          <input
            value={form.assignedToId}
            onChange={(e) => set("assignedToId", e.target.value)}
            placeholder="Leave blank if unassigned"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400/30"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Additional notes about the vehicle…"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400/30 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/departments/admin/vehicles"
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
            Add Vehicle
          </button>
        </div>
      </form>
    </div>
  );
}
