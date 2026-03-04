import { AppShell } from "@/components/layout/AppShell";

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
