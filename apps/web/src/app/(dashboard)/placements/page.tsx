'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { DeleteDialog } from '@/components/delete-dialog';
import { PlacementForm } from '@/components/placements/placement-form';
import { getColumns } from '@/components/placements/columns';
import {
  usePlacements,
  useCreatePlacement,
  useUpdatePlacement,
  useDeletePlacement,
} from '@/hooks/use-placements';
import { useProject } from '@/providers/project-provider';
import type { Placement, CreatePlacementRequest } from '@affilimate/types';

export default function PlacementsPage() {
  const { project, isLoading: projectLoading } = useProject();
  const { data: placements = [], isLoading } = usePlacements();
  const createMutation = useCreatePlacement();
  const updateMutation = useUpdatePlacement();
  const deleteMutation = useDeletePlacement();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(
    null
  );

  const handleCreate = (data: CreatePlacementRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Placement created');
        setFormOpen(false);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const handleUpdate = (data: CreatePlacementRequest) => {
    if (!selectedPlacement) return;
    updateMutation.mutate(
      { id: selectedPlacement.id, ...data },
      {
        onSuccess: () => {
          toast.success('Placement updated');
          setFormOpen(false);
          setSelectedPlacement(null);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!selectedPlacement) return;
    deleteMutation.mutate(selectedPlacement.id, {
      onSuccess: () => {
        toast.success('Placement deleted');
        setDeleteOpen(false);
        setSelectedPlacement(null);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const columns = getColumns({
    onEdit: (placement) => {
      setSelectedPlacement(placement);
      setFormOpen(true);
    },
    onDelete: (placement) => {
      setSelectedPlacement(placement);
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
          <h1 className="text-2xl font-bold tracking-tight">Placements</h1>
          <p className="text-muted-foreground">
            Manage where your creatives will be displayed.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedPlacement(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Placement
        </Button>
      </div>

      {placements.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-border bg-background">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No placements yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first placement to start serving affiliate creatives.
            </p>
            <Button
              onClick={() => {
                setSelectedPlacement(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Placement
            </Button>
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={placements} isLoading={isLoading} />
      )}

      <PlacementForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setSelectedPlacement(null);
        }}
        onSubmit={selectedPlacement ? handleUpdate : handleCreate}
        placement={selectedPlacement || undefined}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Placement"
        description="Are you sure you want to delete this placement? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
