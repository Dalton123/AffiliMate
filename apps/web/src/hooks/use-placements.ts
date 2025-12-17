import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Placement,
  CreatePlacementRequest,
  UpdatePlacementRequest,
} from '@affilimate/types';

const PLACEMENTS_KEY = ['placements'];

async function fetchPlacements(): Promise<Placement[]> {
  const res = await fetch('/api/admin/placements');
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch placements');
  }
  const { data } = await res.json();
  return data;
}

async function createPlacement(data: CreatePlacementRequest): Promise<Placement> {
  const res = await fetch('/api/admin/placements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create placement');
  }
  const { data: placement } = await res.json();
  return placement;
}

async function updatePlacement({
  id,
  ...data
}: UpdatePlacementRequest & { id: string }): Promise<Placement> {
  const res = await fetch(`/api/admin/placements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update placement');
  }
  const { data: placement } = await res.json();
  return placement;
}

async function deletePlacement(id: string): Promise<void> {
  const res = await fetch(`/api/admin/placements/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete placement');
  }
}

export function usePlacements() {
  return useQuery({
    queryKey: PLACEMENTS_KEY,
    queryFn: fetchPlacements,
  });
}

export function useCreatePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlacement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACEMENTS_KEY });
    },
  });
}

export function useUpdatePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlacement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACEMENTS_KEY });
    },
  });
}

export function useDeletePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlacement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACEMENTS_KEY });
    },
  });
}
