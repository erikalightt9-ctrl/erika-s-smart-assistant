"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Moon, Sun, LogOut, Bell, Settings, User, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/search/CommandPalette";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const isFeaturesActive =
    pathname === "/features" || pathname.startsWith("/features/");

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 gap-3">
      {/* Left: Search + Features nav */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <CommandPalette />
        <Link
          href="/features"
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0",
            isFeaturesActive
              ? "text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          style={
            isFeaturesActive
              ? { backgroundColor: "#0a1628", color: "#c9a227" }
              : {}
          }
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          System Features
        </Link>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: "#c9a227", color: "#0a1628" }}
              >
                {session?.user?.name?.[0] ?? "?"}
              </div>
              <span className="text-sm font-medium hidden sm:block">
                {session?.user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {session?.user?.email}
              </p>
              <p
                className="text-[10px] font-semibold mt-1"
                style={{ color: "#c9a227" }}
              >
                {session?.user?.role}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings/preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                My Preferences
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/assistant" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                AI Assistant
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
