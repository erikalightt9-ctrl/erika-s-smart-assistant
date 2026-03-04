import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Crown, Users, TrendingUp, Megaphone, ShieldCheck, ClipboardList,
  Clock, BadgeDollarSign, CreditCard, FileText, Bot, Monitor,
  BookOpen, Settings, Wallet, ChevronRight, ArrowLeft,
  UserCircle2, Briefcase,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeatureItem {
  icon: React.ElementType;
  name: string;
  href: string;
  description: string;
  live: boolean;
}

interface FeatureGroup {
  category: string;
  features: FeatureItem[];
}

interface DeptRole {
  title: string;
  level: "senior" | "mid" | "coordinator";
  desc: string;
}

interface Department {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  bg: string;
  icon: React.ElementType;
  roles: DeptRole[];
  featureGroups: FeatureGroup[];
  financial?: {
    summary: string;
    items: string[];
  };
  allowedRoles: string[];
}

// ─── Department data ──────────────────────────────────────────────────────────

const DEPARTMENTS: Department[] = [
  {
    id: "executive",
    name: "Executive Overview",
    tagline: "Strategic Level — GDS Capital Group",
    description:
      "Provides high-level oversight of all subsidiaries, departments, and operations. Executives have full access to system-wide data, approvals, and AI-powered intelligence to drive strategic decisions across the GDS Capital Group.",
    color: "#c9a227",
    bg: "#0a1628",
    icon: Crown,
    allowedRoles: ["ERIKA", "ADMIN", "EXEC"],
    roles: [
      { title: "Chief Executive Officer (CEO)", level: "senior", desc: "Sets strategic direction, oversees all subsidiaries and executive decisions." },
      { title: "Chief Operations Officer (COO)", level: "senior", desc: "Manages daily operations, process efficiency, and cross-department coordination." },
      { title: "Chief Financial Officer (CFO)", level: "senior", desc: "Oversees financial planning, reporting, compliance, and subsidiary P&L." },
      { title: "Executive Director", level: "mid", desc: "Leads specific business units and reports directly to C-suite leadership." },
    ],
    featureGroups: [
      {
        category: "Operations & Management",
        features: [
          { icon: Users, name: "User Management", href: "/users", description: "Manage all system users, roles, and access across subsidiaries.", live: true },
          { icon: Settings, name: "System Settings", href: "/settings", description: "Configure system-wide settings, deadlines, and audit logs.", live: true },
        ],
      },
      {
        category: "Intelligence & AI",
        features: [
          { icon: Bot, name: "AI Assistant", href: "/assistant", description: "Conversational AI for policy queries, task guidance, and company context.", live: true },
          { icon: BookOpen, name: "Knowledge Base", href: "/knowledge", description: "Upload and manage SOPs, policies, and reference documents.", live: true },
        ],
      },
      {
        category: "Document Control",
        features: [
          { icon: FileText, name: "Document Routing", href: "/documents", description: "Route, review, approve, and e-sign documents across all departments.", live: true },
        ],
      },
    ],
    financial: {
      summary: "Full financial visibility across all subsidiaries and departments.",
      items: [
        "Consolidated P&L across all subsidiaries",
        "Billing statements and credit card expense reports",
        "Government remittance compliance tracking",
        "Payroll cost summaries per subsidiary",
        "Operational overhead and vendor payables",
      ],
    },
  },
  {
    id: "hr",
    name: "Human Resources",
    tagline: "People, Attendance & Compliance",
    description:
      "Manages the full employee lifecycle — from daily attendance tracking and overtime requests to government-mandated benefit remittances. HR ensures every employee's records are accurate and all statutory obligations are met on time.",
    color: "#2563eb",
    bg: "#eff6ff",
    icon: Users,
    allowedRoles: ["ERIKA", "ADMIN", "EXEC", "STAFF"],
    roles: [
      { title: "HR Manager", level: "senior", desc: "Oversees all HR operations, policies, and compliance reporting." },
      { title: "HR Officer", level: "mid", desc: "Handles day-to-day employee concerns, leave processing, and records management." },
      { title: "Payroll Specialist", level: "mid", desc: "Computes payroll, contributions, and generates remittance schedules." },
      { title: "HR Coordinator", level: "coordinator", desc: "Assists with attendance monitoring, DTR generation, and employee onboarding." },
    ],
    featureGroups: [
      {
        category: "Attendance Management",
        features: [
          { icon: Clock, name: "Timekeeping", href: "/timekeeping", description: "Daily time-in/time-out with GPS, DTR generation, and attendance log.", live: true },
          { icon: Clock, name: "Leave Requests", href: "/timekeeping/leave", description: "File and track statutory and company-provided leave requests.", live: true },
          { icon: Clock, name: "Overtime Requests", href: "/timekeeping/overtime", description: "Submit overtime requests with date, hours, and work description.", live: true },
        ],
      },
      {
        category: "Mandatories",
        features: [
          { icon: BadgeDollarSign, name: "SSS / PhilHealth / Pag-IBIG", href: "/contributions", description: "Auto-compute government contributions and generate remittance reports.", live: true },
        ],
      },
    ],
    financial: {
      summary: "HR-generated financial obligations and payroll cost tracking.",
      items: [
        "Monthly SSS, PhilHealth, and Pag-IBIG remittances",
        "Overtime pay computation per employee",
        "Leave accrual and conversion costs",
        "Payroll expense breakdown per subsidiary",
      ],
    },
  },
  {
    id: "finance",
    name: "Finance & Accounting",
    tagline: "Billing, Payables & Financial Records",
    description:
      "Manages all billing, accounts payable, and financial records across every GDS Capital subsidiary. The Finance team processes credit card statements with AI-powered extraction, routes financial documents for approval, and maintains accurate books.",
    color: "#16a34a",
    bg: "#f0fdf4",
    icon: TrendingUp,
    allowedRoles: ["ERIKA", "ADMIN"],
    roles: [
      { title: "Finance Manager", level: "senior", desc: "Oversees financial planning, budgeting, and subsidiary reporting." },
      { title: "Senior Accountant", level: "mid", desc: "Prepares financial statements, reconciliations, and tax filings." },
      { title: "Billing Specialist", level: "mid", desc: "Processes credit card statements, tags expenses per subsidiary using AI." },
      { title: "Accounts Payable Officer", level: "coordinator", desc: "Tracks vendor payables, payment schedules, and remittances." },
    ],
    featureGroups: [
      {
        category: "Billing & Expenses",
        features: [
          { icon: CreditCard, name: "AI Billing Generator", href: "/billing", description: "Upload credit card statements — Claude AI extracts and tags every line item per subsidiary.", live: true },
        ],
      },
      {
        category: "Document Control",
        features: [
          { icon: FileText, name: "Document Routing", href: "/documents", description: "Route financial documents, contracts, and payment approvals for review and e-signature.", live: true },
        ],
      },
      {
        category: "Intelligence",
        features: [
          { icon: Bot, name: "AI Assistant", href: "/assistant", description: "Query financial policies, compute estimates, and get context-aware answers.", live: true },
        ],
      },
    ],
    financial: {
      summary: "Primary financial data source for all subsidiary operations.",
      items: [
        "Credit card expense reports per subsidiary",
        "Accounts payable and vendor payment tracking",
        "Subsidiary-level revenue and expense summaries",
        "Billing statement review and finalization workflow",
        "Tax document and BIR invoice records",
      ],
    },
  },
  {
    id: "sales",
    name: "Sales & Marketing",
    tagline: "Client Acquisition & Brand Growth",
    description:
      "Drives client acquisition, manages advertising campaigns, media placements, and business proposals across GDS Capital's subsidiaries. The team leverages AI tools for drafting, research, and knowledge retrieval to close deals faster.",
    color: "#7c3aed",
    bg: "#f5f3ff",
    icon: Megaphone,
    allowedRoles: ["ERIKA", "ADMIN", "EXEC", "STAFF"],
    roles: [
      { title: "Sales & Marketing Manager", level: "senior", desc: "Leads revenue generation strategy, client relations, and team direction." },
      { title: "Marketing Officer", level: "mid", desc: "Plans and executes campaigns, manages media placements and content." },
      { title: "Account Executive", level: "mid", desc: "Manages client accounts, prepares proposals, and closes business deals." },
      { title: "Sales Coordinator", level: "coordinator", desc: "Supports the sales team with documentation, scheduling, and client correspondence." },
    ],
    featureGroups: [
      {
        category: "Intelligence & Research",
        features: [
          { icon: Bot, name: "AI Assistant", href: "/assistant", description: "Draft proposals, research competitors, and generate marketing copy with Claude AI.", live: true },
          { icon: BookOpen, name: "Knowledge Base", href: "/knowledge", description: "Access company SOPs, service offerings, and reference materials instantly.", live: true },
        ],
      },
      {
        category: "Document Control",
        features: [
          { icon: FileText, name: "Document Routing", href: "/documents", description: "Route client proposals, contracts, and NDAs for review and e-signature.", live: true },
        ],
      },
    ],
  },
  {
    id: "compliance",
    name: "Compliance",
    tagline: "Regulatory Adherence & Audit Trails",
    description:
      "Ensures GDS Capital and all its subsidiaries remain fully compliant with DOLE, BIR, SSS, PhilHealth, Pag-IBIG, and internal governance policies. The Compliance team monitors remittance deadlines, maintains audit trails, and flags regulatory risks.",
    color: "#dc2626",
    bg: "#fef2f2",
    icon: ShieldCheck,
    allowedRoles: ["ERIKA", "ADMIN"],
    roles: [
      { title: "Compliance Officer", level: "senior", desc: "Oversees all regulatory compliance, audit preparation, and policy enforcement." },
      { title: "Legal Counsel", level: "mid", desc: "Advises on labor law, corporate governance, and contractual obligations." },
      { title: "Regulatory Specialist", level: "mid", desc: "Tracks DOLE, BIR, and government agency requirements and filing deadlines." },
      { title: "Compliance Coordinator", level: "coordinator", desc: "Assists with document filings, audit preparation, and record maintenance." },
    ],
    featureGroups: [
      {
        category: "Regulatory Management",
        features: [
          { icon: BadgeDollarSign, name: "Mandatories Oversight", href: "/contributions", description: "Monitor SSS, PhilHealth, and Pag-IBIG contribution schedules and deadlines.", live: true },
          { icon: Settings, name: "System Settings & Audit", href: "/settings", description: "Review audit logs, configure remittance deadlines, and track system activity.", live: true },
        ],
      },
      {
        category: "Document Control",
        features: [
          { icon: FileText, name: "Document Routing", href: "/documents", description: "Manage compliance documents, government filings, and approval workflows.", live: true },
        ],
      },
    ],
    financial: {
      summary: "Compliance cost tracking and regulatory risk exposure monitoring.",
      items: [
        "Government remittance schedule adherence tracking",
        "Regulatory penalty risk exposure and avoidance records",
        "BIR filing status and tax compliance documentation",
        "Audit log review for financial transactions",
        "Statutory compliance cost reporting",
      ],
    },
  },
  {
    id: "admin",
    name: "Administrative",
    tagline: "Office Operations & Records Management",
    description:
      "Oversees the day-to-day operations of all GDS Capital offices — managing assets, coordinating with vendors, maintaining records, and ensuring smooth internal processes. Administrative supports every department by keeping the operational backbone running.",
    color: "#d97706",
    bg: "#fffbeb",
    icon: ClipboardList,
    allowedRoles: ["ERIKA", "ADMIN", "EXEC", "STAFF"],
    roles: [
      { title: "Administrative Manager", level: "senior", desc: "Leads office operations, facilities management, and administrative policy." },
      { title: "Office Manager", level: "mid", desc: "Manages day-to-day office logistics, supplies, and vendor relationships." },
      { title: "Records Officer", level: "mid", desc: "Maintains physical and digital document archives and records systems." },
      { title: "Administrative Coordinator", level: "coordinator", desc: "Provides general administrative support, scheduling, and correspondence." },
    ],
    featureGroups: [
      {
        category: "Asset & Resource Management",
        features: [
          { icon: Monitor, name: "Asset Tracker", href: "#", description: "Register and monitor all company equipment, furniture, and devices.", live: false },
        ],
      },
      {
        category: "Document Control",
        features: [
          { icon: FileText, name: "Document Routing", href: "/documents", description: "Route internal memos, vendor contracts, and administrative approvals.", live: true },
          { icon: BookOpen, name: "Knowledge Base", href: "/knowledge", description: "Maintain office procedures, vendor directories, and operational guides.", live: true },
        ],
      },
    ],
    financial: {
      summary: "Office operational costs and asset lifecycle financial tracking.",
      items: [
        "Office overhead and utilities expense tracking",
        "Asset depreciation schedules and book values",
        "Vendor payables and procurement costs",
        "Supplies and consumables budget monitoring",
        "Facility maintenance and repair expenditures",
      ],
    },
  },
];

// ─── Level badge ──────────────────────────────────────────────────────────────

function RoleBadge({ level }: { level: DeptRole["level"] }) {
  const map = {
    senior: { label: "Senior",      bg: "#0a1628", color: "#c9a227" },
    mid:    { label: "Mid-Level",   bg: "#f1f5f9", color: "#475569" },
    coordinator: { label: "Support", bg: "#f0fdf4", color: "#16a34a" },
  };
  const s = map[level];
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const dept = DEPARTMENTS.find((d) => d.id === id);
  if (!dept) notFound();

  // Role gate
  if (!dept.allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const isExecutive = dept.id === "executive";

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Back ── */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* ── Hero ── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={
          isExecutive
            ? { background: "linear-gradient(135deg, #070f1c 0%, #0a1628 60%, #0e1f38 100%)" }
            : { backgroundColor: dept.bg, border: `2px solid ${dept.color}22` }
        }
      >
        {isExecutive && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 90% 50%, rgba(201,162,39,0.10) 0%, transparent 70%)",
            }}
          />
        )}
        <div className="flex items-start gap-4 relative z-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={
              isExecutive
                ? { backgroundColor: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.30)" }
                : { backgroundColor: `${dept.color}18`, border: `1px solid ${dept.color}30` }
            }
          >
            <dept.icon
              className="h-7 w-7"
              style={{ color: isExecutive ? "#c9a227" : dept.color }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1
                className="text-2xl font-bold leading-tight"
                style={{ color: isExecutive ? "#ffffff" : "#0f172a" }}
              >
                {dept.name}
              </h1>
              {isExecutive && (
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ backgroundColor: "rgba(201,162,39,0.18)", color: "#c9a227" }}
                >
                  Strategic Level
                </span>
              )}
            </div>
            <p
              className="text-sm font-medium mb-3"
              style={{ color: isExecutive ? "rgba(255,255,255,0.55)" : dept.color }}
            >
              {dept.tagline}
            </p>
            <p
              className="text-sm leading-relaxed max-w-2xl"
              style={{ color: isExecutive ? "rgba(255,255,255,0.60)" : "#475569" }}
            >
              {dept.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Left column: Roles + Financial ── */}
        <div className="lg:col-span-1 space-y-6">

          {/* Core Roles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserCircle2 className="h-4 w-4" style={{ color: dept.color }} />
                Core Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                {dept.roles.map((role) => (
                  <div key={role.title} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold leading-snug" style={{ color: "#0f172a" }}>
                        {role.title}
                      </span>
                      <RoleBadge level={role.level} />
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: "#94a3b8" }}>
                      {role.desc}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial Account Overview */}
          {dept.financial && (
            <Card style={{ borderColor: "#e8edf3" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  Financial Account Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {dept.financial.summary}
                </p>
                <ul className="space-y-2">
                  {dept.financial.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: "#475569" }}>
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: dept.color }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right column: System Features by Function ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              System Features by Function
            </h2>
          </div>

          {dept.featureGroups.map((group) => (
            <Card key={group.category} style={{ borderColor: "#e8edf3" }}>
              <CardHeader className="pb-2">
                <CardTitle
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: dept.color }}
                >
                  {group.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y" style={{ borderColor: "#f8fafc" }}>
                  {group.features.map((feat) => {
                    const inner = (
                      <div className="flex items-start gap-3 px-4 py-3 group">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: dept.bg }}
                        >
                          <feat.icon className="h-4 w-4" style={{ color: dept.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                              {feat.name}
                            </span>
                            {!feat.live && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ backgroundColor: "#f1f5f9", color: "#94a3b8" }}>
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#64748b" }}>
                            {feat.description}
                          </p>
                        </div>
                        {feat.live && (
                          <ChevronRight
                            className="h-4 w-4 shrink-0 mt-2.5 opacity-0 group-hover:opacity-40 transition-opacity"
                            style={{ color: dept.color }}
                          />
                        )}
                      </div>
                    );

                    return feat.live ? (
                      <Link key={feat.name} href={feat.href}
                        className="block hover:bg-muted/30 transition-colors">
                        {inner}
                      </Link>
                    ) : (
                      <div key={feat.name} className="opacity-60 cursor-default">{inner}</div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
