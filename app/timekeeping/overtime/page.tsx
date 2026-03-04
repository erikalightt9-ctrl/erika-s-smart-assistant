"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Clock, Loader2, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  hoursRequested: z
    .string()
    .min(1, "Hours are required")
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0.5,
      "Minimum 0.5 hours",
    )
    .refine((v) => parseFloat(v) <= 12, "Maximum 12 hours per request"),
  reason: z.string().min(10, "Please provide at least 10 characters"),
});

type FormValues = z.infer<typeof schema>;

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:  "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Overtime rules reference ─────────────────────────────────────────────────

const OVERTIME_RULES = [
  { label: "Ordinary day overtime", rate: "+25% of hourly rate" },
  { label: "Rest day / Special holiday OT", rate: "+30% of hourly rate" },
  { label: "Regular holiday overtime", rate: "+30% of daily rate (200%)" },
  { label: "Maximum hours per day", rate: "Up to 12 hrs/day" },
  { label: "Prior approval required", rate: "File before the date" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface OvertimeRequest {
  id: string;
  date: string;
  hoursRequested: string | number;
  reason: string;
  status: string;
  createdAt: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OvertimePage() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Default date to today (PH timezone)
  const todayPH = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayPH,
      hoursRequested: "",
      reason: "",
    },
  });

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/timekeeping/overtime");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data ?? []);
      }
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/timekeeping/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        hoursRequested: parseFloat(values.hoursRequested),
      }),
    });

    if (res.ok) {
      form.reset({ date: todayPH, hoursRequested: "", reason: "" });
      setSubmitted(true);
      await fetchRequests();
      setTimeout(() => setSubmitted(false), 3000);
    } else {
      const data = await res.json();
      form.setError("root", {
        message: data.error ?? "Failed to submit request.",
      });
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
          <Clock className="h-6 w-6" />
          Overtime Request
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* ── Form ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">File an Overtime Request</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overtime Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hours */}
                <FormField
                  control={form.control}
                  name="hoursRequested"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Requested</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="12"
                          placeholder="e.g. 2.5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reason */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason / Work Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the work to be done during overtime…"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                )}

                {submitted && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Overtime request submitted successfully.
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                  style={{ backgroundColor: "var(--navy)", color: "white" }}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting…
                    </>
                  ) : (
                    "Submit Overtime Request"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── Reference card ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4" />
              Overtime Pay Reference (DOLE)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {OVERTIME_RULES.map((rule) => (
                <li
                  key={rule.label}
                  className="flex items-start justify-between gap-4 text-sm py-2 border-b last:border-0"
                  style={{ borderColor: "#f1f5f9" }}
                >
                  <span className="text-muted-foreground leading-snug">{rule.label}</span>
                  <span
                    className="font-semibold text-right shrink-0 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}
                  >
                    {rule.rate}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Overtime pay is computed per the Philippine Labor Code (Art. 87).
              Approval is required before rendering overtime work.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── My overtime requests ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Overtime Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRequests ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No overtime requests yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Hours
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Reason
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Filed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString("en-PH", {
                          timeZone: "UTC",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="font-semibold px-2 py-0.5 rounded-full text-xs"
                          style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}
                        >
                          {Number(r.hoursRequested).toFixed(1)} hrs
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {new Date(r.createdAt).toLocaleDateString("en-PH")}
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
