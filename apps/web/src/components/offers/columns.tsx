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
import type { Offer, AffiliateNetwork } from '@affilimate/types';

interface ColumnActions {
  onEdit: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
}

const NETWORK_LABELS: Record<AffiliateNetwork, string> = {
  awin: 'Awin',
  shareasale: 'ShareASale',
  cj: 'CJ',
  direct: 'Direct',
};

export function getColumns({ onEdit, onDelete }: ColumnActions): ColumnDef<Offer>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'advertiser_name',
      header: 'Advertiser',
      cell: ({ row }) => row.getValue('advertiser_name') || '-',
    },
    {
      accessorKey: 'network',
      header: 'Network',
      cell: ({ row }) => {
        const network = row.getValue('network') as AffiliateNetwork;
        return (
          <Badge variant="outline">{NETWORK_LABELS[network] || network}</Badge>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => row.getValue('category') || '-',
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
        const offer = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(offer)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(offer)}
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
