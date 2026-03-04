"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Upload, FileSpreadsheet,
  CheckCircle2, XCircle, AlertCircle, Loader2, X, Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBSIDIARY_OPTIONS: Record<string, string> = {
  HOLDING_GDS_CAPITAL:       "GDS Capital Inc.",
  MEDIA_ADVERTISING:         "Philippine Dragon Media Network Corp",
  VIRTUAL_PHYSICAL_OFFICE:   "GDS Payment Solutions Inc.",
  TRAVEL_AGENCY:             "GDS International Travel Agency Inc.",
  BUSINESS_MGMT_CONSULTANCY: "Starlight Business Consulting Services Inc.",
  EVENTS_IT:                 "Supernova Innovation Inc.",
  EV_CHARGERS:               "DragonAI Media Inc.",
};

const CSV_HEADERS = ["Full Name", "Email", "Role", "Company", "Department", "Position"];
const VALID_ROLES = ["ADMIN", "EXEC", "STAFF"];
const VALID_SUBS  = Object.keys(SUBSIDIARY_OPTIONS);
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum:     number;
  name:       string;
  email:      string;
  role:       string;
  subsidiary: string;
  department: string;
  position:   string;
  errors:     string[];
}

interface ImportResult {
  imported: number;
  failed:   number;
  failures: { row: number; email: string; name: string; error: string }[];
}

// ── CSV Parser ────────────────────────────────────────────────────────────────
// Simple RFC 4180-compatible CSV parser (handles quoted fields with commas)
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  const rows = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  for (const raw of rows) {
    if (!raw.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQ = false;

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') {
        if (inQ && raw[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cells.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    lines.push(cells);
  }
  return lines;
}

function validateRow(row: string[], rowNum: number): ParsedRow {
  const [name = "", email = "", role = "", subsidiary = "", department = "", position = ""] =
    row.map((c) => c.trim());

  const errors: string[] = [];

  if (!name)                          errors.push("Name is required");
  if (!email)                         errors.push("Email is required");
  else if (!EMAIL_RE.test(email))     errors.push("Invalid email format");

  const roleUpper = role.toUpperCase();
  if (role && !VALID_ROLES.includes(roleUpper)) {
    errors.push(`Role must be ADMIN, EXEC, or STAFF`);
  }

  const subUpper = subsidiary.toUpperCase();
  if (subsidiary && !VALID_SUBS.includes(subUpper)) {
    errors.push(`Invalid company value`);
  }

  return {
    rowNum,
    name,
    email:      email.toLowerCase(),
    role:       role ? roleUpper : "STAFF",
    subsidiary: subsidiary ? subUpper : "",
    department,
    position,
    errors,
  };
}

// ── Template CSV generator ────────────────────────────────────────────────────
function downloadTemplate() {
  const header = CSV_HEADERS.join(",");
  const sample = [
    `"Maria Santos","maria@gdscapital.com","STAFF","HOLDING_GDS_CAPITAL","Finance","Accountant"`,
    `"Juan dela Cruz","juan@gdscapital.com","EXEC","MEDIA_ADVERTISING","Management","Director"`,
    `"Ana Reyes","ana@gdscapital.com","STAFF","EVENTS_IT","IT","Developer"`,
  ].join("\n");
  const csv  = `${header}\n${sample}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "gds-user-bulk-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BulkUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows,       setRows]       = useState<ParsedRow[]>([]);
  const [fileName,   setFileName]   = useState("");
  const [dragOver,   setDragOver]   = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState("");

  // ── File processing ───────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    setParseError("");
    setResult(null);
    setRows([]);

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Please upload a .csv file.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const grid = parseCSV(text);
        if (grid.length < 2) {
          setParseError("CSV must have a header row and at least one data row.");
          return;
        }
        // Skip header row
        const parsed = grid.slice(1).map((row, idx) => validateRow(row, idx + 2));
        setRows(parsed);
      } catch {
        setParseError("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const clearFile = () => {
    setRows([]);
    setFileName("");
    setResult(null);
    setParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/users/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          users: validRows.map((r) => ({
            name:       r.name,
            email:      r.email,
            role:       r.role,
            subsidiary: r.subsidiary || undefined,
            department: r.department || undefined,
            position:   r.position   || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setParseError(data.error ?? "Import failed. Please try again.");
      }
    } catch {
      setParseError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const validCount   = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.filter((r) => r.errors.length > 0).length;
  const hasRows      = rows.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Back nav ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/users"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <Link href="/users/new">
          <Button
            variant="outline"
            className="gap-2 text-sm h-9"
            style={{ borderColor: "#0a1628", color: "#0a1628" }}
          >
            <Users className="h-3.5 w-3.5" />
            Manual Registration
          </Button>
        </Link>
      </div>

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Bulk User Upload</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Import multiple users at once by uploading a CSV file.
        </p>
      </div>

      {/* ── Result banner (shown after import) ── */}
      {result && (
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{
            backgroundColor: result.failed === 0 ? "#f0fdf4" : "#fffbeb",
            borderColor:     result.failed === 0 ? "#86efac" : "#fcd34d",
          }}
        >
          <div className="flex items-center gap-2">
            {result.failed === 0
              ? <CheckCircle2 className="h-5 w-5 text-green-600" />
              : <AlertCircle  className="h-5 w-5 text-amber-600" />}
            <p className="font-semibold text-sm" style={{ color: result.failed === 0 ? "#16a34a" : "#d97706" }}>
              Import Complete — {result.imported} user{result.imported !== 1 ? "s" : ""} registered
              {result.failed > 0 && `, ${result.failed} failed`}
            </p>
          </div>
          {result.failures.length > 0 && (
            <div className="space-y-1">
              {result.failures.map((f) => (
                <p key={f.row} className="text-xs text-amber-800">
                  Row {f.row} — <strong>{f.email || f.name}</strong>: {f.error}
                </p>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => router.push("/users")}
              className="gap-2 h-9 text-sm font-semibold"
              style={{ backgroundColor: "#0a1628", color: "white" }}
            >
              <Users className="h-4 w-4" />
              View All Users
            </Button>
            <Button variant="outline" onClick={clearFile} className="h-9 text-sm">
              Upload Another File
            </Button>
          </div>
        </div>
      )}

      {!result && (
        <>
          {/* ── Instructions card ── */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
          >
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "#0a1628" }} />
              <div className="space-y-2 flex-1">
                <p className="font-semibold text-sm" style={{ color: "#0f172a" }}>
                  CSV Format Requirements
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { col: "Full Name",  req: true,  note: "Employee full name" },
                    { col: "Email",      req: true,  note: "Work email address" },
                    { col: "Role",       req: false, note: "ADMIN, EXEC, or STAFF (default: STAFF)" },
                    { col: "Company",    req: false, note: "Subsidiary enum value" },
                    { col: "Department", req: false, note: "e.g. Finance, HR, IT" },
                    { col: "Position",   req: false, note: "e.g. Accountant, Manager" },
                  ].map((c) => (
                    <div key={c.col} className="bg-white rounded-lg border p-2.5" style={{ borderColor: "#e2e8f0" }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: "#0f172a" }}>{c.col}</span>
                        {c.req
                          ? <span className="text-[10px] bg-red-100 text-red-600 rounded px-1 font-semibold">required</span>
                          : <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1">optional</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{c.note}</p>
                    </div>
                  ))}
                </div>

                {/* Company reference */}
                <details className="mt-1">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                    View valid Company values ▸
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(SUBSIDIARY_OPTIONS).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-[10px] bg-white border rounded px-2 py-0.5"
                        style={{ borderColor: "#e2e8f0", color: "#475569" }}
                      >
                        <code className="font-mono font-bold text-[#0a1628]">{k}</code>
                        {" "}— {v}
                      </span>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="gap-2 h-9 text-sm"
              style={{ borderColor: "#0a1628", color: "#0a1628" }}
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV Template
            </Button>
          </div>

          {/* ── Upload zone ── */}
          {!hasRows ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors"
              style={{
                borderColor: dragOver ? "#0a1628" : "#cbd5e1",
                backgroundColor: dragOver ? "#f1f5f9" : "white",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-sm" style={{ color: "#0f172a" }}>
                Drop your CSV file here or <span style={{ color: "#0a1628", textDecoration: "underline" }}>browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv files · Max 200 users</p>
            </div>
          ) : (
            /* ── Preview table ── */
            <div className="space-y-4">
              {/* File header */}
              <div className="flex items-center justify-between bg-white rounded-xl border px-4 py-3" style={{ borderColor: "#e8edf3" }}>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium" style={{ color: "#0f172a" }}>{fileName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {rows.length} row{rows.length !== 1 ? "s" : ""}
                  </Badge>
                  {validCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      {validCount} valid
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 rounded-full px-2 py-0.5">
                      <XCircle className="h-3 w-3" />
                      {invalidCount} error{invalidCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <button
                  onClick={clearFile}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Parse error */}
              {parseError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  {parseError}
                </div>
              )}

              {/* Preview table */}
              <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e8edf3" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "#f1f5f9", backgroundColor: "#f8fafc" }}>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Full Name</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Email</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Role</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Company</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Dept / Position</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                      {rows.map((row) => {
                        const ok = row.errors.length === 0;
                        return (
                          <tr
                            key={row.rowNum}
                            className="transition-colors"
                            style={{ backgroundColor: ok ? "white" : "#fff5f5" }}
                          >
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.rowNum}</td>
                            <td className="px-3 py-2.5">
                              <span className={`text-sm font-medium ${!row.name ? "text-red-500 italic" : ""}`} style={{ color: row.name ? "#0f172a" : undefined }}>
                                {row.name || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-muted-foreground">{row.email || "—"}</td>
                            <td className="px-3 py-2.5">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                row.role === "ADMIN" ? "bg-blue-50 text-blue-700"
                                : row.role === "EXEC"  ? "bg-purple-50 text-purple-700"
                                : "bg-green-50 text-green-700"
                              }`}>
                                {row.role || "STAFF"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 hidden md:table-cell text-xs text-muted-foreground">
                              {row.subsidiary
                                ? SUBSIDIARY_OPTIONS[row.subsidiary] ?? row.subsidiary
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                              {[row.department, row.position].filter(Boolean).join(" · ") || "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              {ok ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                                  <CheckCircle2 className="h-3 w-3" /> Ready
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  {row.errors.map((err, i) => (
                                    <span key={i} className="flex items-start gap-1 text-xs text-red-600">
                                      <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                      {err}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl border px-4 py-3" style={{ borderColor: "#e8edf3" }}>
                <div className="text-sm text-muted-foreground">
                  {validCount > 0 ? (
                    <span>
                      <strong style={{ color: "#0f172a" }}>{validCount}</strong> user{validCount !== 1 ? "s" : ""} will be imported
                      {invalidCount > 0 && <span className="text-red-500 ml-2">· {invalidCount} row{invalidCount !== 1 ? "s" : ""} will be skipped (fix errors)</span>}
                    </span>
                  ) : (
                    <span className="text-red-500">No valid rows to import — please fix the errors above</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 h-9 text-sm"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Replace File
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || validCount === 0}
                    className="gap-2 h-9 text-sm font-semibold"
                    style={{ backgroundColor: "#0a1628", color: "white" }}
                  >
                    {importing
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
                      : <><Users className="h-3.5 w-3.5" /> Import {validCount} User{validCount !== 1 ? "s" : ""}</>
                    }
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Parse error shown in upload zone */}
          {parseError && !hasRows && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {parseError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
