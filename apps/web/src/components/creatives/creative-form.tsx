'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
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
import type {
  Creative,
  Offer,
  CreateCreativeRequest,
  CreativeFormat,
} from '@affilimate/types';
import { parseAwinSnippet } from '@/lib/snippet-parser';

interface CreativeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCreativeRequest) => void;
  creative?: Creative;
  offers: Offer[];
  isLoading?: boolean;
}

const FORMATS: { value: CreativeFormat; label: string }[] = [
  { value: 'banner', label: 'Banner' },
  { value: 'text', label: 'Text Link' },
  { value: 'native', label: 'Native' },
];

export function CreativeForm({
  open,
  onOpenChange,
  onSubmit,
  creative,
  offers,
  isLoading,
}: CreativeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateCreativeRequest>({
    defaultValues: {
      offer_id: '',
      name: '',
      click_url: '',
      image_url: '',
      alt_text: '',
      width: undefined,
      height: undefined,
      format: 'banner',
    },
  });

  const format = watch('format');
  const offerId = watch('offer_id');
  const imageUrl = watch('image_url');
  const currentWidth = watch('width');
  const currentHeight = watch('height');
  const [snippet, setSnippet] = useState('');

  // Handle pasting Awin snippet
  const handleSnippetChange = (html: string) => {
    setSnippet(html);
    if (!html.trim()) return;

    const parsed = parseAwinSnippet(html);
    if (!parsed) return;

    if (parsed.click_url) setValue('click_url', parsed.click_url);
    if (parsed.image_url) setValue('image_url', parsed.image_url);
    if (parsed.width) setValue('width', parsed.width);
    if (parsed.height) setValue('height', parsed.height);

    // Auto-generate name from dimensions if we have them
    if (parsed.width && parsed.height && !watch('name')) {
      setValue('name', `${parsed.width}x${parsed.height} Banner`);
    }
  };

  useEffect(() => {
    setSnippet('');
    if (creative) {
      reset({
        offer_id: creative.offer_id,
        name: creative.name,
        click_url: creative.click_url,
        image_url: creative.image_url || '',
        alt_text: creative.alt_text || '',
        width: creative.width || undefined,
        height: creative.height || undefined,
        format: creative.format,
      });
    } else {
      reset({
        offer_id: offers[0]?.id || '',
        name: '',
        click_url: '',
        image_url: '',
        alt_text: '',
        width: undefined,
        height: undefined,
        format: 'banner',
      });
    }
  }, [creative, offers, reset]);

  const onFormSubmit = (data: CreateCreativeRequest) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {creative ? 'Edit Creative' : 'Create Creative'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offer_id">Offer</Label>
            <Select
              value={offerId}
              onValueChange={(v) => setValue('offer_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an offer" />
              </SelectTrigger>
              <SelectContent>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                    {o.advertiser_name && ` (${o.advertiser_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {offers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Create an offer first before adding creatives.
              </p>
            )}
          </div>

          {!creative && (
            <div className="space-y-2">
              <Label htmlFor="snippet">Paste Awin Snippet (optional)</Label>
              <Textarea
                id="snippet"
                value={snippet}
                onChange={(e) => handleSnippetChange(e.target.value)}
                placeholder={'Paste Awin HTML snippet to auto-fill fields:\n<a href="https://www.awin1.com/cread.php?..."><img src="..."></a>'}
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Automatically extracts click URL, image URL, and dimensions.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="300x250 Summer Banner"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="click_url">Click URL</Label>
            <Textarea
              id="click_url"
              {...register('click_url', { required: 'Click URL is required' })}
              placeholder="https://www.awin1.com/cread.php?..."
              rows={2}
            />
            {errors.click_url && (
              <p className="text-sm text-destructive">
                {errors.click_url.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Textarea
              id="image_url"
              {...register('image_url')}
              placeholder="https://www.awin1.com/cshow.php?..."
              rows={2}
            />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="max-w-[100px] max-h-[60px] object-contain rounded border border-border"
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (img.naturalWidth && img.naturalHeight) {
                    // Only auto-fill if width/height are currently empty
                    if (!currentWidth) setValue('width', img.naturalWidth);
                    if (!currentHeight) setValue('height', img.naturalHeight);
                  }
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                type="number"
                {...register('width', { valueAsNumber: true })}
                placeholder="300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                type="number"
                {...register('height', { valueAsNumber: true })}
                placeholder="250"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select
                value={format}
                onValueChange={(v) => setValue('format', v as CreativeFormat)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alt_text">Alt Text</Label>
            <Input
              id="alt_text"
              {...register('alt_text')}
              placeholder="Shop now - Summer Sale"
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
            <Button type="submit" disabled={isLoading || offers.length === 0}>
              {isLoading ? 'Saving...' : creative ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
