"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard, Upload, Loader2, CheckCircle, Clock, Eye, FileText
} from "lucide-react";
import { formatCurrency, formatShortDate, subsidiaryLabel } from "@/lib/utils";
import Link from "next/link";

interface Statement {
  id: string;
  fileName: string;
  status: string;
  createdAt: string;
  totalAmount: number | null;
  bankName: string | null;
  cardLast4: string | null;
  _count: { lineItems: number };
}

const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "bg-yellow-500",
  REVIEW: "bg-blue-500",
  FINALIZED: "bg-green-500",
};

const SUBSIDIARIES = [
  { value: "HOLDING_GDS_CAPITAL", label: "GDS Capital" },
  { value: "BUSINESS_MGMT_CONSULTANCY", label: "Business Mgmt & Consultancy" },
  { value: "MEDIA_ADVERTISING", label: "Media & Advertising" },
  { value: "EVENTS_IT", label: "Events & IT" },
  { value: "TRAVEL_AGENCY", label: "Travel Agency" },
  { value: "VIRTUAL_PHYSICAL_OFFICE", label: "Virtual & Physical Office" },
  { value: "EV_CHARGERS", label: "EV Chargers" },
];

export default function BillingPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchStatements = useCallback(async () => {
    const res = await fetch("/api/billing");
    if (res.ok) {
      const data = await res.json();
      setStatements(data.data ?? []);
    }
  }, []);

  useEffect(() => { fetchStatements(); }, [fetchStatements]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg("Uploading and processing with Claude AI…");
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/billing/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        setUploadMsg(`✓ Extracted ${data.data.itemCount} line items. Ready for review.`);
        await fetchStatements();
      } else {
        setUploadMsg(`Error: ${data.error}`);
      }
    } catch {
      setUploadMsg("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          AI Financial Account Overview
        </h1>
      </div>

      {/* Upload zone */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Upload Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={onFileChange}
              className="hidden"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">{uploadMsg}</p>
                <p className="text-xs text-muted-foreground">Claude AI is reading your statement…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop your statement here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports JPEG, PNG, WebP, PDF — up to 10MB
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Powered by Claude AI
                </Badge>
              </div>
            )}
          </div>

          {uploadMsg && !uploading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {uploadMsg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subsidiaries reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">GDS Capital Subsidiaries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SUBSIDIARIES.map((s) => (
              <Badge key={s.value} variant="outline" className="text-xs">
                {s.label}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Claude AI will auto-tag each transaction to the most likely subsidiary.
            You can review and correct tags before finalizing.
          </p>
        </CardContent>
      </Card>

      {/* Statement history */}
      {statements.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Statement History</h2>
          <div className="space-y-3">
            {statements.map((stmt) => (
              <Card key={stmt.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{stmt.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {stmt.bankName ?? "Bank"} {stmt.cardLast4 ? `••••${stmt.cardLast4}` : ""} •{" "}
                          {formatShortDate(stmt.createdAt)} •{" "}
                          {stmt._count.lineItems} items
                          {stmt.totalAmount != null && ` • ${formatCurrency(stmt.totalAmount)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {stmt.status === "PROCESSING" && <Clock className="h-3 w-3 text-yellow-500" />}
                        {stmt.status === "FINALIZED" && <CheckCircle className="h-3 w-3 text-green-500" />}
                        <Badge
                          className={`text-xs text-white ${STATUS_COLORS[stmt.status] ?? "bg-gray-500"}`}
                        >
                          {stmt.status}
                        </Badge>
                      </div>
                      <Link href={`/billing/${stmt.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye className="h-4 w-4" />
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {statements.length === 0 && !uploading && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No statements uploaded yet. Upload your first credit card statement above.
        </div>
      )}
    </div>
  );
}
