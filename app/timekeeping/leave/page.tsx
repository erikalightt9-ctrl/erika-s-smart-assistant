"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// ─── Leave type metadata ──────────────────────────────────────────────────────

const STATUTORY_LEAVES = [
  { value: "SIL",                   label: "Service Incentive Leave (SIL)" },
  { value: "MATERNITY",             label: "Maternity Leave" },
  { value: "PATERNITY",             label: "Paternity Leave" },
  { value: "SOLO_PARENT",           label: "Solo Parent Leave" },
  { value: "SPECIAL_LEAVE_FOR_WOMEN", label: "Special Leave for Women" },
  { value: "VAWC",                  label: "VAWC Leave" },
  { value: "REHABILITATION",        label: "Rehabilitation Leave" },
] as const;

const COMPANY_LEAVES = [
  { value: "SICK",        label: "Sick Leave (SL)" },
  { value: "VACATION",    label: "Vacation Leave (VL)" },
  { value: "BEREAVEMENT", label: "Bereavement / Compassionate Leave" },
  { value: "EMERGENCY",   label: "Emergency / Calamity Leave" },
  { value: "STUDY",       label: "Study Leave" },
  { value: "BIRTHDAY",    label: "Birthday Leave" },
  { value: "CTO",         label: "Compensatory Time Off (CTO)" },
] as const;

const ALL_LEAVE_TYPES = [...STATUTORY_LEAVES, ...COMPANY_LEAVES];

function leaveLabel(value: string) {
  return ALL_LEAVE_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z
  .object({
    leaveType: z.string().min(1, "Please select a leave type"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().min(10, "Please provide at least 10 characters"),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

// ─── Leave status badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:  "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leaveType: "", startDate: "", endDate: "", reason: "" },
  });

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/timekeeping/leave");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data ?? []);
      }
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/timekeeping/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      form.reset();
      setSubmitted(true);
      await fetchRequests();
      setTimeout(() => setSubmitted(false), 3000);
    } else {
      const data = await res.json();
      form.setError("root", { message: data.error ?? "Failed to submit request." });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/timekeeping">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Leave Request
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* ── Form ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">File a Leave Request</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* Leave Type */}
                <FormField
                  control={form.control}
                  name="leaveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select leave type…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                              Statutory Leaves (Philippines)
                            </SelectLabel>
                            {STATUTORY_LEAVES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5 mt-1">
                              Company-Provided Leaves
                            </SelectLabel>
                            {COMPANY_LEAVES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reason */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Briefly describe the reason for your leave…"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                )}

                {submitted && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Leave request submitted successfully.
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                  style={{ backgroundColor: "var(--navy)", color: "white" }}
                >
                  {form.formState.isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
                  ) : (
                    "Submit Leave Request"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── Leave type reference ── */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                Statutory Leaves (Philippines)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1.5">
                {STATUTORY_LEAVES.map((t) => (
                  <li key={t.value} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    {t.label}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                Company-Provided Leaves
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1.5">
                {COMPANY_LEAVES.map((t) => (
                  <li key={t.value} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    {t.label}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── My leave requests ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRequests ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No leave requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Start</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">End</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Reason</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {leaveLabel(r.leaveType)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.startDate).toLocaleDateString("en-PH")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.endDate).toLocaleDateString("en-PH")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
