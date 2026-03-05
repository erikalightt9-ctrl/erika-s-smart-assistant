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
      <p style="color:#475569;margin:0 0 20px">Hi,</p>
      <p style="color:#475569;margin:0 0 20px">
        This is <strong>${doc.senderName}</strong>. I am sending you a document for signature for the purpose of
        <strong>${doc.purpose}</strong>.
      </p>
      <p style="color:#475569;margin:0 0 24px">Please review and sign the document using the secure link below:</p>
      <div style="text-align:center;margin-bottom:28px">
        <a href="${doc.signingUrl}" style="display:inline-block;background:#c9a227;color:#0a1628;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none">
          ✍ REVIEW &amp; SIGN DOCUMENT
        </a>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #0a1628">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:120px">Document:</td><td style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 0">${doc.title}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">From:</td><td style="color:#0f172a;font-size:13px;padding:4px 0">${doc.senderName}${doc.department && doc.department !== "N/A" ? ` · ${doc.department}` : ""}</td></tr>
          ${doc.dueDate ? `<tr><td style="color:#64748b;font-size:13px;padding:4px 0">Due:</td><td style="color:#dc2626;font-size:13px;font-weight:600;padding:4px 0">${doc.dueDate.toDateString()}</td></tr>` : ""}
        </table>
      </div>
      <p style="color:#475569;margin:0 0 24px">If you have any questions, please feel free to contact me.</p>
      <p style="color:#475569;margin:0 0 8px">Thank you.</p>
      <p style="color:#0a1628;font-weight:600;margin:0">${doc.senderName}</p>
      ${doc.requesterEmail ? `<p style="color:#94a3b8;font-size:12px;margin:4px 0 0">${doc.requesterEmail}</p>` : ""}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="color:#94a3b8;font-size:11px;margin:0">This signing link is valid until you sign the document. Do not share this link with others.</p>
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
  originalName: string,
  subDir: string = "documents"
): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  const uploadDir = path.join(process.cwd(), "uploads", subDir);
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
    filePath: path.join("uploads", subDir, safeName),
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
      status: DocumentStatus.SUBMITTED, // All new documents enter as SUBMITTED
      assigneeRecords: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    include: {
      routedBy: true,
      assigneeRecords: { include: { user: true } },
    },
  });

  await addAuditLog(document.id, DocumentStatus.SUBMITTED, "Document submitted", undefined, data.routedById);

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
  // Links never expire by time — they are invalidated only when the document is signed or completed
  if (doc.status === DocumentStatus.SIGNED || doc.status === DocumentStatus.COMPLETED || doc.signature) return null;

  return doc;
}

// ─── Status Transitions ───────────────────────────────────────────────────────

/** Move a document from SUBMITTED → UNDER_REVIEW.
 *  If the document requires e-signature, a signing link is generated and emailed to the signatory.
 */
export async function startReview(documentId: string, requesterId: string) {
  const doc = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { routedBy: true },
  });

  const token = doc.requiresESignature ? generateSigningToken() : null;
  const appUrl = process.env.APP_URL ?? "http://localhost:3001";
  const now = new Date();

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: DocumentStatus.UNDER_REVIEW,
      signingToken: token,
      signingTokenExpiry: null, // No time expiry — valid until signed or manually invalidated
      signatureRequestSentAt: doc.requiresESignature ? now : null,
    },
  });

  await addAuditLog(documentId, DocumentStatus.UNDER_REVIEW, "Document moved to Under Review", undefined, requesterId);

  // Send e-signature email if required
  if (doc.requiresESignature && doc.signatoryEmail && doc.signatoryName) {
    const signingUrl = `${appUrl}/sign/${token}`;
    await sendEmail({
      to:        doc.signatoryEmail,
      subject:   `Document for Signature – ${doc.title}`,
      fromName:  doc.senderName ?? undefined,          // "Erika Santos via AILE"
      replyTo:   doc.routedBy?.email ?? undefined,     // replies go to actual sender
      html: signatureRequestEmail({
        title:         doc.title,
        purpose:       doc.purpose,
        senderName:    doc.senderName,
        department:    doc.department,
        dueDate:       doc.dueDate,
        signatoryName: doc.signatoryName,
        signingUrl,
        requesterEmail: doc.routedBy.email,
      }),
    }).catch((err) => {
      console.error(`[document.service] ❌ Failed to send signing email for doc ${documentId}:`, err);
    });
  }

  return updated;
}

export async function approveDocument(documentId: string, userId: string, notes?: string) {
  const newStatus = DocumentStatus.APPROVED;

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
  signedFilePath: string,
  signedFileName: string,
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
        create: {
          signatoryName,
          signatoryEmail,
          signedFilePath,
          signedFileName,
          ipAddress: ipAddress ?? null,
        },
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
