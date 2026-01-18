"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface AwinConnection {
  id: string;
  publisher_id: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: "pending" | "success" | "failed";
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AwinConnectionResponse {
  connected: boolean;
  connection: AwinConnection | null;
}

export interface AwinPromotion {
  id: string;
  title: string;
  description: string;
  terms?: string;
  type: "voucher" | "promotion";
  voucherCode?: string;
  url: string;
  startDate: string;
  endDate?: string;
  regions: string[];
  promotionCategories: string[];
  advertiserName?: string;
  advertiserId?: string;
}

export interface ConnectAwinRequest {
  publisher_id: string;
  api_token: string;
}

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

// Fetch functions
async function fetchConnection(): Promise<AwinConnectionResponse> {
  const res = await fetch("/api/admin/awin/connection");
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to fetch connection");
  }
  return res.json();
}

async function connectAwin(data: ConnectAwinRequest): Promise<AwinConnection> {
  const res = await fetch("/api/admin/awin/connection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to connect");
  }
  const { data: connection } = await res.json();
  return connection;
}

async function disconnectAwin(): Promise<void> {
  const res = await fetch("/api/admin/awin/connection", {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to disconnect");
  }
}

async function fetchPromotions(filters?: {
  region?: string;
  category?: string;
  type?: "voucher" | "promotion";
}): Promise<{ promotions: AwinPromotion[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.region) params.set("region", filters.region);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.type) params.set("type", filters.type);

  const res = await fetch(`/api/admin/awin/promotions?${params}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to fetch promotions");
  }
  return res.json();
}

async function syncPromotions(promotionIds?: string[]): Promise<{ result: SyncResult }> {
  const res = await fetch("/api/admin/awin/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promotion_ids: promotionIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to sync");
  }
  return res.json();
}

// Hooks
export function useAwinConnection() {
  return useQuery({
    queryKey: ["awin", "connection"],
    queryFn: fetchConnection,
  });
}

export function useConnectAwin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectAwin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["awin"] });
    },
  });
}

export function useDisconnectAwin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectAwin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["awin"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useAwinPromotions(filters?: {
  region?: string;
  category?: string;
  type?: "voucher" | "promotion";
}) {
  return useQuery({
    queryKey: ["awin", "promotions", filters],
    queryFn: () => fetchPromotions(filters),
    enabled: false, // Manual fetch only
  });
}

export function useSyncPromotions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncPromotions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["awin", "connection"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
