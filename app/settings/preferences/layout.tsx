import { AppShell } from "@/components/layout/AppShell";

export default function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
