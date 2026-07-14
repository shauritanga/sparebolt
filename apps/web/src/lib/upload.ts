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
 * Returns a public path like `/uploads/<uuid>.jpg` (works via Vite proxy / nginx).
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  // Field name must match Nest FileInterceptor('file')
  form.append('file', file, file.name || 'photo.jpg');

  const { data } = await api.post<UploadResult>('/uploads', form, {
    // Explicitly clear JSON content-type; interceptor also handles FormData
    headers: { 'Content-Type': undefined as unknown as string },
    timeout: 60_000,
  });
  return data;
}

export async function uploadImages(files: File[]): Promise<UploadResult[]> {
  const form = new FormData();
  files.forEach((f, i) =>
    form.append('files', f, f.name || `photo-${i}.jpg`),
  );
  const { data } = await api.post<{ files: UploadResult[] }>(
    '/uploads/multiple',
    form,
    {
      headers: { 'Content-Type': undefined as unknown as string },
      timeout: 120_000,
    },
  );
  return data.files;
}
