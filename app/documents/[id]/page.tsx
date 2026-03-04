"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, FileText, CheckCircle, XCircle, RotateCcw,
  Archive, Send, Eye, Download, PenLine, Clock, AlertCircle,
  User, Building, Calendar, Loader2, X,
} from "lucide-react";
import { formatShortDate } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  status: string;
  notes: string | null;
  actorName: string | null;
  createdAt: string;
  user: { name: string; role: string } | null;
}

interface DocDetail {
  id: string;
  title: string;
  purpose: string;
  senderName: string;
  department: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  priority: string;
  requiresESignature: boolean;
  signatoryName: string | null;
  signatoryEmail: string | null;
  rejectionReason: string | null;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  routedBy: { id: string; name: string; email: string; role: string };
  assigneeRecords: Array<{ user: { id: string; name: string; role: string } }>;
  auditLog: AuditEntry[];
  signature: {
    signatoryName: string;
    signatoryEmail: string;
    signedAt: string;
    signatureImage: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:                  { label: "Draft",               bg: "#f1f5f9", text: "#475569" },
  SUBMITTED:              { label: "Submitted",           bg: "#dbeafe", text: "#1d4ed8" },
  PENDING_REVIEW:         { label: "Pending Review",      bg: "#fef3c7", text: "#d97706" },
  PENDING_SIGNATURE:      { label: "Pending Signature",   bg: "#ede9fe", text: "#7c3aed" },
  SIGNED:                 { label: "Signed",              bg: "#d1fae5", text: "#059669" },
  APPROVED:               { label: "Approved",            bg: "#d1fae5", text: "#16a34a" },
  REJECTED:               { label: "Rejected",            bg: "#fee2e2", text: "#dc2626" },
  RETURNED_FOR_REVISION:  { label: "Returned",            bg: "#ffedd5", text: "#ea580c" },
  COMPLETED:              { label: "Completed",           bg: "#dcfce7", text: "#15803d" },
  ARCHIVED:               { label: "Archived",            bg: "#f3f4f6", text: "#6b7280" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;

  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<"reject" | "return" | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchDoc = useCallback(async () => {
    const res = await fetch(`/api/documents/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDoc(data.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  async function doAction(endpoint: string, body?: Record<string, string>) {
    setActionLoading(true);
    setError(null);
    const res = await fetch(`/api/documents/${id}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { setError(data.error ?? "Action failed"); return false; }
    await fetchDoc();
    return true;
  }

  async function handleReject() {
    if (!modalInput.trim()) { setError("Rejection reason is required"); return; }
    const ok = await doAction("reject", { reason: modalInput });
    if (ok) { setModal(null); setModalInput(""); }
  }

  async function handleReturn() {
    if (!modalInput.trim()) { setError("Please provide revision notes"); return; }
    const ok = await doAction("return", { notes: modalInput });
    if (ok) { setModal(null); setModalInput(""); }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">Loading…</div>;
  if (!doc) return <div className="text-center py-20 text-slate-500">Document not found.</div>;

  const canAdmin = ["ERIKA", "ADMIN", "EXEC"].includes(session?.user?.role ?? "");
  const isOwner = doc.routedBy.id === session?.user?.id;
  const canSubmit = (isOwner || canAdmin) && doc.status === "DRAFT";
  const canApprove = canAdmin && ["SUBMITTED", "PENDING_REVIEW", "SIGNED"].includes(doc.status);
  const canReject = canAdmin && !["REJECTED", "ARCHIVED", "COMPLETED"].includes(doc.status);
  const canReturn = canAdmin && ["SUBMITTED", "PENDING_REVIEW", "SIGNED"].includes(doc.status);
  const canArchive = canAdmin && ["COMPLETED", "REJECTED"].includes(doc.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/documents" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{doc.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{doc.purpose}</p>
          </div>
          <StatusBadge status={doc.status} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Rejection reason banner */}
      {doc.rejectionReason && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
          <strong className="block mb-1">
            {doc.status === "REJECTED" ? "Rejection Reason:" : "Revision Notes:"}
          </strong>
          {doc.rejectionReason}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Document metadata */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Document Details
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Sender</p>
                <p className="font-medium text-slate-800">{doc.senderName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Department</p>
                <p className="font-medium text-slate-800">{doc.department}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Submitted By</p>
                <p className="font-medium text-slate-800">{doc.routedBy.name}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Priority</p>
                <p className="font-medium text-slate-800">{doc.priority}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Date Submitted</p>
                <p className="font-medium text-slate-800">{formatShortDate(doc.createdAt)}</p>
              </div>
              {doc.dueDate && (
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Due Date</p>
                  <p className="font-medium text-orange-600">{formatShortDate(doc.dueDate)}</p>
                </div>
              )}
              {doc.signatoryName && (
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs mb-0.5">Intended Signatory</p>
                  <p className="font-medium text-purple-700 flex items-center gap-1.5">
                    <PenLine className="h-3.5 w-3.5" />
                    {doc.signatoryName}
                    {doc.signatoryEmail && <span className="text-slate-400 font-normal">· {doc.signatoryEmail}</span>}
                  </p>
                </div>
              )}
              {doc.notes && (
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs mb-0.5">Notes</p>
                  <p className="text-slate-700">{doc.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* File card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Attached File</h2>
            <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{doc.fileName}</p>
                  <p className="text-xs text-slate-400">{doc.mimeType}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </a>
                <a
                  href={`/api/documents/${doc.id}/file`}
                  download={doc.fileName}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ backgroundColor: "#0a1628" }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            </div>
          </div>

          {/* Signature info */}
          {doc.signature && (
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <h2 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                E-Signature Completed
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Signed By</p>
                  <p className="font-semibold text-slate-800">{doc.signature.signatoryName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Signed At</p>
                  <p className="font-medium text-slate-700">{formatShortDate(doc.signature.signedAt)}</p>
                </div>
              </div>
              <div className="border border-green-200 rounded-xl p-3 bg-green-50">
                <p className="text-xs text-slate-400 mb-2">Signature</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.signature.signatureImage}
                  alt="Electronic signature"
                  className="max-h-20 object-contain"
                />
              </div>
            </div>
          )}

          {/* Audit trail */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Audit Trail
            </h2>
            {doc.auditLog.length === 0 ? (
              <p className="text-slate-400 text-sm">No audit events yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-slate-100" />
                <div className="space-y-4">
                  {doc.auditLog.map((entry) => {
                    const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.DRAFT;
                    return (
                      <div key={entry.id} className="flex gap-4">
                        <div className="w-5 h-5 rounded-full border-2 border-white flex-shrink-0 mt-0.5 z-10"
                          style={{ backgroundColor: cfg.bg, borderColor: cfg.text }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800">{entry.action}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                              {cfg.label}
                            </span>
                          </div>
                          {entry.notes && <p className="text-xs text-slate-500 mt-0.5">{entry.notes}</p>}
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <User className="h-3 w-3" />
                            <span>{entry.actorName ?? entry.user?.name ?? "System"}</span>
                            <span>·</span>
                            <span>{formatShortDate(entry.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: actions */}
        <div className="space-y-4">
          {/* Action panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Actions</h2>

            {canSubmit && (
              <button
                onClick={() => doAction("submit")}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold mb-3 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#0a1628", color: "white" }}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for Review
              </button>
            )}

            {canApprove && (
              <button
                onClick={() => doAction("approve")}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold mb-3 transition-all hover:opacity-90 disabled:opacity-50 bg-green-600 text-white"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {doc.status === "SIGNED" ? "Approve & Complete" : "Approve"}
              </button>
            )}

            {canReturn && (
              <button
                onClick={() => { setModal("return"); setModalInput(""); setError(null); }}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold mb-3 border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition-all disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Return for Revision
              </button>
            )}

            {canReject && (
              <button
                onClick={() => { setModal("reject"); setModalInput(""); setError(null); }}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold mb-3 border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            )}

            {canArchive && (
              <button
                onClick={() => doAction("archive")}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
            )}

            {!canSubmit && !canApprove && !canReject && !canReturn && !canArchive && (
              <p className="text-sm text-slate-400 text-center">No actions available for this status.</p>
            )}
          </div>

          {/* Quick info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span>{doc.routedBy.name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Building className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span>{doc.department}</span>
            </div>
            {doc.dueDate && (
              <div className="flex items-center gap-2 text-orange-600">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>Due {formatShortDate(doc.dueDate)}</span>
              </div>
            )}
            {doc.requiresESignature && (
              <div className="flex items-center gap-2 text-purple-600">
                <PenLine className="h-4 w-4 flex-shrink-0" />
                <span>E-Signature Required</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for reject/return */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              {modal === "reject" ? "Reject Document" : "Return for Revision"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {modal === "reject"
                ? "Please provide a reason for rejection. This will be visible to the submitter."
                : "Describe what changes or corrections are needed."}
            </p>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <textarea
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder={modal === "reject" ? "Rejection reason…" : "Revision notes…"}
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/30 resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setError(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={modal === "reject" ? handleReject : handleReturn}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: modal === "reject" ? "#dc2626" : "#ea580c" }}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
