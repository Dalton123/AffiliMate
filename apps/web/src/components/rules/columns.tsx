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
import type { TargetingRule } from '@affilimate/types';

interface ColumnActions {
  onEdit: (rule: TargetingRule) => void;
  onDelete: (rule: TargetingRule) => void;
}

export function getColumns({
  onEdit,
  onDelete,
}: ColumnActions): ColumnDef<TargetingRule>[] {
  return [
    {
      id: 'placement',
      header: 'Placement',
      cell: ({ row }) => {
        const placement = row.original.placement;
        return placement ? (
          <div>
            <div className="font-medium">{placement.name}</div>
            <code className="text-xs text-muted-foreground">{placement.slug}</code>
          </div>
        ) : (
          '-'
        );
      },
    },
    {
      id: 'creative',
      header: 'Creative',
      cell: ({ row }) => {
        const creative = row.original.creative;
        return creative ? (
          <div>
            <div className="font-medium">{creative.name}</div>
            {creative.size && (
              <code className="text-xs text-muted-foreground">
                {creative.size}
              </code>
            )}
          </div>
        ) : (
          '-'
        );
      },
    },
    {
      accessorKey: 'countries',
      header: 'Countries',
      cell: ({ row }) => {
        const countries = row.getValue('countries') as string[];
        if (!countries || countries.length === 0) {
          return (
            <span className="text-muted-foreground text-sm">All countries</span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {countries.slice(0, 3).map((c) => (
              <Badge key={c} variant="outline" className="text-xs">
                {c}
              </Badge>
            ))}
            {countries.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{countries.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as number;
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${priority}%` }}
              />
            </div>
            <span className="text-sm">{priority}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'weight',
      header: 'Weight',
      cell: ({ row }) => row.getValue('weight'),
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
        const rule = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(rule)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(rule)}
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
