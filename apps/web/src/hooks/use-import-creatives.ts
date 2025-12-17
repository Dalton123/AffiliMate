import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ImportCreativesRequest,
  ImportCreativesResponse,
} from '@affilimate/types';

const CREATIVES_KEY = ['creatives'];

async function importCreatives(
  data: ImportCreativesRequest
): Promise<ImportCreativesResponse> {
  const res = await fetch('/api/admin/creatives/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to import creatives');
  }
  return res.json();
}

export function useImportCreatives() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importCreatives,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREATIVES_KEY });
    },
  });
}
