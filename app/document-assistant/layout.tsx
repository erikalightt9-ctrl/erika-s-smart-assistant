import type { ReactNode } from "react";

export const metadata = {
  title: "Business Document Assistant | AILE",
};

export default function DocumentAssistantLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}
