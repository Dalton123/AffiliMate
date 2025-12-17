'use client';

import { useForm } from 'react-hook-form';
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
import type { Placement, CreatePlacementRequest } from '@affilimate/types';
import { useEffect } from 'react';

interface PlacementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePlacementRequest) => void;
  placement?: Placement;
  isLoading?: boolean;
}

export function PlacementForm({
  open,
  onOpenChange,
  onSubmit,
  placement,
  isLoading,
}: PlacementFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreatePlacementRequest>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      default_size: '',
      fallback_type: 'none',
      fallback_url: '',
    },
  });

  const fallbackType = watch('fallback_type');

  useEffect(() => {
    if (placement) {
      reset({
        name: placement.name,
        slug: placement.slug,
        description: placement.description || '',
        default_size: placement.default_size || '',
        fallback_type: placement.fallback_type,
        fallback_url: placement.fallback_url || '',
      });
    } else {
      reset({
        name: '',
        slug: '',
        description: '',
        default_size: '',
        fallback_type: 'none',
        fallback_url: '',
      });
    }
  }, [placement, reset]);

  const onFormSubmit = (data: CreatePlacementRequest) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {placement ? 'Edit Placement' : 'Create Placement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="Homepage Banner"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              {...register('slug', { required: 'Slug is required' })}
              placeholder="homepage-banner"
            />
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_size">Default Size</Label>
            <Input
              id="default_size"
              {...register('default_size')}
              placeholder="300x250"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fallback_type">Fallback Type</Label>
            <Select
              value={fallbackType}
              onValueChange={(v) =>
                setValue('fallback_type', v as 'none' | 'url' | 'creative')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {fallbackType === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="fallback_url">Fallback URL</Label>
              <Input
                id="fallback_url"
                {...register('fallback_url')}
                placeholder="https://example.com"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : placement ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
