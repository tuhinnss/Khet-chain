import { api } from "./client";

export async function getBatchQR(batchId: number): Promise<{ batchId: number; url: string; qrCodeDataUrl: string }> {
  const { data } = await api.get(`/qr/${batchId}`);
  return data.data;
}
