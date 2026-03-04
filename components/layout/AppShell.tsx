"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ChatPanel } from "@/components/ai/ChatPanel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col">
        <Sidebar />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </div>

      {/* Floating AI chat panel */}
      <ChatPanel />
    </div>
  );
}
