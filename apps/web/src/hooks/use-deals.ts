"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface Deal {
  id: string;
  project_id: string;
  offer_id: string | null;
  awin_promotion_id: string | null;
  awin_advertiser_id: string | null;
  awin_advertiser_name: string | null;
  title: string;
  description: string | null;
  terms: string | null;
  voucher_code: string | null;
  tracking_url: string;
  start_date: string | null;
  end_date: string | null;
  regions: string[];
  categories: string[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  synced_from_awin: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  offer?: { id: string; name: string } | null;
}

export interface CreateDealRequest {
  title: string;
  description?: string;
  terms?: string;
  voucher_code?: string;
  tracking_url: string;
  start_date?: string;
  end_date?: string;
  regions?: string[];
  categories?: string[];
  is_featured?: boolean;
  sort_order?: number;
  offer_id?: string;
  merchant_name?: string;
}

export interface UpdateDealRequest extends Partial<CreateDealRequest> {
  is_active?: boolean;
}

// Fetch functions
async function fetchDeals(filters?: {
  active?: boolean;
  awinOnly?: boolean;
  manualOnly?: boolean;
}): Promise<Deal[]> {
  const params = new URLSearchParams();
  if (filters?.active) params.set("active", "true");
  if (filters?.awinOnly) params.set("awin_only", "true");
  if (filters?.manualOnly) params.set("manual_only", "true");

  const res = await fetch(`/api/admin/deals?${params}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to fetch deals");
  }
  const { data } = await res.json();
  return data;
}

async function createDeal(data: CreateDealRequest): Promise<Deal> {
  const res = await fetch("/api/admin/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create deal");
  }
  const { data: deal } = await res.json();
  return deal;
}

async function updateDeal({
  id,
  ...data
}: UpdateDealRequest & { id: string }): Promise<Deal> {
  const res = await fetch(`/api/admin/deals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update deal");
  }
  const { data: deal } = await res.json();
  return deal;
}

async function deleteDeal(id: string): Promise<void> {
  const res = await fetch(`/api/admin/deals/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to delete deal");
  }
}

// Hooks
export function useDeals(filters?: {
  active?: boolean;
  awinOnly?: boolean;
  manualOnly?: boolean;
}) {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: () => fetchDeals(filters),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
