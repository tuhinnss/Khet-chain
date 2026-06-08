import { api } from "./client";
import { Batch } from "../types";

export async function syncBatch(payload: Record<string, unknown>) {
  const { data } = await api.post("/batch", payload);
  return data.data as Batch;
}

export async function listBatches() {
  const { data } = await api.get("/batch");
  return data.data as Batch[];
}

export async function getBatch(id: number) {
  const { data } = await api.get(`/batch/${id}`);
  return data.data;
}

export async function getHistory(id: number) {
  const { data } = await api.get(`/history/${id}`);
  return data.data;
}

export async function verifyBatch(id: number, hash?: string) {
  const { data } = await api.get(`/batch/${id}/verify`, { params: { hash } });
  return data.data;
}

export async function getDashboardStats() {
  const { data } = await api.get("/dashboard/stats");
  return data.data;
}
