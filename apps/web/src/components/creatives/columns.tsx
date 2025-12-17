'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreativePreview } from './creative-preview';
import type { Creative, CreativeFormat } from '@affilimate/types';

interface ColumnActions {
  onEdit: (creative: Creative) => void;
  onDelete: (creative: Creative) => void;
}

const FORMAT_LABELS: Record<CreativeFormat, string> = {
  banner: 'Banner',
  text: 'Text',
  native: 'Native',
};

export function getColumns({
  onEdit,
  onDelete,
}: ColumnActions): ColumnDef<Creative>[] {
  return [
    {
      id: 'preview',
      header: '',
      cell: ({ row }) => (
        <CreativePreview
          imageUrl={row.original.image_url}
          alt={row.original.alt_text}
          width={row.original.width}
          height={row.original.height}
        />
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      id: 'offer',
      header: 'Offer',
      cell: ({ row }) => {
        const offer = row.original.offer;
        return offer?.name || '-';
      },
    },
    {
      accessorKey: 'size',
      header: 'Size',
      cell: ({ row }) => {
        const size = row.getValue('size') as string | null;
        return size ? (
          <code className="rounded bg-muted px-2 py-1 text-sm">{size}</code>
        ) : (
          '-'
        );
      },
    },
    {
      accessorKey: 'format',
      header: 'Format',
      cell: ({ row }) => {
        const format = row.getValue('format') as CreativeFormat;
        return (
          <Badge variant="outline">{FORMAT_LABELS[format] || format}</Badge>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
          {row.getValue('is_active') ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const creative = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(creative)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(creative)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
