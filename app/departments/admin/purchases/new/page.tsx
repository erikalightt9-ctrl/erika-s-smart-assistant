"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";

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

export default function NewPurchasePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    vendor: "",
    description: "",
    amount: "",
    subsidiary: "",
    category: "",
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

    if (!form.title || !form.vendor || !form.amount || !form.subsidiary) {
      setError("Please fill in all required fields.");
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        vendor: form.vendor,
        description: form.description || null,
        amount,
        subsidiary: form.subsidiary,
        category: form.category || null,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create purchase order.");
      return;
    }
    router.push("/departments/admin/purchases");
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/departments/admin/purchases"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Purchases
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Purchase Order</h1>
            <p className="text-sm text-slate-400">Submit a purchase request for approval</p>
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
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Title *</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Office Supplies Q2"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Vendor *</label>
            <input
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="e.g. National Bookstore"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Category</label>
            <input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="e.g. Supplies, Equipment"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Describe what is being purchased…"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Amount (₱) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30"
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

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Additional notes or justification…"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/departments/admin/purchases"
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
            Submit PO
          </button>
        </div>
      </form>
    </div>
  );
}
