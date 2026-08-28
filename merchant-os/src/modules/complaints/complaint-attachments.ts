import prisma from "@/lib/db/prisma";
import { ValidationError } from "@/lib/errors";
import { normalizePrivateEvidence } from "@/services/storage/private-evidence-input";
import { privateStorageService } from "@/services/storage";

const MAX_ATTACHMENTS = 5;

export async function uploadComplaintAttachment(
  complaintId: string,
  file: File,
  uploadedBy: "CUSTOMER" | "MERCHANT" | "PLATFORM",
) {
  const current = await prisma.complaintAttachment.count({
    where: { complaintId },
  });
  if (current >= MAX_ATTACHMENTS)
    throw new ValidationError("يمكن إرفاق 5 صور كحد أقصى");
  const evidence = await normalizePrivateEvidence(file);
  if (!evidence.mimeType.startsWith("image/"))
    throw new ValidationError("المرفق يجب أن يكون صورة JPEG أو PNG أو WebP");
  const originalName = file.name.trim().slice(0, 180) || evidence.filename;
  const storageKey = await privateStorageService.upload(
    evidence.buffer,
    evidence.filename,
    evidence.mimeType,
    `complaint-${complaintId}`,
  );
  try {
    return await prisma.complaintAttachment.create({
      data: {
        complaintId,
        storageKey,
        fileName: originalName,
        mimeType: evidence.mimeType,
        size: evidence.buffer.length,
        uploadedBy,
      },
    });
  } catch (error) {
    await privateStorageService.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function downloadComplaintAttachment(storageKey: string) {
  return privateStorageService.download(storageKey);
}
