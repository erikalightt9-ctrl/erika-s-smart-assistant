"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, CheckCircle, FileUp, Loader2, PenLine, X,
} from "lucide-react";
import Link from "next/link";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_MB = 20;

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function NewDocumentPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1: File Upload ────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{
    filePath: string; fileName: string; fileSize: number; mimeType: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 2: Details Form ──────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [senderName, setSenderName] = useState("");
  const [department, setDepartment] = useState("");
  const [subsidiary, setSubsidiary] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [requiresESignature, setRequiresESignature] = useState(false);
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryEmail, setSignatoryEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    setUploadError("");
    if (!ALLOWED_TYPES.includes(f.type)) {
      setUploadError("File type not allowed. Use PDF, JPG, PNG, DOC, DOCX, XLS, or XLSX.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    // Pre-fill title from filename
    const nameWithoutExt = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    setTitle((prev) => prev || nameWithoutExt);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadedFile(data);
        setStep(2);
      } else {
        setUploadError(data.error ?? "Upload failed. Please try again.");
      }
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Submit document ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile || !title.trim() || !purpose.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        ...uploadedFile,
        title: title.trim(),
        purpose: purpose.trim(),
        senderName: senderName.trim() || undefined,
        department: department.trim() || undefined,
        subsidiary: subsidiary.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        requiresESignature,
      };
      if (requiresESignature) {
        body.signatoryName = signatoryName.trim();
        body.signatoryEmail = signatoryEmail.trim();
      }
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/documents/${data.document.id}`);
      } else {
        setError(data.error ?? "Failed to create document.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isStep2Valid =
    title.trim() &&
    purpose.trim() &&
    (!requiresESignature || (signatoryName.trim() && signatoryEmail.trim()));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Submit Document</h1>
          <p className="text-sm text-muted-foreground">
            Step {step} of 2 — {step === 1 ? "Upload File" : "Document Details"}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3">
        {([1, 2] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            {s > 1 && <div className="h-px w-8 bg-gray-200 shrink-0" />}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > s
                  ? "bg-green-500 text-white"
                  : step === s
                  ? "text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
              style={step === s ? { backgroundColor: "var(--navy)" } : {}}
            >
              {step > s ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            <span
              className={`text-xs font-medium ${
                step === s ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s === 1 ? "Upload File" : "Details"}
            </span>
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Upload ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !file && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver
                  ? "border-blue-400 bg-blue-50"
                  : file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              {file ? (
                <div className="space-y-2">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                  <p className="font-semibold text-sm text-green-800">{file.name}</p>
                  <p className="text-xs text-green-600">{formatSize(file.size)}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); }}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto mt-1"
                  >
                    <X className="h-3 w-3" /> Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileUp className="h-10 w-10 text-gray-300 mx-auto" />
                  <p className="font-medium text-sm text-gray-600">
                    Drop your file here or{" "}
                    <span className="underline text-blue-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Max {MAX_MB} MB
                  </p>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {uploadError}
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full gap-2"
              style={{ backgroundColor: "var(--navy)", color: "white" }}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              ) : (
                <><ArrowRight className="h-4 w-4" /> Continue to Details</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 2: Details ────────────────────────────────────────────────── */}
      {step === 2 && uploadedFile && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Uploaded file summary */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 truncate">{uploadedFile.fileName}</p>
                <p className="text-xs text-green-600">{formatSize(uploadedFile.fileSize)} · Uploaded successfully</p>
              </div>
              <button
                type="button"
                onClick={() => { setStep(1); setUploadedFile(null); }}
                className="text-xs text-green-700 underline shrink-0 hover:text-green-900"
              >
                Change file
              </button>
            </CardContent>
          </Card>

          {/* Document Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Service Agreement — Events IT Q1 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose / Description *</Label>
                <Textarea
                  id="purpose"
                  placeholder="What is this document for? What action is needed?"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender / From</Label>
                  <Input
                    id="senderName"
                    placeholder="Company or person name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g. Finance, HR, Legal"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subsidiary">Subsidiary</Label>
                  <Input
                    id="subsidiary"
                    placeholder="e.g. Events IT, GDS Capital"
                    value={subsidiary}
                    onChange={(e) => setSubsidiary(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="URGENT">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes for Reviewer</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or context for the reviewer…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* E-Signature Toggle */}
          <Card
            className={`transition-colors ${
              requiresESignature ? "border-violet-300 bg-violet-50/50" : ""
            }`}
          >
            <CardContent className="p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={requiresESignature}
                  onClick={() => setRequiresESignature(!requiresESignature)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    requiresESignature ? "bg-violet-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      requiresESignature ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <div>
                  <div className="font-medium text-sm flex items-center gap-1.5">
                    <PenLine className="h-4 w-4 text-violet-600" />
                    Requires E-Signature
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Send a secure signing link to the signatory via email
                  </div>
                </div>
              </label>

              {requiresESignature && (
                <div className="pt-2 space-y-3 border-t border-violet-200">
                  <div className="space-y-2">
                    <Label htmlFor="signatoryName">Signatory Name *</Label>
                    <Input
                      id="signatoryName"
                      placeholder="Full name of the signatory"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      required={requiresESignature}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signatoryEmail">Signatory Email *</Label>
                    <Input
                      id="signatoryEmail"
                      type="email"
                      placeholder="signatory@company.com"
                      value={signatoryEmail}
                      onChange={(e) => setSignatoryEmail(e.target.value)}
                      required={requiresESignature}
                    />
                  </div>
                  <div className="text-xs text-violet-700 bg-violet-100 rounded-md px-3 py-2">
                    ✦ A secure email with a signing link will be sent automatically once this document
                    is submitted for review.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pb-4">
            <Button
              type="submit"
              disabled={submitting || !isStep2Valid}
              className="flex-1 gap-2"
              style={{ backgroundColor: "var(--navy)", color: "white" }}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                "Save as Draft"
              )}
            </Button>
            <Link href="/documents">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
