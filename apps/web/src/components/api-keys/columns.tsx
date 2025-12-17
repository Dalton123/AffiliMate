'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { ApiKey } from '@affilimate/types';

interface ColumnActions {
  onDelete: (apiKey: ApiKey) => void;
}

export function getColumns({ onDelete }: ColumnActions): ColumnDef<ApiKey>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'key_prefix',
      header: 'Key',
      cell: ({ row }) => (
        <code className="rounded bg-muted px-2 py-1 text-sm">
          {row.getValue('key_prefix')}...
        </code>
      ),
    },
    {
      accessorKey: 'scopes',
      header: 'Scopes',
      cell: ({ row }) => {
        const scopes = row.getValue('scopes') as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {scopes.map((scope) => (
              <Badge key={scope} variant="outline" className="text-xs">
                {scope}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'last_used_at',
      header: 'Last Used',
      cell: ({ row }) => {
        const lastUsed = row.getValue('last_used_at') as string | null;
        if (!lastUsed) return <span className="text-muted-foreground">Never</span>;
        return new Date(lastUsed).toLocaleDateString();
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
          {row.getValue('is_active') ? 'Active' : 'Revoked'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => {
        const created = row.getValue('created_at') as string;
        return new Date(created).toLocaleDateString();
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const apiKey = row.original;
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(apiKey)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Revoke</span>
          </Button>
        );
      },
    },
  ];
}
