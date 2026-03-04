"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  FileText,
  Users,
  LayoutDashboard,
  Settings,
  Building2,
  Bot,
  BrainCircuit,
  Crown,
  TrendingUp,
  Megaphone,
  ShieldCheck,
  ClipboardList,
  LayoutGrid,
} from "lucide-react";

// ─── Main nav (non-department) ────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "System Features",
    href: "/features",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    label: "AI Assistant",
    href: "/assistant",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    label: "Knowledge Hub",
    href: "/knowledge",
    icon: <BrainCircuit className="h-4 w-4" />,
    roles: ["ERIKA", "ADMIN"],
  },
  {
    label: "Document Approval Workflow",
    href: "/documents",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Users",
    href: "/users",
    icon: <Users className="h-4 w-4" />,
    roles: ["ERIKA", "ADMIN"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
    roles: ["ERIKA", "ADMIN"],
  },
];

// ─── Department nav items ─────────────────────────────────────────────────────

interface DeptItem {
  id: string;
  label: string;
  color: string;
  icon: React.ElementType;
  roles?: string[];
}

const DEPT_ITEMS: DeptItem[] = [
  {
    id: "executive",
    label: "Executive Overview",
    color: "#c9a227",
    icon: Crown,
    roles: ["ERIKA", "ADMIN", "EXEC"],
  },
  {
    id: "hr",
    label: "Human Resources",
    color: "#2563eb",
    icon: Users,
  },
  {
    id: "finance",
    label: "Finance & Accounting",
    color: "#16a34a",
    icon: TrendingUp,
    roles: ["ERIKA", "ADMIN"],
  },
  {
    id: "sales",
    label: "Sales & Marketing",
    color: "#7c3aed",
    icon: Megaphone,
  },
  {
    id: "compliance",
    label: "Compliance",
    color: "#dc2626",
    icon: ShieldCheck,
    roles: ["ERIKA", "ADMIN"],
  },
  {
    id: "admin",
    label: "Administrative",
    color: "#d97706",
    icon: ClipboardList,
  },
];

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "AI Chat",          href: "/assistant",           icon: Bot },
  { label: "Analyze Document", href: "/document-assistant",  icon: BrainCircuit },
  { label: "New Document",     href: "/documents/new",       icon: FileText },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "STAFF";

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  const visibleDepts = DEPT_ITEMS.filter(
    (d) => !d.roles || d.roles.includes(role),
  );

  const visibleQuickActions = QUICK_ACTIONS;

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: "var(--navy)" }}>

      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <Building2 className="h-7 w-7" style={{ color: "var(--gold)" }} />
        <div>
          <div className="text-white font-bold text-lg leading-none">AILE</div>
          <div className="text-white/50 text-xs mt-0.5">GDS Capital</div>
        </div>
      </div>

      {/* Scrollable nav area */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        {/* Main nav items */}
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5",
              )}
              style={
                isActive
                  ? { backgroundColor: "var(--gold)", color: "var(--navy)" }
                  : {}
              }
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {/* Departments section */}
        <div className="pt-4">
          <p className="text-[9px] font-bold text-white/25 px-3 mb-2 tracking-widest uppercase">
            Departments
          </p>
          {visibleDepts.map((dept) => {
            const href = `/departments/${dept.id}`;
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={dept.id}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "text-white bg-white/10"
                    : "text-white/55 hover:text-white hover:bg-white/5",
                )}
              >
                {/* Colored indicator dot / icon */}
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-md shrink-0"
                  style={{ backgroundColor: isActive ? dept.color : `${dept.color}22` }}
                >
                  <dept.icon
                    className="h-3 w-3"
                    style={{ color: isActive ? "#fff" : dept.color }}
                  />
                </span>
                <span className="truncate text-xs">{dept.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Quick Actions */}
      <div className="px-3 pb-2 border-t border-white/10 pt-3">
        <p className="text-[9px] font-bold text-white/25 px-3 mb-1.5 tracking-widest uppercase">
          Quick Actions
        </p>
        {visibleQuickActions.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/45 hover:text-white hover:bg-white/5 transition-all"
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      {/* User info + preferences */}
      <div className="px-4 py-3 border-t border-white/10">
        <Link
          href="/settings/preferences"
          className="flex items-center gap-1.5 text-white/35 hover:text-white/60 text-[10px] mb-2 transition-colors"
        >
          <Settings className="h-3 w-3" />
          My Preferences
        </Link>
        <div className="text-white/70 text-xs font-medium truncate">
          {session?.user?.name}
        </div>
        <div className="text-white/40 text-xs">{session?.user?.role}</div>
      </div>
    </div>
  );
}
