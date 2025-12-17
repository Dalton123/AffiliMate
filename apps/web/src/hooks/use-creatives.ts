import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Creative,
  CreateCreativeRequest,
  UpdateCreativeRequest,
} from '@affilimate/types';

const CREATIVES_KEY = ['creatives'];

async function fetchCreatives(): Promise<Creative[]> {
  const res = await fetch('/api/admin/creatives');
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch creatives');
  }
  const { data } = await res.json();
  return data;
}

async function createCreative(data: CreateCreativeRequest): Promise<Creative> {
  const res = await fetch('/api/admin/creatives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create creative');
  }
  const { data: creative } = await res.json();
  return creative;
}

async function updateCreative({
  id,
  ...data
}: UpdateCreativeRequest & { id: string }): Promise<Creative> {
  const res = await fetch(`/api/admin/creatives/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update creative');
  }
  const { data: creative } = await res.json();
  return creative;
}

async function deleteCreative(id: string): Promise<void> {
  const res = await fetch(`/api/admin/creatives/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete creative');
  }
}

export function useCreatives() {
  return useQuery({
    queryKey: CREATIVES_KEY,
    queryFn: fetchCreatives,
  });
}

export function useCreateCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCreative,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREATIVES_KEY });
    },
  });
}

export function useUpdateCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCreative,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREATIVES_KEY });
    },
  });
}

export function useDeleteCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCreative,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREATIVES_KEY });
    },
  });
}
