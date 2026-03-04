"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Download, ArrowLeft, Loader2, MapPin } from "lucide-react";
import Link from "next/link";

interface LocationData {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

interface DTRRow {
  date: string;
  dayOfWeek: string;
  timeIn?: string;
  timeOut?: string;
  totalHours?: number;
  isWeekend: boolean;
  timeInLocation?: LocationData | null;
  timeOutLocation?: LocationData | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function LocationCell({ loc }: { loc?: LocationData | null }) {
  if (!loc?.latitude) {
    return <span className="text-muted-foreground/40 text-xs">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {loc.address && (
        <span
          className="text-xs leading-snug text-foreground truncate max-w-[180px]"
          title={loc.address}
        >
          {loc.address}
        </span>
      )}
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono text-muted-foreground">
          {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
        </span>
        <a
          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:underline shrink-0"
        >
          ↗
        </a>
      </div>
    </div>
  );
}

export default function DTRPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [dtr, setDtr] = useState<DTRRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  const fetchDTR = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/timekeeping/dtr?year=${year}&month=${month}`);
    if (res.ok) {
      const data = await res.json();
      setDtr(data.data ?? []);
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchDTR();
  }, [fetchDTR]);

  const workDays = dtr.filter((r) => !r.isWeekend && (r.timeIn || r.timeOut));
  const totalHours = dtr.reduce((sum, r) => sum + (r.totalHours ?? 0), 0);
  const hasAnyLocation = dtr.some(
    (r) => r.timeInLocation?.latitude || r.timeOutLocation?.latitude
  );

  function downloadCSV() {
    const headers = ["Date", "Day", "Time In", "Time Out", "Hours"];
    if (showLocation) {
      headers.push(
        "Time In Location",
        "Time In Coordinates",
        "Time Out Location",
        "Time Out Coordinates"
      );
    }
    const rows = [
      headers,
      ...dtr.map((r) => {
        const base = [
          r.date,
          r.dayOfWeek,
          formatTime(r.timeIn),
          formatTime(r.timeOut),
          r.totalHours?.toFixed(2) ?? "—",
        ];
        if (showLocation) {
          base.push(
            r.timeInLocation?.address ?? "—",
            r.timeInLocation?.latitude
              ? `${r.timeInLocation.latitude.toFixed(6)}, ${r.timeInLocation.longitude?.toFixed(6)}`
              : "—",
            r.timeOutLocation?.address ?? "—",
            r.timeOutLocation?.latitude
              ? `${r.timeOutLocation.latitude.toFixed(6)}, ${r.timeOutLocation.longitude?.toFixed(6)}`
              : "—"
          );
        }
        return base;
      }),
      ["", "", "", "TOTAL", totalHours.toFixed(2)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `DTR-${MONTHS[parseInt(month) - 1]}-${year}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/timekeeping">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Daily Time Record (DTR)
        </h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasAnyLocation && (
          <button
            onClick={() => setShowLocation((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
            style={
              showLocation
                ? { backgroundColor: "#ecfdf5", borderColor: "#16a34a", color: "#16a34a" }
                : { borderColor: "#e2e8f0", color: "#64748b" }
            }
          >
            <MapPin className="h-3.5 w-3.5" />
            {showLocation ? "Hide Location" : "Show Location"}
          </button>
        )}

        <Button variant="outline" className="gap-2" onClick={downloadCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Work Days
            </div>
            <div className="text-2xl font-bold">{workDays.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Hours
            </div>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Avg Hours/Day
            </div>
            <div className="text-2xl font-bold">
              {workDays.length > 0
                ? (totalHours / workDays.length).toFixed(1)
                : "—"}
              h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DTR Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <span>
              {MONTHS[parseInt(month) - 1]} {year}
            </span>
            {hasAnyLocation && (
              <span className="flex items-center gap-1 text-xs font-normal text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                <MapPin className="h-3 w-3" />
                Location tracking active
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b bg-muted/50 text-muted-foreground"
                  style={{ borderColor: "#e8edf3" }}
                >
                  <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Day</th>
                  <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Time In</th>
                  {showLocation && (
                    <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-green-600" />
                        In Location
                      </span>
                    </th>
                  )}
                  <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Time Out</th>
                  {showLocation && (
                    <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-red-500" />
                        Out Location
                      </span>
                    </th>
                  )}
                  <th className="text-right px-4 py-2.5 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                {dtr.map((row) => (
                  <tr
                    key={row.date}
                    className={
                      row.isWeekend
                        ? "bg-muted/30 text-muted-foreground"
                        : "hover:bg-muted/20 transition-colors"
                    }
                  >
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={row.isWeekend ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {row.dayOfWeek}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                      {formatTime(row.timeIn)}
                    </td>
                    {showLocation && (
                      <td className="px-4 py-2.5">
                        <LocationCell loc={row.timeInLocation} />
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                      {formatTime(row.timeOut)}
                    </td>
                    {showLocation && (
                      <td className="px-4 py-2.5">
                        <LocationCell loc={row.timeOutLocation} />
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right font-mono">
                      {row.totalHours != null
                        ? `${row.totalHours.toFixed(2)}h`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  className="border-t bg-muted/50 font-semibold"
                  style={{ borderColor: "#e8edf3" }}
                >
                  <td
                    colSpan={showLocation ? 6 : 4}
                    className="px-4 py-2.5 text-right"
                  >
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {totalHours.toFixed(2)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
