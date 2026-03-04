import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Clock, BadgeDollarSign, CreditCard, DollarSign, FileText,
  Monitor, Wrench, BellDot, Bot, BrainCircuit, BookOpen,
  Users, TrendingUp, ShieldCheck, ClipboardList, ChevronRight,
  LayoutGrid, Zap, CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feature {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  live: boolean;
  roles?: string[];
  tags?: string[];
}

interface Department {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bg: string;
  borderColor: string;
  icon: React.ElementType;
  features: Feature[];
}

// ─── All features organized by department ─────────────────────────────────────

const DEPARTMENTS: Department[] = [
  {
    id: "hr",
    label: "HR & People Management",
    subtitle: "Attendance, leave, overtime, and statutory contributions",
    color: "#2563eb",
    bg: "#eff6ff",
    borderColor: "#bfdbfe",
    icon: Users,
    features: [
      {
        title: "Timekeeping / Attendance",
        description: "Log daily time-in/time-out, view your DTR, and export attendance records.",
        href: "/timekeeping",
        icon: Clock,
        live: true,
        tags: ["DTR", "Time In/Out"],
      },
      {
        title: "Leave Requests",
        description: "File, track, and manage leave applications. View leave balances.",
        href: "/timekeeping/leave",
        icon: CalendarDays,
        live: true,
        tags: ["Vacation", "Sick Leave", "SIL"],
      },
      {
        title: "Overtime Requests",
        description: "File overtime prior to rendering work. Track DOLE-compliant OT rates.",
        href: "/timekeeping/overtime",
        icon: Zap,
        live: true,
        tags: ["OT", "DOLE"],
      },
      {
        title: "Regulatory Compliance",
        description: "Auto-compute SSS, PhilHealth, and Pag-IBIG. Generate remittance reports.",
        href: "/contributions",
        icon: BadgeDollarSign,
        live: true,
        roles: ["ERIKA", "ADMIN"],
        tags: ["SSS", "PhilHealth", "Pag-IBIG"],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance & Accounting",
    subtitle: "Billing, transactions, invoicing, and payables tracking",
    color: "#16a34a",
    bg: "#f0fdf4",
    borderColor: "#bbf7d0",
    icon: TrendingUp,
    features: [
      {
        title: "AI Billing Generator",
        description: "Upload credit card statements — Claude AI reads and tags every line item per subsidiary.",
        href: "/billing",
        icon: CreditCard,
        live: true,
        roles: ["ERIKA", "ADMIN"],
        tags: ["Claude AI", "OCR", "Auto-tagging"],
      },
      {
        title: "Financial Transaction Encoder",
        description: "Encode and categorize financial transactions per subsidiary. Generate summaries.",
        href: "#",
        icon: DollarSign,
        live: false,
        roles: ["ERIKA", "ADMIN"],
        tags: ["Transactions", "Encoding"],
      },
      {
        title: "BIR Invoice Encoder",
        description: "Encode official receipts and BIR invoices. Maintain compliant taxable records.",
        href: "#",
        icon: FileText,
        live: false,
        roles: ["ERIKA", "ADMIN"],
        tags: ["BIR", "Invoicing", "Tax"],
      },
      {
        title: "Billing Reminders & Payables",
        description: "Track due dates for bills and subscriptions across all subsidiaries.",
        href: "#",
        icon: BellDot,
        live: false,
        roles: ["ERIKA", "ADMIN"],
        tags: ["Reminders", "Payables"],
      },
    ],
  },
  {
    id: "operations",
    label: "Operations & Administration",
    subtitle: "Document routing, asset tracking, and procurement",
    color: "#d97706",
    bg: "#fffbeb",
    borderColor: "#fde68a",
    icon: ClipboardList,
    features: [
      {
        title: "Document Signature Routing",
        description: "Route documents for approval. Send e-signature links and track the document lifecycle.",
        href: "/documents",
        icon: FileText,
        live: true,
        tags: ["E-Signature", "Routing", "Audit Trail"],
      },
      {
        title: "Asset Tracker",
        description: "Register and monitor all company assets — equipment, devices, and furniture.",
        href: "#",
        icon: Monitor,
        live: false,
        tags: ["Equipment", "Warranty", "Depreciation"],
      },
      {
        title: "Purchase & Maintenance Tracker",
        description: "Track inventory, log purchase orders and maintenance requests. Get low-stock alerts.",
        href: "#",
        icon: Wrench,
        live: false,
        tags: ["Inventory", "Purchases", "Maintenance"],
      },
    ],
  },
  {
    id: "ai",
    label: "AI & Intelligence",
    subtitle: "Conversational AI, document analysis, and knowledge management",
    color: "#7c3aed",
    bg: "#f5f3ff",
    borderColor: "#ddd6fe",
    icon: Bot,
    features: [
      {
        title: "AI Assistant",
        description: "Conversational AI powered by Claude. Ask about company policies, tasks, and the system.",
        href: "/assistant",
        icon: Bot,
        live: true,
        tags: ["Claude AI", "Chat", "24/7"],
      },
      {
        title: "Document AI Assistant",
        description: "Upload any document and ask questions. AI reads, summarizes, and extracts key info.",
        href: "/document-assistant",
        icon: BrainCircuit,
        live: true,
        tags: ["Claude AI", "OCR", "Analysis"],
      },
      {
        title: "Knowledge Base",
        description: "Upload company SOPs and policies. AI references them for accurate, context-aware answers.",
        href: "/knowledge",
        icon: BookOpen,
        live: true,
        roles: ["ERIKA", "ADMIN"],
        tags: ["SOPs", "Policies", "AI Context"],
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    subtitle: "Regulatory adherence and risk management",
    color: "#dc2626",
    bg: "#fef2f2",
    borderColor: "#fecaca",
    icon: ShieldCheck,
    features: [
      {
        title: "Compliance Dashboard",
        description: "Monitor regulatory deadlines, filings, and compliance status across all subsidiaries.",
        href: "#",
        icon: ShieldCheck,
        live: false,
        roles: ["ERIKA", "ADMIN"],
        tags: ["Regulatory", "Filings", "Deadlines"],
      },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FeaturesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;

  const visibleDepts = DEPARTMENTS.map((dept) => ({
    ...dept,
    features: dept.features.filter(
      (f) => !f.roles || f.roles.includes(role),
    ),
  })).filter((dept) => dept.features.length > 0);

  const totalFeatures = visibleDepts.reduce((sum, d) => sum + d.features.length, 0);
  const liveCount = visibleDepts.reduce(
    (sum, d) => sum + d.features.filter((f) => f.live).length,
    0,
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="h-5 w-5" style={{ color: "#0a1628" }} />
            <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
              System Features
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            All modules organized by department —{" "}
            <span className="font-medium text-foreground">{liveCount} live</span>
            {" · "}
            <span className="font-medium text-foreground">
              {totalFeatures - liveCount} coming soon
            </span>
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-xs px-3 py-1.5 font-semibold shrink-0"
        >
          {totalFeatures} features visible
        </Badge>
      </div>

      {/* ── Department sections ── */}
      <div className="space-y-10">
        {visibleDepts.map((dept) => {
          const DeptIcon = dept.icon;
          const deptLive = dept.features.filter((f) => f.live).length;

          return (
            <section key={dept.id}>
              {/* Department header */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
                style={{ backgroundColor: dept.bg, border: `1px solid ${dept.borderColor}` }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: dept.color }}
                >
                  <DeptIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-sm" style={{ color: dept.color }}>
                    {dept.label}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">{dept.subtitle}</p>
                </div>
                <div className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: dept.color + "15", color: dept.color }}
                >
                  {deptLive} live · {dept.features.length - deptLive} soon
                </div>
              </div>

              {/* Feature rows */}
              <div className="space-y-2 pl-1">
                {dept.features.map((feature) => {
                  const FeatIcon = feature.icon;

                  const inner = (
                    <div
                      className={[
                        "group flex items-center gap-4 bg-white rounded-xl border px-4 py-3.5 transition-all",
                        feature.live
                          ? "hover:shadow-md hover:border-current cursor-pointer"
                          : "opacity-60 cursor-default",
                      ].join(" ")}
                      style={{ borderColor: "#e8edf3" }}
                    >
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: dept.bg }}
                      >
                        <FeatIcon className="h-5 w-5" style={{ color: dept.color }} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>
                            {feature.title}
                          </span>
                          {!feature.live && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: "#f1f5f9", color: "#94a3b8" }}
                            >
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {feature.description}
                        </p>
                      </div>

                      {/* Tags */}
                      {feature.tags && (
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          {feature.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: dept.bg, color: dept.color }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Arrow */}
                      {feature.live && (
                        <ChevronRight
                          className="h-4 w-4 shrink-0 opacity-25 group-hover:opacity-70 transition-opacity"
                          style={{ color: dept.color }}
                        />
                      )}
                    </div>
                  );

                  if (!feature.live) return <div key={feature.title}>{inner}</div>;
                  return (
                    <Link key={feature.title} href={feature.href} className="block">
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
