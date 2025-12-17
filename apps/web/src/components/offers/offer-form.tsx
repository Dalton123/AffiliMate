'use client';

import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Offer, CreateOfferRequest, AffiliateNetwork } from '@affilimate/types';

interface OfferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateOfferRequest) => void;
  offer?: Offer;
  isLoading?: boolean;
}

const NETWORKS: { value: AffiliateNetwork; label: string }[] = [
  { value: 'awin', label: 'Awin' },
  { value: 'shareasale', label: 'ShareASale' },
  { value: 'cj', label: 'CJ Affiliate' },
  { value: 'direct', label: 'Direct' },
];

export function OfferForm({
  open,
  onOpenChange,
  onSubmit,
  offer,
  isLoading,
}: OfferFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateOfferRequest>({
    defaultValues: {
      name: '',
      advertiser_name: '',
      advertiser_id: '',
      network: 'direct',
      category: '',
      base_url: '',
      notes: '',
    },
  });

  const network = watch('network');

  useEffect(() => {
    if (offer) {
      reset({
        name: offer.name,
        advertiser_name: offer.advertiser_name || '',
        advertiser_id: offer.advertiser_id || '',
        network: offer.network,
        category: offer.category || '',
        base_url: offer.base_url || '',
        notes: offer.notes || '',
      });
    } else {
      reset({
        name: '',
        advertiser_name: '',
        advertiser_id: '',
        network: 'direct',
        category: '',
        base_url: '',
        notes: '',
      });
    }
  }, [offer, reset]);

  const onFormSubmit = (data: CreateOfferRequest) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{offer ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="Summer Sale Campaign"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advertiser_name">Advertiser Name</Label>
              <Input
                id="advertiser_name"
                {...register('advertiser_name')}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advertiser_id">Advertiser ID</Label>
              <Input
                id="advertiser_id"
                {...register('advertiser_id')}
                placeholder="12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <Select
                value={network}
                onValueChange={(v) => setValue('network', v as AffiliateNetwork)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="Fashion"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL</Label>
            <Input
              id="base_url"
              {...register('base_url')}
              placeholder="https://www.example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Internal notes about this offer..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : offer ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
