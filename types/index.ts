import type { Role, Subsidiary } from "@prisma/client";

export type { Role, Subsidiary };

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

// Extend next-auth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      subsidiary: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    subsidiary: string | null;
  }
}

export interface DTREntry {
  date: string;
  dayOfWeek: string;
  timeIn?: string;
  timeOut?: string;
  totalHours?: number;
  overtime?: number;
  remarks?: string;
}

export interface ContributionBreakdown {
  type: "SSS" | "PhilHealth" | "Pag-IBIG";
  monthlySalary: number;
  employeeShare: number;
  employerShare: number;
  total: number;
}

export interface BillingLineItemInput {
  transactionDate?: string;
  description: string;
  amount: number;
  subsidiary?: Subsidiary;
  category?: string;
  notes?: string;
}
