"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, CheckCircle, FileUp, Loader2, Send, Users, X,
} from "lucide-react";
import Link from "next/link";

// Maps Prisma Subsidiary enum keys → actual GDS Capital company names
const SUBSIDIARY_OPTIONS = [
  { value: "HOLDING_GDS_CAPITAL",       label: "GDS Capital Inc." },
  { value: "MEDIA_ADVERTISING",         label: "Philippine Dragon Media Network Corp" },
  { value: "VIRTUAL_PHYSICAL_OFFICE",   label: "GDS Payment Solutions Inc." },
  { value: "TRAVEL_AGENCY",             label: "GDS International Travel Agency Inc." },
  { value: "BUSINESS_MGMT_CONSULTANCY", label: "Starlight Business Consulting Services Inc." },
  { value: "EVENTS_IT",                 label: "Supernova Innovation Inc." },
  { value: "EV_CHARGERS",              label: "DragonAI Media Inc." },
] as const;

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
  const { data: session } = useSession();
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
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryEmail, setSignatoryEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<"send" | "draft">("draft");
  const [error, setError] = useState("");

  // ── Recipients (for Select Recipient dropdown) ────────────────────────────
  const [recipients, setRecipients] = useState<{ id: string; name: string; email: string }[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // ── Auto-populate sender from logged-in user ──────────────────────────────
  useEffect(() => {
    if (session?.user?.name) setSenderName(session.user.name);
  }, [session]);

  // ── Fetch recipients list on mount ────────────────────────────────────────
  useEffect(() => {
    setLoadingRecipients(true);
    fetch("/api/users/recipients")
      .then((r) => r.json())
      .then((data) => { if (data.success) setRecipients(data.data); })
      .catch(() => {})
      .finally(() => setLoadingRecipients(false));
  }, []);

  const handleRecipientChange = (id: string) => {
    setRecipientId(id);
    const user = recipients.find((u) => u.id === id);
    if (user) { setSignatoryName(user.name); setSignatoryEmail(user.email); }
  };

  const clearRecipient = () => {
    setRecipientId(""); setSignatoryName(""); setSignatoryEmail("");
  };

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
        // ✅ Fix #1: store data.data (not data) — upload API wraps result in { success, data }
        setUploadedFile(data.data);
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
  const handleSubmit = async (action: "send" | "draft") => {
    if (!uploadedFile) { setError("No file uploaded. Please go back and upload a file."); return; }
    if (!title.trim()) { setError("Document title is required."); return; }
    if (!purpose.trim()) { setError("Purpose / description is required."); return; }
    if (action === "send" && !signatoryEmail.trim()) {
      setError("Please select a recipient or enter a signatory email to send the document.");
      return;
    }

    // Set action BEFORE submitting so the correct button shows its spinner
    setSubmitAction(action);
    setSubmitting(true);
    setError("");

    try {
      const isSending = action === "send" && !!signatoryEmail.trim();

      const body: Record<string, unknown> = {
        filePath:        uploadedFile.filePath,
        fileName:        uploadedFile.fileName,
        fileSize:        uploadedFile.fileSize,
        mimeType:        uploadedFile.mimeType,
        title:           title.trim(),
        purpose:         purpose.trim(),
        senderName:      senderName.trim() || "",
        department:      department.trim() || "",
        fromSubsidiary:  subsidiary || undefined,
        priority,
        dueDate:         dueDate || undefined,
        notes:           notes.trim() || undefined,
        requiresESignature: isSending,
        submitForReview: isSending,
        ...(isSending ? { signatoryName: signatoryName.trim(), signatoryEmail: signatoryEmail.trim() } : {}),
      };

      const res = await fetch("/api/documents", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.success) { setError(data.error ?? "Failed to create document."); return; }

      const docId = data.data.id;

      // If sending, trigger the sign-link generation + email dispatch
      if (isSending) {
        await fetch(`/api/documents/${docId}/submit`, { method: "POST" });
      }

      router.push(`/documents/${docId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isStep2Valid = !!uploadedFile && title.trim().length > 0 && purpose.trim().length > 0;
  const isReadyToSend = isStep2Valid && signatoryEmail.trim().length > 0;

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
        <div className="space-y-4">
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
                <Label htmlFor="title">Document Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  placeholder="e.g. Service Agreement — Events IT Q1 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose / Description <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="senderName">
                    Sender / From
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(auto-filled)</span>
                  </Label>
                  <Input
                    id="senderName"
                    placeholder="Your name"
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
                  <Label>Subsidiary</Label>
                  <Select
                    value={subsidiary}
                    onValueChange={setSubsidiary}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subsidiary…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSIDIARY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URGENT">🔴 Urgent</SelectItem>
                      <SelectItem value="IMPORTANT">🟠 Important</SelectItem>
                      <SelectItem value="IMPORTANT_NOT_URGENT">🟡 Important but not Urgent</SelectItem>
                      <SelectItem value="NORMAL">⚪ Normal</SelectItem>
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

          {/* Select Recipient */}
          <Card className={`transition-colors ${signatoryEmail ? "border-violet-300 bg-violet-50/50" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-600" />
                Select Recipient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground -mt-1">
                Who needs to sign this document? They will receive a secure signing link by email.
              </p>

              {/* Dropdown from system users */}
              <Select
                value={recipientId}
                onValueChange={handleRecipientChange}
                disabled={loadingRecipients}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingRecipients ? "Loading users…" : "Select from system users…"} />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected recipient chip */}
              {recipientId && (
                <div className="flex items-center gap-2 text-sm bg-violet-100 text-violet-800 rounded-md px-3 py-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{signatoryName} · {signatoryEmail}</span>
                  <button type="button" onClick={clearRecipient} className="shrink-0 hover:text-violet-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Manual entry fallback */}
              {!recipientId && (
                <div className="pt-2 space-y-3 border-t">
                  <p className="text-xs text-muted-foreground">Or enter recipient manually:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="signatoryName" className="text-xs">Name</Label>
                      <Input
                        id="signatoryName"
                        placeholder="Full name"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="signatoryEmail" className="text-xs">Email</Label>
                      <Input
                        id="signatoryEmail"
                        type="email"
                        placeholder="email@company.com"
                        value={signatoryEmail}
                        onChange={(e) => setSignatoryEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {signatoryEmail && (
                <div className="text-xs text-violet-700 bg-violet-100 rounded-md px-3 py-2">
                  ✦ A secure signing link will be emailed to <strong>{signatoryEmail}</strong> when you click &ldquo;Send Document&rdquo;.
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="flex flex-col sm:flex-row gap-3 pb-4">
            {/* Send Document — primary CTA (requires recipient) */}
            <Button
              type="button"
              onClick={() => handleSubmit("send")}
              disabled={submitting || !isReadyToSend}
              className="flex-1 gap-2 h-11 font-semibold"
              style={{ backgroundColor: "#0a1628", color: "white" }}
            >
              {submitting && submitAction === "send" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-4 w-4" /> Send Document</>
              )}
            </Button>

            {/* Save as Draft — secondary */}
            <Button
              type="button"
              onClick={() => handleSubmit("draft")}
              disabled={submitting || !isStep2Valid}
              variant="outline"
              className="sm:w-40 h-11 font-semibold gap-2"
            >
              {submitting && submitAction === "draft" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                "Save as Draft"
              )}
            </Button>

            <Link href="/documents">
              <Button type="button" variant="ghost" className="h-11 px-5">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
