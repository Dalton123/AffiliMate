import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '@affilimate/types';

const API_KEYS_KEY = ['api-keys'];

async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await fetch('/api/admin/api-keys');
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch API keys');
  }
  const { data } = await res.json();
  return data;
}

async function createApiKey(
  data: CreateApiKeyRequest
): Promise<CreateApiKeyResponse> {
  const res = await fetch('/api/admin/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create API key');
  }
  return res.json();
}

async function deleteApiKey(id: string): Promise<void> {
  const res = await fetch(`/api/admin/api-keys/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete API key');
  }
}

export function useApiKeys() {
  return useQuery({
    queryKey: API_KEYS_KEY,
    queryFn: fetchApiKeys,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_KEY });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_KEY });
    },
  });
}
