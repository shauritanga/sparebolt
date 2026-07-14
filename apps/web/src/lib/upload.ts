import { api } from '@/lib/api';

export type UploadResult = {
  url: string;
  absoluteUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
};

/**
 * Upload a single image to the API (JWT required).
 * Returns a public path like `/uploads/<uuid>.jpg` (works via Vite proxy).
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  // Let the browser set multipart boundary (do not force Content-Type)
  const { data } = await api.post<UploadResult>('/uploads', form);
  return data;
}

export async function uploadImages(files: File[]): Promise<UploadResult[]> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const { data } = await api.post<{ files: UploadResult[] }>(
    '/uploads/multiple',
    form,
  );
  return data.files;
}
