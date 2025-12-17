import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Offer,
  CreateOfferRequest,
  UpdateOfferRequest,
} from '@affilimate/types';

const OFFERS_KEY = ['offers'];

async function fetchOffers(): Promise<Offer[]> {
  const res = await fetch('/api/admin/offers');
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch offers');
  }
  const { data } = await res.json();
  return data;
}

async function createOffer(data: CreateOfferRequest): Promise<Offer> {
  const res = await fetch('/api/admin/offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create offer');
  }
  const { data: offer } = await res.json();
  return offer;
}

async function updateOffer({
  id,
  ...data
}: UpdateOfferRequest & { id: string }): Promise<Offer> {
  const res = await fetch(`/api/admin/offers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update offer');
  }
  const { data: offer } = await res.json();
  return offer;
}

async function deleteOffer(id: string): Promise<void> {
  const res = await fetch(`/api/admin/offers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete offer');
  }
}

export function useOffers() {
  return useQuery({
    queryKey: OFFERS_KEY,
    queryFn: fetchOffers,
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
    },
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
    },
  });
}
