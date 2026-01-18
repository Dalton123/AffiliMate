"use client";

import { useState, useMemo } from "react";
import { Plus, Loader2, Tag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { DealForm } from "@/components/deals/deal-form";
import { getColumns } from "@/components/deals/columns";
import {
  useDeals,
  useCreateDeal,
  useUpdateDeal,
  useDeleteDeal,
  type Deal,
  type CreateDealRequest,
} from "@/hooks/use-deals";
import { useSyncPromotions, useAwinConnection } from "@/hooks/use-awin";

type FilterValue = "all" | "active" | "awin" | "manual";

export default function DealsPage() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null);

  // Build filter params
  const filterParams = useMemo(() => {
    switch (filter) {
      case "active":
        return { active: true };
      case "awin":
        return { awinOnly: true };
      case "manual":
        return { manualOnly: true };
      default:
        return {};
    }
  }, [filter]);

  const { data: deals, isLoading } = useDeals(filterParams);
  const { data: awinConnection } = useAwinConnection();
  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();
  const deleteMutation = useDeleteDeal();
  const syncMutation = useSyncPromotions();

  const handleCreate = async (data: CreateDealRequest) => {
    await createMutation.mutateAsync(data);
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormOpen(true);
  };

  const handleUpdate = async (data: CreateDealRequest) => {
    if (!editingDeal) return;
    await updateMutation.mutateAsync({ id: editingDeal.id, ...data });
    setEditingDeal(null);
  };

  const handleDelete = async () => {
    if (!deletingDeal) return;
    await deleteMutation.mutateAsync(deletingDeal.id);
    setDeletingDeal(null);
  };

  const handleToggleFeatured = async (deal: Deal) => {
    await updateMutation.mutateAsync({
      id: deal.id,
      is_featured: !deal.is_featured,
    });
  };

  const handleToggleActive = async (deal: Deal) => {
    await updateMutation.mutateAsync({
      id: deal.id,
      is_active: !deal.is_active,
    });
  };

  const handleSync = async () => {
    await syncMutation.mutateAsync();
  };

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: handleEdit,
        onDelete: setDeletingDeal,
        onToggleFeatured: handleToggleFeatured,
        onToggleActive: handleToggleActive,
      }),
    []
  );

  const isConnected = awinConnection?.connected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">
            Manage affiliate deals synced from Awin or created manually.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Awin
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Deal
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter deals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deals</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="awin">Awin Synced</SelectItem>
            <SelectItem value="manual">Manual Only</SelectItem>
          </SelectContent>
        </Select>
        {deals && (
          <span className="text-sm text-muted-foreground">
            {deals.length} deal{deals.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Sync Result Toast */}
      {syncMutation.isSuccess && syncMutation.data && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <p className="text-sm text-green-800 dark:text-green-200">
            Synced {syncMutation.data.result.synced} promotions
            ({syncMutation.data.result.created} new, {syncMutation.data.result.updated} updated)
          </p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : deals && deals.length > 0 ? (
        <DataTable columns={columns} data={deals} />
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No deals yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {isConnected
                ? "Sync promotions from Awin or create deals manually."
                : "Create deals manually or connect Awin to sync promotions."}
            </p>
            <div className="flex items-center justify-center gap-2">
              {isConnected && (
                <Button variant="outline" onClick={handleSync}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync from Awin
                </Button>
              )}
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Deal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      <DealForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingDeal(null);
        }}
        deal={editingDeal}
        onSubmit={editingDeal ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteDialog
        open={!!deletingDeal}
        onOpenChange={(open) => !open && setDeletingDeal(null)}
        onConfirm={handleDelete}
        title="Delete Deal"
        description={`Are you sure you want to delete "${deletingDeal?.title}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
