'use client';

import { ImageOff } from 'lucide-react';

interface CreativePreviewProps {
  imageUrl: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  className?: string;
}

export function CreativePreview({
  imageUrl,
  alt,
  width,
  height,
  className = '',
}: CreativePreviewProps) {
  if (!imageUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded bg-muted ${className}`}
        style={{ width: 60, height: 40 }}
      >
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || 'Creative preview'}
      className={`rounded object-contain ${className}`}
      style={{ maxWidth: 60, maxHeight: 40 }}
      loading="lazy"
    />
  );
}
