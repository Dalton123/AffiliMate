'use client';

import { useState, useMemo } from 'react';
import { Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table';
import { DeleteDialog } from '@/components/delete-dialog';
import { CreativeForm } from '@/components/creatives/creative-form';
import { getColumns } from '@/components/creatives/columns';
import {
  useCreatives,
  useCreateCreative,
  useUpdateCreative,
  useDeleteCreative,
} from '@/hooks/use-creatives';
import { useOffers } from '@/hooks/use-offers';
import { useProject } from '@/providers/project-provider';
import type { Creative, CreateCreativeRequest } from '@affilimate/types';

export default function CreativesPage() {
  const { project, isLoading: projectLoading } = useProject();
  const { data: creatives = [], isLoading } = useCreatives();
  const { data: offers = [] } = useOffers();
  const createMutation = useCreateCreative();
  const updateMutation = useUpdateCreative();
  const deleteMutation = useDeleteCreative();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [offerFilter, setOfferFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');

  // Get unique sizes for filter
  const sizes = useMemo(() => {
    const sizeSet = new Set(
      creatives.map((c) => c.size).filter((s): s is string => !!s)
    );
    return Array.from(sizeSet).sort();
  }, [creatives]);

  // Filter creatives
  const filteredCreatives = useMemo(() => {
    return creatives.filter((c) => {
      if (offerFilter !== 'all' && c.offer_id !== offerFilter) return false;
      if (sizeFilter !== 'all' && c.size !== sizeFilter) return false;
      return true;
    });
  }, [creatives, offerFilter, sizeFilter]);

  const handleCreate = (data: CreateCreativeRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Creative created');
        setFormOpen(false);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const handleUpdate = (data: CreateCreativeRequest) => {
    if (!selectedCreative) return;
    updateMutation.mutate(
      { id: selectedCreative.id, ...data },
      {
        onSuccess: () => {
          toast.success('Creative updated');
          setFormOpen(false);
          setSelectedCreative(null);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!selectedCreative) return;
    deleteMutation.mutate(selectedCreative.id, {
      onSuccess: () => {
        toast.success('Creative deleted');
        setDeleteOpen(false);
        setSelectedCreative(null);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const columns = getColumns({
    onEdit: (creative) => {
      setSelectedCreative(creative);
      setFormOpen(true);
    },
    onDelete: (creative) => {
      setSelectedCreative(creative);
      setDeleteOpen(true);
    },
  });

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Failed to load project</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Creatives</h1>
          <p className="text-muted-foreground">
            Manage your affiliate banners and text links.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/import">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Link>
          </Button>
          <Button
            onClick={() => {
              setSelectedCreative(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Creative
          </Button>
        </div>
      </div>

      {creatives.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={offerFilter}
            onValueChange={setOfferFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by offer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Offers</SelectItem>
              {offers.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {sizes.length > 0 && (
            <Select
              value={sizeFilter}
              onValueChange={setSizeFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                {sizes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {creatives.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-border bg-background">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No creatives yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Add creatives manually or use bulk import to paste Awin HTML
              snippets.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/import">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Import
                </Link>
              </Button>
              <Button
                onClick={() => {
                  setSelectedCreative(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Creative
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCreatives}
          isLoading={isLoading}
        />
      )}

      <CreativeForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setSelectedCreative(null);
        }}
        onSubmit={selectedCreative ? handleUpdate : handleCreate}
        creative={selectedCreative || undefined}
        offers={offers}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Creative"
        description="Are you sure you want to delete this creative? This will also remove any targeting rules using it."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
