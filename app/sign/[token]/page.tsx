"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle, CheckCircle, Download, FileUp, Loader2, PenLine, X,
} from "lucide-react";
import { formatAuditDateTime } from "@/lib/utils";

interface DocInfo {
  id: string;
  title: string;
  purpose: string;
  senderName: string;
  department: string;
  fileName: string;
  mimeType: string;
  signatoryName: string;
  signatoryEmail: string;
  signatureRequestSentAt: string | null;
}

const ALLOWED_SIGNED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  // ── Document loading ───────────────────────────────────────────────────────
  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ── Signed file upload state ───────────────────────────────────────────────
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Submission ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [signed, setSigned] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      const callbackUrl = encodeURIComponent(`/sign/${token}`);
      router.push(`/?callbackUrl=${callbackUrl}`);
    }
  }, [authStatus, token, router]);

  // ── Load document info ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || authStatus !== "authenticated") return;
    fetch(`/api/sign/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.document) {
          setDoc(data.document);
        } else {
          setLoadError(data.error ?? "This signing link is invalid or has been used.");
        }
      })
      .catch(() => setLoadError("Failed to load the document. Please try again."))
      .finally(() => setLoading(false));
  }, [token, authStatus]);

  // ── Verify logged-in user matches the intended signatory ──────────────────
  useEffect(() => {
    if (!session || !doc) return;
    if (session.user.email?.toLowerCase() !== doc.signatoryEmail?.toLowerCase()) {
      setLoadError(
        `This signing link is intended for ${doc.signatoryEmail}. ` +
        `You are currently logged in as ${session.user.email}. ` +
        `Please log in with the correct account.`
      );
    }
  }, [session, doc]);

  // ── File drop/select helpers ───────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!ALLOWED_SIGNED_TYPES.includes(file.type)) {
      setSubmitError("Only PDF, Word (.doc/.docx), or image files are accepted.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setSubmitError("File size must be 20 MB or less.");
      return;
    }
    setSubmitError("");
    setSignedFile(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Submit signed document ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!doc || !token || !signedFile) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const fd = new FormData();
      fd.append("signatoryName",  doc.signatoryName);
      fd.append("signatoryEmail", doc.signatoryEmail);
      fd.append("file", signedFile, signedFile.name);

      const res = await fetch(`/api/sign/${token}`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setSigned(true);
      } else {
        setSubmitError(data.error ?? "Submission failed. Please try again.");
      }
    } catch {
      setSubmitError("Something went wrong. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fileUrl = `/api/sign/${token}/file`;
  const isPDF = doc?.mimeType === "application/pdf";

  // ── Auth loading / redirecting ─────────────────────────────────────────────
  if (authStatus === "loading" || authStatus === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Checking authentication…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading document…
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-10 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Link Invalid or Unavailable</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <p className="text-xs text-muted-foreground mt-3">
            This link may have already been used or was manually invalidated. Contact the sender for assistance.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (signed) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Document Submitted!</h2>
          <p className="text-sm text-green-700">
            Thank you, <strong>{doc?.signatoryName}</strong>. Your signed document has been received.
          </p>
          <p className="text-xs text-green-600 mt-3 max-w-sm mx-auto">
            The document has been routed back for review and approval.
            A confirmation has been sent to <strong>{doc?.signatoryEmail}</strong>.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Main signing UI ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Document Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-4 w-4 text-violet-600" />
            Signature Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs block mb-0.5">Document</span>
              <span className="font-semibold">{doc?.title}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-0.5">From</span>
              <span>{doc?.senderName || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-0.5">Purpose</span>
              <span className="text-gray-700">{doc?.purpose}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-0.5">Signing As</span>
              <span className="font-medium">{doc?.signatoryName}</span>
              <span className="text-muted-foreground text-xs block">{doc?.signatoryEmail}</span>
            </div>
            {doc?.signatureRequestSentAt && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs block mb-0.5">Request Sent</span>
                <span className="text-xs font-medium text-slate-600">
                  {formatAuditDateTime(doc.signatureRequestSentAt)}
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 text-xs bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-amber-800">
            ⚠ Please download the document, sign it, then upload the signed copy below.
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Download & Preview */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0a1628] text-white text-xs font-bold">1</span>
            Download &amp; Review Document
          </CardTitle>
          <a
            href={fileUrl}
            download={doc?.fileName}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: "#0a1628" }}
          >
            <Download className="h-3.5 w-3.5" />
            Download {doc?.fileName}
          </a>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden rounded-b-xl">
          {isPDF ? (
            <iframe
              src={fileUrl}
              className="w-full"
              style={{ height: "500px", border: "none" }}
              title="Document Preview"
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-gray-50">
              <Download className="h-10 w-10 mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium">Preview not available for this file type</p>
              <a
                href={fileUrl}
                download={doc?.fileName}
                className="text-blue-600 underline text-sm mt-2 inline-block"
              >
                Download {doc?.fileName} to review
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Upload Signed Document */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0a1628] text-white text-xs font-bold">2</span>
            Upload Signed Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sign the document using your preferred tool (e.g., Adobe Acrobat, Preview, or printed &amp; scanned), then upload it here.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
            style={{
              borderColor: dragOver ? "#0a1628" : signedFile ? "#16a34a" : "#d1d5db",
              backgroundColor: dragOver ? "#f8fafc" : signedFile ? "#f0fdf4" : "transparent",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {signedFile ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-green-800">{signedFile.name}</p>
                  <p className="text-xs text-green-600">{(signedFile.size / 1024).toFixed(1)} KB · Click to replace</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSignedFile(null); }}
                  className="ml-auto p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <FileUp className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Drag &amp; drop or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, JPG, PNG — max 20 MB</p>
              </div>
            )}
          </div>

          {submitError && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!signedFile || submitting}
            className="w-full gap-2 h-11"
            style={signedFile ? { backgroundColor: "#0a1628", color: "white" } : {}}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              <><CheckCircle className="h-4 w-4" /> Submit Signed Document</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            By submitting, you confirm that the uploaded document contains your authorised signature
            and represents your agreement to the document&apos;s contents.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
