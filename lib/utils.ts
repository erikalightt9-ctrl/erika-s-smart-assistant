import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function getMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long" });
}

export function subsidiaryLabel(key: string): string {
  const labels: Record<string, string> = {
    HOLDING_GDS_CAPITAL: "GDS Capital",
    BUSINESS_MGMT_CONSULTANCY: "Business Mgmt & Consultancy",
    MEDIA_ADVERTISING: "Media & Advertising",
    EVENTS_IT: "Events & IT",
    TRAVEL_AGENCY: "Travel Agency",
    VIRTUAL_PHYSICAL_OFFICE: "Virtual & Physical Office",
    EV_CHARGERS: "EV Chargers",
  };
  return labels[key] ?? key;
}

export function toISODateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
