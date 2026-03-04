import { prisma } from "@/lib/prisma";
import { DocumentStatus, DocumentPriority, Subsidiary } from "@prisma/client";
import { sendEmail } from "@/lib/mailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateSigningToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function signingTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

async function addAuditLog(
  documentId: string,
  status: DocumentStatus,
  action: string,
  notes?: string,
  userId?: string,
  actorName?: string
) {
  return prisma.documentAuditLog.create({
    data: { documentId, status, action, notes, userId: userId ?? null, actorName: actorName ?? null },
  });
}

async function notifyUser(
  userId: string,
  title: string,
  message: string,
  link: string
) {
  return prisma.notification.create({
    data: { userId, type: "DOCUMENT_STATUS", title, message, link },
  });
}

// ─── Email templates ─────────────────────────────────────────────────────────

function signatureRequestEmail(doc: {
  title: string;
  purpose: string;
  senderName: string;
  department: string;
  dueDate?: Date | null;
  signatoryName: string;
  signingUrl: string;
  requesterEmail?: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:#0a1628;padding:28px 32px">
      <div style="color:#c9a227;font-size:20px;font-weight:bold">AILE</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px">My Smart Office Assistant · GDS Capital</div>
    </div>
    <div style="padding:32px">
      <h2 style="color:#0a1628;margin:0 0 8px">Document Signature Required</h2>
      <p style="color:#475569;margin:0 0 24px">Dear <strong>${doc.signatoryName}</strong>,</p>
      <p style="color:#475569;margin:0 0 20px">You have been requested to sign the following document:</p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;border-left:4px solid #c9a227">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:120px">Document:</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${doc.title}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">Purpose:</td><td style="color:#0f172a;font-size:13px;padding:4px 0">${doc.purpose}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">From:</td><td style="color:#0f172a;font-size:13px;padding:4px 0">${doc.senderName} · ${doc.department}</td></tr>
          ${doc.dueDate ? `<tr><td style="color:#64748b;font-size:13px;padding:4px 0">Due:</td><td style="color:#dc2626;font-size:13px;font-weight:600;padding:4px 0">${doc.dueDate.toDateString()}</td></tr>` : ""}
        </table>
      </div>
      <div style="text-align:center;margin-bottom:32px">
        <a href="${doc.signingUrl}" style="display:inline-block;background:#c9a227;color:#0a1628;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none">
          ✍ REVIEW &amp; SIGN DOCUMENT
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">This signing link expires in <strong>7 days</strong>. Do not share this link with others.</p>
      ${doc.requesterEmail ? `<p style="color:#94a3b8;font-size:12px;text-align:center;margin:8px 0 0">Questions? Contact: ${doc.requesterEmail}</p>` : ""}
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center">© 2025 GDS Capital · Internal System · Confidential</p>
    </div>
  </div>
</body>
</html>`;
}

function statusUpdateEmail(doc: { title: string; status: string; notes?: string | null }, to: string) {
  const statusLabel = doc.status.replace(/_/g, " ");
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:white;border-radius:12px;overflow:hidden">
    <div style="background:#0a1628;padding:24px 32px">
      <div style="color:#c9a227;font-size:18px;font-weight:bold">AILE · GDS Capital</div>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#0a1628;margin:0 0 16px">Document Status Update</h2>
      <p style="color:#475569">Your document <strong>${doc.title}</strong> has been updated.</p>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:20px 0">
        <span style="color:#64748b;font-size:13px">New Status: </span>
        <span style="color:#0a1628;font-weight:bold;font-size:14px">${statusLabel}</span>
      </div>
      ${doc.notes ? `<p style="color:#64748b;font-size:13px">Notes: ${doc.notes}</p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

// ─── File utilities ───────────────────────────────────────────────────────────

export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string
): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  const uploadDir = path.join(process.cwd(), "uploads", "documents");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const ext = path.extname(originalName).toLowerCase();
  const safeName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const filePath = path.join(uploadDir, safeName);
  fs.writeFileSync(filePath, buffer);

  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  return {
    filePath: path.join("uploads", "documents", safeName),
    fileName: originalName,
    fileSize: buffer.length,
    mimeType: mimeMap[ext] ?? "application/octet-stream",
  };
}

export function getAbsoluteFilePath(relPath: string): string {
  return path.join(process.cwd(), relPath);
}

// ─── Document CRUD ───────────────────────────────────────────────────────────

export async function createDocument(data: {
  title: string;
  purpose: string;
  senderName: string;
  department: string;
  description?: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fromSubsidiary?: Subsidiary;
  priority?: DocumentPriority;
  requiresESignature: boolean;
  signatoryName?: string;
  signatoryEmail?: string;
  assigneeIds: string[];
  routedById: string;
  dueDate?: Date;
  notes?: string;
}) {
  const { assigneeIds, ...docData } = data;

  const document = await prisma.document.create({
    data: {
      ...docData,
      status: DocumentStatus.DRAFT,
      assigneeRecords: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    include: {
      routedBy: true,
      assigneeRecords: { include: { user: true } },
    },
  });

  await addAuditLog(document.id, DocumentStatus.DRAFT, "Document created as Draft", undefined, data.routedById);

  return document;
}

export async function getDocuments(filters: {
  status?: DocumentStatus;
  routedById?: string;
  assigneeId?: string;
  search?: string;
  department?: string;
  page?: number;
  limit?: number;
}) {
  const { status, routedById, assigneeId, search, department, page = 1, limit = 30 } = filters;

  const where: Record<string, unknown> = {
    ...(status ? { status } : {}),
    ...(routedById ? { routedById } : {}),
    ...(department ? { department } : {}),
    ...(assigneeId ? { assigneeRecords: { some: { userId: assigneeId } } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { senderName: { contains: search, mode: "insensitive" } },
            { department: { contains: search, mode: "insensitive" } },
            { purpose: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        routedBy: { select: { id: true, name: true, email: true } },
        assigneeRecords: { include: { user: { select: { id: true, name: true, role: true } } } },
        signature: true,
        _count: { select: { auditLog: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return { documents, total, page, limit };
}

export async function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      routedBy: { select: { id: true, name: true, email: true, role: true } },
      assigneeRecords: { include: { user: { select: { id: true, name: true, role: true, email: true } } } },
      auditLog: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      signature: true,
    },
  });
}

export async function getDocumentByToken(token: string) {
  const doc = await prisma.document.findUnique({
    where: { signingToken: token },
    include: {
      routedBy: { select: { name: true, email: true } },
      signature: true,
    },
  });

  if (!doc) return null;
  if (doc.signingTokenExpiry && doc.signingTokenExpiry < new Date()) return null;
  if (doc.status === DocumentStatus.SIGNED || doc.status === DocumentStatus.COMPLETED || doc.signature) return null;

  return doc;
}

// ─── Status Transitions ───────────────────────────────────────────────────────

export async function submitForSignature(documentId: string, requesterId: string) {
  const doc = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { routedBy: true },
  });

  const token = generateSigningToken();
  const expiry = signingTokenExpiry();
  const appUrl = process.env.APP_URL ?? "http://localhost:3001";

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: doc.requiresESignature ? DocumentStatus.PENDING_SIGNATURE : DocumentStatus.SUBMITTED,
      signingToken: doc.requiresESignature ? token : null,
      signingTokenExpiry: doc.requiresESignature ? expiry : null,
    },
  });

  const newStatus = updated.status;
  await addAuditLog(documentId, newStatus, "Submitted for processing", undefined, requesterId);

  // Send e-signature email if required
  if (doc.requiresESignature && doc.signatoryEmail && doc.signatoryName) {
    const signingUrl = `${appUrl}/sign/${token}`;
    await sendEmail({
      to: doc.signatoryEmail,
      subject: `[AILE] Signature Required: ${doc.title}`,
      html: signatureRequestEmail({
        title: doc.title,
        purpose: doc.purpose,
        senderName: doc.senderName,
        department: doc.department,
        dueDate: doc.dueDate,
        signatoryName: doc.signatoryName,
        signingUrl,
        requesterEmail: doc.routedBy.email,
      }),
    }).catch(() => {});
  }

  return updated;
}

export async function approveDocument(documentId: string, userId: string, notes?: string) {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

  const newStatus = doc.status === DocumentStatus.SIGNED
    ? DocumentStatus.COMPLETED
    : DocumentStatus.APPROVED;

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { status: newStatus },
    include: { routedBy: true },
  });

  await addAuditLog(documentId, newStatus, "Document approved", notes, userId);
  await notifyUser(
    updated.routedById,
    `Document Approved: ${updated.title}`,
    `Your document has been approved${notes ? `. Notes: ${notes}` : ""}`,
    `/documents/${documentId}`
  );

  await sendEmail({
    to: updated.routedBy.email,
    subject: `[AILE] Document Approved: ${updated.title}`,
    html: statusUpdateEmail({ title: updated.title, status: newStatus, notes }, updated.routedBy.email),
  }).catch(() => {});

  return updated;
}

export async function rejectDocument(documentId: string, userId: string, reason: string) {
  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { status: DocumentStatus.REJECTED, rejectionReason: reason },
    include: { routedBy: true },
  });

  await addAuditLog(documentId, DocumentStatus.REJECTED, "Document rejected", reason, userId);
  await notifyUser(
    updated.routedById,
    `Document Rejected: ${updated.title}`,
    `Your document was rejected. Reason: ${reason}`,
    `/documents/${documentId}`
  );

  await sendEmail({
    to: updated.routedBy.email,
    subject: `[AILE] Document Rejected: ${updated.title}`,
    html: statusUpdateEmail({ title: updated.title, status: "REJECTED", notes: reason }, updated.routedBy.email),
  }).catch(() => {});

  return updated;
}

export async function returnForRevision(documentId: string, userId: string, notes: string) {
  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { status: DocumentStatus.RETURNED_FOR_REVISION, rejectionReason: notes },
    include: { routedBy: true },
  });

  await addAuditLog(documentId, DocumentStatus.RETURNED_FOR_REVISION, "Returned for revision", notes, userId);
  await notifyUser(
    updated.routedById,
    `Document Returned for Revision: ${updated.title}`,
    `Your document needs revision. Notes: ${notes}`,
    `/documents/${documentId}`
  );

  return updated;
}

export async function archiveDocument(documentId: string, userId: string) {
  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { status: DocumentStatus.ARCHIVED },
  });

  await addAuditLog(documentId, DocumentStatus.ARCHIVED, "Document archived", undefined, userId);
  return updated;
}

export async function signDocument(
  token: string,
  signatoryName: string,
  signatoryEmail: string,
  signatureImage: string,
  ipAddress?: string
) {
  const doc = await getDocumentByToken(token);
  if (!doc) throw new Error("Invalid or expired signing token");

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      status: DocumentStatus.SIGNED,
      signingToken: null,
      signingTokenExpiry: null,
      signature: {
        create: { signatoryName, signatoryEmail, signatureImage, ipAddress: ipAddress ?? null },
      },
    },
    include: { routedBy: true },
  });

  await addAuditLog(
    doc.id,
    DocumentStatus.SIGNED,
    `Document signed by ${signatoryName}`,
    undefined,
    undefined,
    signatoryName
  );

  // Notify the routing staff member
  await notifyUser(
    updated.routedById,
    `Document Signed: ${updated.title}`,
    `${signatoryName} has signed your document.`,
    `/documents/${doc.id}`
  );

  // Email routing user + admin
  await sendEmail({
    to: updated.routedBy.email,
    subject: `[AILE] Document Signed: ${updated.title}`,
    html: statusUpdateEmail(
      { title: updated.title, status: "SIGNED", notes: `Signed by ${signatoryName} (${signatoryEmail})` },
      updated.routedBy.email
    ),
  }).catch(() => {});

  // Also notify admins
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "ERIKA"] } },
    select: { id: true, email: true },
  });
  for (const admin of admins) {
    await notifyUser(
      admin.id,
      `Document Signed: ${updated.title}`,
      `${signatoryName} signed "${updated.title}" submitted by ${updated.routedBy.name}`,
      `/documents/${doc.id}`
    );
  }

  return updated;
}
