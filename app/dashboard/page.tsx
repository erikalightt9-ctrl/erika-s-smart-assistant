import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Building2, Home, AlertCircle,
  Plane, Brain, Star, Zap, DollarSign, UserCircle2,
  Clock, CalendarDays, Timer, FileCheck2, Bell,
  CheckCircle2, XCircle, CircleDot, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

// ── Real subsidiaries ──────────────────────────────────────────────────────
const SUBSIDIARIES = [
  {
    key: "MEDIA_ADVERTISING",
    name: "Philippine Dragon Media Network Corp",
    abbr: "PDMN",
    desc: "Media & Advertising",
    color: "#dc2626",
    bg: "#fef2f2",
    icon: Brain,
  },
  {
    key: "VIRTUAL_PHYSICAL_OFFICE",
    name: "GDS Payment Solutions Inc.",
    abbr: "GPS",
    desc: "Payment Processing",
    color: "#2563eb",
    bg: "#eff6ff",
    icon: DollarSign,
  },
  {
    key: "TRAVEL_AGENCY",
    name: "GDS International Travel Agency Inc.",
    abbr: "GITA",
    desc: "Travel & Tourism",
    color: "#16a34a",
    bg: "#f0fdf4",
    icon: Plane,
  },
  {
    key: "BUSINESS_MGMT_CONSULTANCY",
    name: "Starlight Business Consulting Services Inc.",
    abbr: "SBCS",
    desc: "Business Consulting",
    color: "#d97706",
    bg: "#fffbeb",
    icon: Star,
  },
  {
    key: "EVENTS_IT",
    name: "Supernova Innovation Inc.",
    abbr: "SNI",
    desc: "Innovation & Tech",
    color: "#7c3aed",
    bg: "#f5f3ff",
    icon: Zap,
  },
  {
    key: "EV_CHARGERS",
    name: "DragonAI Media Inc.",
    abbr: "DAI",
    desc: "AI-Powered Media",
    color: "#0891b2",
    bg: "#ecfeff",
    icon: Building2,
  },
];

// ── Subsidiary enum → display label ────────────────────────────────────────
const SUBSIDIARY_LABEL: Record<string, { name: string; desc: string; color: string; bg: string }> = {
  HOLDING_GDS_CAPITAL:      { name: "GDS Capital Inc.",                           desc: "Holding Company",       color: "#0a1628", bg: "#f1f5f9" },
  MEDIA_ADVERTISING:        { name: "Philippine Dragon Media Network Corp",        desc: "Media & Advertising",   color: "#dc2626", bg: "#fef2f2" },
  VIRTUAL_PHYSICAL_OFFICE:  { name: "GDS Payment Solutions Inc.",                  desc: "Payment Processing",    color: "#2563eb", bg: "#eff6ff" },
  TRAVEL_AGENCY:            { name: "GDS International Travel Agency Inc.",        desc: "Travel & Tourism",      color: "#16a34a", bg: "#f0fdf4" },
  BUSINESS_MGMT_CONSULTANCY:{ name: "Starlight Business Consulting Services Inc.", desc: "Business Consulting",   color: "#d97706", bg: "#fffbeb" },
  EVENTS_IT:                { name: "Supernova Innovation Inc.",                   desc: "Innovation & Tech",     color: "#7c3aed", bg: "#f5f3ff" },
  EV_CHARGERS:              { name: "DragonAI Media Inc.",                         desc: "AI-Powered Media",      color: "#0891b2", bg: "#ecfeff" },
};

// ── Role → display label ───────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  ERIKA: "Super Admin",
  ADMIN: "Admin",
  EXEC:  "Executive",
  STAFF: "Staff",
};

// ── Compute remittance due dates ────────────────────────────────────────────
function getRemittanceDeadlines() {
  const now = new Date();
  const phNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );

  // Due = 10th of next month
  const dueMonth = phNow.getMonth() === 11 ? 0 : phNow.getMonth() + 1;
  const dueYear  = phNow.getMonth() === 11 ? phNow.getFullYear() + 1 : phNow.getFullYear();
  const dueDate  = new Date(dueYear, dueMonth, 10);

  const msPerDay    = 1000 * 60 * 60 * 24;
  const daysLeft    = Math.ceil((dueDate.getTime() - phNow.getTime()) / msPerDay);
  const dueDateStr  = dueDate.toLocaleDateString("en-PH", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  });

  const urgency: "critical" | "warning" | "normal" =
    daysLeft <= 3 ? "critical" :
    daysLeft <= 7 ? "warning"  : "normal";

  return { daysLeft, dueDateStr, urgency };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role   = session.user.role;
  const userId = session.user.id;

  // ── Live data ──────────────────────────────────────────────────────────────

  // Today's date in PH timezone (YYYY-MM-DD)
  const todayPH = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  const todayStart = new Date(`${todayPH}T00:00:00+08:00`);
  const todayEnd   = new Date(`${todayPH}T23:59:59+08:00`);

  const [
    todayAttendance,
    pendingLeaves,
    pendingOvertime,
    pendingDocsCount,
  ] = await Promise.all([
    // Today's attendance entries
    prisma.attendanceEntry.findMany({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { timestamp: "asc" },
    }),
    // My pending leave requests (latest 5)
    prisma.leaveRequest.findMany({
      where:   { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take:    5,
    }),
    // My pending overtime requests (latest 5)
    prisma.overtimeRequest.findMany({
      where:   { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take:    5,
    }),
    // Pending docs (ADMIN/ERIKA see all pending; others skip)
    ["ERIKA", "ADMIN"].includes(role)
      ? prisma.document.count({
          where: { status: { in: ["PENDING_REVIEW", "PENDING_SIGNATURE", "SUBMITTED"] } },
        })
      : Promise.resolve(0),
  ]);

  // Attendance status
  const timeInEntry  = todayAttendance.find((e) => e.type === "TIME_IN");
  const timeOutEntry = [...todayAttendance].reverse().find((e) => e.type === "TIME_OUT");

  const fmtTime = (d: Date) =>
    new Date(d).toLocaleTimeString("en-PH", {
      hour:   "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });

  // Subsidiary
  const subsidiaryKey  = session.user.subsidiary as string | null;
  const subsidiaryInfo = subsidiaryKey ? SUBSIDIARY_LABEL[subsidiaryKey] ?? null : null;

  // Initials
  const initials = session.user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const greeting = () => {
    const phHour = parseInt(
      new Date().toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        hour:     "numeric",
        hour12:   false,
      }),
    );
    if (phHour < 12) return "Good morning";
    if (phHour < 18) return "Good afternoon";
    return "Good evening";
  };

  const currentMonth = new Date().toLocaleDateString("en-PH", {
    year:     "numeric",
    month:    "long",
    timeZone: "Asia/Manila",
  });

  const { daysLeft, dueDateStr, urgency } = getRemittanceDeadlines();

  const urgencyStyle = {
    critical: { border: "border-red-300",    bg: "bg-red-50",    text: "text-red-700",    badge: "bg-red-500"    },
    warning:  { border: "border-orange-300", bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-500" },
    normal:   { border: "border-green-200",  bg: "bg-green-50",  text: "text-green-700",  badge: "bg-green-500"  },
  }[urgency];

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting()}, {session.user.name.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {currentMonth} · GDS Capital Smart Office Assistant
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs px-3 py-1.5 font-semibold">
            {role === "ERIKA" ? "Super Admin" : role.charAt(0) + role.slice(1).toLowerCase()}
          </Badge>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:shadow-md"
            style={{ backgroundColor: "#0a1628", borderColor: "#0a1628", color: "white" }}
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>

      {/* ── User Identity Card ── */}
      <div
        className="bg-white rounded-xl border flex items-center gap-4 px-5 py-4"
        style={{ borderColor: "#e8edf3" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg select-none"
          style={{ backgroundColor: "#0a1628" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base leading-tight" style={{ color: "#0f172a" }}>
              {session.user.name}
            </span>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor: role === "ERIKA" ? "#0a1628" : "#f1f5f9",
                color:           role === "ERIKA" ? "#c9a227" : "#475569",
              }}
            >
              {ROLE_LABEL[role] ?? role}
            </span>
          </div>
          {subsidiaryInfo ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: subsidiaryInfo.bg, color: subsidiaryInfo.color }}
              >
                <Building2 className="h-3 w-3 shrink-0" />
                {subsidiaryInfo.name}
              </span>
              <span className="text-xs text-muted-foreground">{subsidiaryInfo.desc}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#f1f5f9", color: "#0a1628" }}
              >
                <Building2 className="h-3 w-3 shrink-0" />
                GDS Capital Group
              </span>
              <span className="text-xs text-muted-foreground">All Subsidiaries</span>
            </div>
          )}
        </div>
        <div className="hidden sm:flex flex-col items-end text-right shrink-0 gap-0.5">
          <UserCircle2 className="h-4 w-4 text-muted-foreground ml-auto mb-1" />
          <span className="text-xs text-muted-foreground">{session.user.email}</span>
          <span className="text-[10px] text-muted-foreground/60">GDS Capital Smart Office</span>
        </div>
      </div>

      {/* ── My Tasks & Activity (live) ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <CircleDot className="h-4 w-4" style={{ color: "#16a34a" }} />
            My Tasks &amp; Today&apos;s Activity
          </h2>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: "#16a34a" }}
          >
            LIVE
          </span>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Today's Attendance */}
          <Link href="/timekeeping" className="block group">
            <div
              className="bg-white rounded-xl border p-4 hover:shadow-md transition-all h-full"
              style={{ borderColor: timeInEntry ? "#bbf7d0" : "#e8edf3" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: timeInEntry ? "#f0fdf4" : "#f1f5f9" }}
                >
                  <Clock
                    className="h-4.5 w-4.5"
                    style={{ color: timeInEntry ? "#16a34a" : "#94a3b8" }}
                  />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                Today&apos;s Attendance
              </p>
              {timeInEntry ? (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span className="text-sm font-semibold text-green-700">
                      In: {fmtTime(timeInEntry.timestamp)}
                    </span>
                  </div>
                  {timeOutEntry ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="text-sm font-semibold text-blue-700">
                        Out: {fmtTime(timeOutEntry.timestamp)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not yet timed out</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                    Not yet logged
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tap to time in</p>
                </div>
              )}
            </div>
          </Link>

          {/* Pending Leave Requests */}
          <Link href="/timekeeping/leave" className="block group">
            <div
              className="bg-white rounded-xl border p-4 hover:shadow-md transition-all h-full"
              style={{ borderColor: pendingLeaves.length > 0 ? "#fde68a" : "#e8edf3" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: pendingLeaves.length > 0 ? "#fffbeb" : "#f1f5f9" }}
                >
                  <CalendarDays
                    className="h-4 w-4"
                    style={{ color: pendingLeaves.length > 0 ? "#d97706" : "#94a3b8" }}
                  />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                Leave Requests
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: pendingLeaves.length > 0 ? "#d97706" : "#0f172a" }}
              >
                {pendingLeaves.length}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingLeaves.length === 0 ? "No pending requests" : "pending approval"}
              </p>
            </div>
          </Link>

          {/* Pending Overtime */}
          <Link href="/timekeeping/overtime" className="block group">
            <div
              className="bg-white rounded-xl border p-4 hover:shadow-md transition-all h-full"
              style={{ borderColor: pendingOvertime.length > 0 ? "#bfdbfe" : "#e8edf3" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: pendingOvertime.length > 0 ? "#eff6ff" : "#f1f5f9" }}
                >
                  <Timer
                    className="h-4 w-4"
                    style={{ color: pendingOvertime.length > 0 ? "#2563eb" : "#94a3b8" }}
                  />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                Overtime Requests
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: pendingOvertime.length > 0 ? "#2563eb" : "#0f172a" }}
              >
                {pendingOvertime.length}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingOvertime.length === 0 ? "No pending requests" : "pending approval"}
              </p>
            </div>
          </Link>

          {/* Pending Documents (admin) or Docs link (staff) */}
          {["ERIKA", "ADMIN"].includes(role) ? (
            <Link href="/documents" className="block group">
              <div
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-all h-full"
                style={{ borderColor: pendingDocsCount > 0 ? "#fecaca" : "#e8edf3" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: pendingDocsCount > 0 ? "#fef2f2" : "#f1f5f9" }}
                  >
                    <FileCheck2
                      className="h-4 w-4"
                      style={{ color: pendingDocsCount > 0 ? "#dc2626" : "#94a3b8" }}
                    />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                  Docs for Review
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: pendingDocsCount > 0 ? "#dc2626" : "#0f172a" }}
                >
                  {pendingDocsCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pendingDocsCount === 0 ? "All documents clear" : "awaiting action"}
                </p>
              </div>
            </Link>
          ) : (
            <Link href="/documents" className="block group">
              <div
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-all h-full"
                style={{ borderColor: "#e8edf3" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fef2f2" }}>
                    <FileCheck2 className="h-4 w-4" style={{ color: "#dc2626" }} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                  Documents
                </p>
                <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>View All</p>
                <p className="text-xs text-muted-foreground">Approval workflow</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* ── Deadline Reminders & Dues ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-500" />
            Reminders &amp; Deadlines
          </h2>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${urgencyStyle.badge}`}
          >
            {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
          </span>
        </div>

        <div className={`rounded-xl border p-5 ${urgencyStyle.border} ${urgencyStyle.bg}`}>
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${urgencyStyle.text}`} />
            <div>
              <p className={`font-bold text-sm ${urgencyStyle.text}`}>
                Monthly Government Remittance Deadlines
              </p>
              <p className={`text-xs mt-0.5 ${urgencyStyle.text} opacity-80`}>
                Due date: <strong>{dueDateStr}</strong> · {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: "SSS Monthly Contribution",    href: "/contributions", icon: CheckCircle2  },
              { label: "PhilHealth Premium",           href: "/contributions", icon: CheckCircle2  },
              { label: "Pag-IBIG Fund Contribution",   href: "/contributions", icon: CheckCircle2  },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 hover:opacity-80 transition-opacity ${urgencyStyle.text}`}
                style={{ backgroundColor: "rgba(255,255,255,0.55)" }}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold">{dueDateStr}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                </div>
              </Link>
            ))}
          </div>

          {urgency === "critical" && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-700">
              <XCircle className="h-4 w-4" />
              Deadline is in {daysLeft} day{daysLeft !== 1 ? "s" : ""}! File remittances immediately.
            </div>
          )}
        </div>
      </div>

      {/* ── Subsidiaries ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Our Subsidiaries</h2>
          <span className="text-xs text-muted-foreground">{SUBSIDIARIES.length} companies</span>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {SUBSIDIARIES.map((sub) => {
            const isUserCompany = sub.key === subsidiaryKey;
            return (
              <div
                key={sub.abbr}
                className="bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-md transition-shadow relative"
                style={{
                  borderColor: isUserCompany ? sub.color : "#e8edf3",
                  borderWidth:  isUserCompany ? "2px" : "1px",
                }}
              >
                {isUserCompany && (
                  <span
                    className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: sub.color, color: "#fff" }}
                  >
                    Your Company
                  </span>
                )}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: sub.bg }}
                >
                  <sub.icon className="h-5 w-5" style={{ color: sub.color }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-snug truncate" style={{ color: "#0f172a" }}>
                    {sub.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: sub.color }}>{sub.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
