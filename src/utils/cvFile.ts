import type { CvAttachment } from "../types";

export const MAX_CV_FILE_SIZE_BYTES = 500 * 1024;

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export type ReadCvFileResult =
  | { ok: true; attachment: CvAttachment }
  | { ok: false; error: string };

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function readCvFile(file: File): Promise<ReadCvFileResult> {
  if (!hasAllowedExtension(file.name)) {
    return Promise.resolve({
      ok: false,
      error: "Format file harus PDF, DOC, atau DOCX.",
    });
  }

  if (file.size > MAX_CV_FILE_SIZE_BYTES) {
    return Promise.resolve({
      ok: false,
      error: `Ukuran file terlalu besar (${formatFileSize(file.size)}). Maksimal 500 KB agar aman disimpan di localStorage.`,
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        resolve({ ok: false, error: "Gagal membaca isi file CV." });
        return;
      }

      resolve({
        ok: true,
        attachment: {
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          sizeBytes: file.size,
          dataUrl: reader.result,
        },
      });
    };

    reader.onerror = () => {
      resolve({ ok: false, error: "Terjadi kesalahan saat membaca file CV." });
    };

    reader.readAsDataURL(file);
  });
}

export function openCvPreview(attachment: CvAttachment): void {
  const commaIndex = attachment.dataUrl.indexOf(",");
  if (commaIndex === -1) return;

  try {
    const base64 = attachment.dataUrl.slice(commaIndex + 1);
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: attachment.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    // Fallback jika konversi base64 gagal
  }
}
