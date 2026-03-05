"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, CreditCard, TrendingUp, ShoppingCart,
  Wrench, Car, BarChart3, ShieldCheck, AlertCircle,
  ArrowRight, Plus, CheckCircle, Clock, XCircle,
  DollarSign, Package, Activity, Users,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface HubStats {
  collections: { pending: number; overdue: number; totalOutstanding: number };
  purchases:   { pending: number; total: number; totalAmount: number };
  maintenance: { scheduled: number; overdue: number; inProgress: number };
  vehicles:    { active: number; maintenance: number; total: number };
  billing:     { statements: number; totalAmount: number };
  documents:   { pending: number };
}

// ── Module Card ────────────────────────────────────────────────────────────────
function ModuleCard({
  icon: Icon,
  title,
  subtitle,
  href,
  accentColor,
  stats,
  addHref,
  restricted,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  href: string;
  accentColor: string;
  stats?: { label: string; value: string | number; color?: string }[];
  addHref?: string;
  restricted?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}18` }}>
            <Icon className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        {restricted && (
          <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">ADMIN+</span>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold" style={{ color: s.color ?? "#0f172a" }}>{s.value}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        <Link
          href={href}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Link>
        {addHref && (
          <Link
            href={addHref}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="h-3 w-3" />
            Add
          </Link>
        )}
      </div>
    </div>
  );
}

// ── KPI Banner ─────────────────────────────────────────────────────────────────
function KPIItem({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-bold text-slate-900 text-base">{value}</p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<HubStats | null>(null);
  const [loading, setLoading] = useState(true);

  const role = session?.user?.role ?? "";
  const canAdmin = ["ERIKA", "ADMIN"].includes(role);
  const canExec  = ["ERIKA", "ADMIN", "EXEC"].includes(role);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status !== "authenticated")   return;

    async function fetchStats() {
      try {
        const [colRes, poRes, mntRes, vehRes, bilRes, docRes] = await Promise.all([
          fetch("/api/admin/collections"),
          fetch("/api/admin/purchases"),
          fetch("/api/admin/maintenance"),
          fetch("/api/admin/vehicles"),
          fetch("/api/billing"),
          fetch("/api/documents?status=SUBMITTED&status=UNDER_REVIEW"),
        ]);

        const [colData, poData, mntData, vehData, bilData, docData] = await Promise.all([
          colRes.ok ? colRes.json() : { data: [] },
          poRes.ok  ? poRes.json()  : { data: [] },
          mntRes.ok ? mntRes.json() : { data: [] },
          vehRes.ok ? vehRes.json() : { data: [] },
          bilRes.ok ? bilRes.json() : { data: [] },
          docRes.ok ? docRes.json() : { data: [] },
        ]);

        const cols = colData.data ?? [];
        const pos  = poData.data  ?? [];
        const mnts = mntData.data ?? [];
        const vehs = vehData.data ?? [];
        const bils = bilData.data ?? [];
        const docs = docData.data ?? [];

        setStats({
          collections: {
            pending: cols.filter((c: { status: string }) => c.status === "PENDING").length,
            overdue: cols.filter((c: { status: string }) => c.status === "OVERDUE").length,
            totalOutstanding: cols
              .filter((c: { status: string }) => !["PAID", "WRITTEN_OFF"].includes(c.status))
              .reduce((sum: number, c: { amount: number }) => sum + Number(c.amount), 0),
          },
          purchases: {
            pending: pos.filter((p: { status: string }) => p.status === "PENDING").length,
            total: pos.length,
            totalAmount: pos.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0),
          },
          maintenance: {
            scheduled: mnts.filter((m: { status: string }) => m.status === "SCHEDULED").length,
            overdue:   mnts.filter((m: { status: string }) => m.status === "OVERDUE").length,
            inProgress: mnts.filter((m: { status: string }) => m.status === "IN_PROGRESS").length,
          },
          vehicles: {
            active:      vehs.filter((v: { status: string }) => v.status === "ACTIVE").length,
            maintenance: vehs.filter((v: { status: string }) => v.status === "MAINTENANCE").length,
            total: vehs.length,
          },
          billing: {
            statements: bils.length,
            totalAmount: bils.reduce((s: number, b: { totalAmount: number | null }) => s + Number(b.totalAmount ?? 0), 0),
          },
          documents: {
            pending: Array.isArray(docs) ? docs.filter((d: { status: string }) =>
              ["SUBMITTED", "UNDER_REVIEW"].includes(d.status)).length : 0,
          },
        });
      } catch {
        // fail silently — stats just won't show
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [status, router]);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `₱${(n / 1_000).toFixed(1)}K`
    : `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #0a1628 0%, #1a2f4a 100%)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="h-5 w-5 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-medium tracking-wide uppercase">Administrative</span>
            </div>
            <h1 className="text-2xl font-bold">Control Panel</h1>
            <p className="text-slate-300 text-sm mt-1">GDS Capital Inc. — Internal Management System</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/departments/admin/reports"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
              <BarChart3 className="h-4 w-4" />
              Reports
            </Link>
            {canAdmin && (
              <Link href="/departments/admin/access-control"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-medium transition-colors">
                <ShieldCheck className="h-4 w-4" />
                Access Control
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Top Executive Overview KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Top Executive Overview
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPIItem label="Outstanding"     value={stats ? fmt(stats.collections.totalOutstanding) : "—"} icon={DollarSign} color="#dc2626" />
            <KPIItem label="Pending Orders"  value={stats?.purchases.pending ?? "—"}                        icon={Package}    color="#d97706" />
            <KPIItem label="Maintenance Due" value={stats ? stats.maintenance.scheduled + stats.maintenance.overdue : "—"} icon={Wrench} color="#7c3aed" />
            <KPIItem label="Active Vehicles" value={stats?.vehicles.active ?? "—"}                           icon={Car}        color="#0284c7" />
            <KPIItem label="Docs Pending"    value={stats?.documents.pending ?? "—"}                         icon={Users}      color="#059669" />
            <KPIItem label="Billing (All)"   value={stats ? fmt(stats.billing.totalAmount) : "—"}            icon={CreditCard} color="#c9a227" />
          </div>
        )}
      </div>

      {/* Module Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Modules
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* AI Billing Generator */}
          <ModuleCard
            icon={CreditCard}
            title="AI Billing Generator"
            subtitle="Credit card statement analyzer"
            href="/billing"
            accentColor="#c9a227"
            stats={loading ? [] : [
              { label: "Statements",  value: stats?.billing.statements ?? 0 },
              { label: "Total Amount", value: stats ? fmt(stats.billing.totalAmount) : "₱0" },
              { label: "AI-Powered",  value: "✓", color: "#16a34a" },
            ]}
          />

          {/* Collection Monitoring */}
          {canExec && (
            <ModuleCard
              icon={DollarSign}
              title="Collection Monitoring"
              subtitle="Outstanding invoices & receivables"
              href="/departments/admin/collections"
              accentColor="#dc2626"
              addHref="/departments/admin/collections/new"
              stats={loading ? [] : [
                { label: "Pending",  value: stats?.collections.pending ?? 0,  color: "#d97706" },
                { label: "Overdue",  value: stats?.collections.overdue ?? 0,  color: "#dc2626" },
                { label: "Due Total", value: stats ? fmt(stats.collections.totalOutstanding) : "₱0" },
              ]}
            />
          )}

          {/* Smart Bookkeeping */}
          <ModuleCard
            icon={TrendingUp}
            title="Smart Bookkeeping"
            subtitle="Expense tracking & categorization"
            href="/billing"
            accentColor="#0284c7"
            stats={[
              { label: "Platform",   value: "AI Billing" },
              { label: "Status",     value: "Live", color: "#16a34a" },
              { label: "Auto-Tag",   value: "✓",    color: "#16a34a" },
            ]}
          />

          {/* Purchases Monitoring */}
          {canExec && (
            <ModuleCard
              icon={ShoppingCart}
              title="Purchases Monitoring"
              subtitle="Purchase orders & vendor tracking"
              href="/departments/admin/purchases"
              accentColor="#d97706"
              addHref="/departments/admin/purchases/new"
              stats={loading ? [] : [
                { label: "Pending",  value: stats?.purchases.pending ?? 0,     color: "#d97706" },
                { label: "Total POs", value: stats?.purchases.total ?? 0 },
                { label: "Total ₱",  value: stats ? fmt(stats.purchases.totalAmount) : "₱0" },
              ]}
            />
          )}

          {/* Maintenance Monitoring */}
          {canExec && (
            <ModuleCard
              icon={Wrench}
              title="Maintenance Monitoring"
              subtitle="Asset & facility maintenance"
              href="/departments/admin/maintenance"
              accentColor="#7c3aed"
              addHref="/departments/admin/maintenance/new"
              stats={loading ? [] : [
                { label: "Scheduled",   value: stats?.maintenance.scheduled ?? 0 },
                { label: "In Progress", value: stats?.maintenance.inProgress ?? 0, color: "#0284c7" },
                { label: "Overdue",     value: stats?.maintenance.overdue ?? 0,    color: "#dc2626" },
              ]}
            />
          )}

          {/* Vehicle Monitoring */}
          {canExec && (
            <ModuleCard
              icon={Car}
              title="Vehicle Monitoring"
              subtitle="Fleet management & logs"
              href="/departments/admin/vehicles"
              accentColor="#0284c7"
              addHref={canAdmin ? "/departments/admin/vehicles/new" : undefined}
              stats={loading ? [] : [
                { label: "Active",      value: stats?.vehicles.active ?? 0,      color: "#16a34a" },
                { label: "Maintenance", value: stats?.vehicles.maintenance ?? 0, color: "#d97706" },
                { label: "Total Fleet", value: stats?.vehicles.total ?? 0 },
              ]}
            />
          )}

          {/* Financial Reports */}
          {canExec && (
            <ModuleCard
              icon={BarChart3}
              title="Financial Reports"
              subtitle="Aggregated financial summaries"
              href="/departments/admin/reports"
              accentColor="#059669"
              stats={[
                { label: "Contributions", value: "SSS/PH/PI" },
                { label: "Collections",   value: "✓", color: "#16a34a" },
                { label: "Purchases",     value: "✓", color: "#16a34a" },
              ]}
            />
          )}

          {/* Role-Based Access Control */}
          {canAdmin && (
            <ModuleCard
              icon={ShieldCheck}
              title="Role-Based Access"
              subtitle="Module access control panel"
              href="/departments/admin/access-control"
              accentColor="#c9a227"
              restricted
              stats={[
                { label: "Modules",  value: 6 },
                { label: "Roles",    value: 4 },
                { label: "Editable", value: role === "ERIKA" ? "Yes" : "View", color: role === "ERIKA" ? "#16a34a" : "#d97706" },
              ]}
            />
          )}

        </div>
      </div>

      {/* Access notice for STAFF */}
      {!canExec && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>Some modules are restricted to Executive-level access and above. Contact your administrator for access.</p>
        </div>
      )}
    </div>
  );
}
