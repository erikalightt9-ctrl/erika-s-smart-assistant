/**
 * @deprecated Use lib/services/document.service.ts instead.
 * This file is kept only as a compatibility shim for the generic status PATCH route.
 */

import { DocumentStatus } from "@prisma/client";
import {
  approveDocument,
  rejectDocument,
  returnForRevision,
  archiveDocument,
} from "@/lib/services/document.service";

/**
 * Generic status update — delegates to the appropriate service method.
 * Note: prefer using the specific functions from document.service.ts directly.
 */
export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  userId: string,
  notes?: string
) {
  switch (status) {
    case DocumentStatus.APPROVED:
      return approveDocument(documentId, userId, notes);
    case DocumentStatus.REJECTED:
      return rejectDocument(documentId, userId, notes ?? "No reason provided");
    case DocumentStatus.RETURNED_FOR_REVISION:
      return returnForRevision(documentId, userId, notes ?? "Returned for revision");
    case DocumentStatus.ARCHIVED:
      return archiveDocument(documentId, userId);
    default:
      throw new Error(`Status "${status}" cannot be set via generic update. Use specific API routes.`);
  }
}
