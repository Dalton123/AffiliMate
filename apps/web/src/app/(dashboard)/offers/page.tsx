'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
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
import { OfferForm } from '@/components/offers/offer-form';
import { getColumns } from '@/components/offers/columns';
import {
  useOffers,
  useCreateOffer,
  useUpdateOffer,
  useDeleteOffer,
} from '@/hooks/use-offers';
import { useProject } from '@/providers/project-provider';
import type { Offer, CreateOfferRequest, AffiliateNetwork } from '@affilimate/types';

const NETWORK_OPTIONS: { value: AffiliateNetwork | 'all'; label: string }[] = [
  { value: 'all', label: 'All Networks' },
  { value: 'awin', label: 'Awin' },
  { value: 'shareasale', label: 'ShareASale' },
  { value: 'cj', label: 'CJ Affiliate' },
  { value: 'direct', label: 'Direct' },
];

export default function OffersPage() {
  const { project, isLoading: projectLoading } = useProject();
  const { data: offers = [], isLoading } = useOffers();
  const createMutation = useCreateOffer();
  const updateMutation = useUpdateOffer();
  const deleteMutation = useDeleteOffer();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [networkFilter, setNetworkFilter] = useState<AffiliateNetwork | 'all'>('all');

  const filteredOffers = useMemo(() => {
    if (networkFilter === 'all') return offers;
    return offers.filter((o) => o.network === networkFilter);
  }, [offers, networkFilter]);

  const handleCreate = (data: CreateOfferRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Offer created');
        setFormOpen(false);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const handleUpdate = (data: CreateOfferRequest) => {
    if (!selectedOffer) return;
    updateMutation.mutate(
      { id: selectedOffer.id, ...data },
      {
        onSuccess: () => {
          toast.success('Offer updated');
          setFormOpen(false);
          setSelectedOffer(null);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!selectedOffer) return;
    deleteMutation.mutate(selectedOffer.id, {
      onSuccess: () => {
        toast.success('Offer deleted');
        setDeleteOpen(false);
        setSelectedOffer(null);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const columns = getColumns({
    onEdit: (offer) => {
      setSelectedOffer(offer);
      setFormOpen(true);
    },
    onDelete: (offer) => {
      setSelectedOffer(offer);
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
          <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
          <p className="text-muted-foreground">
            Manage your affiliate advertisers and offers.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedOffer(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Offer
        </Button>
      </div>

      {offers.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={networkFilter}
            onValueChange={(v) => setNetworkFilter(v as AffiliateNetwork | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by network" />
            </SelectTrigger>
            <SelectContent>
              {NETWORK_OPTIONS.map((n) => (
                <SelectItem key={n.value} value={n.value}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {offers.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-border bg-background">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No offers yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Add your first affiliate offer to start tracking advertisers.
            </p>
            <Button
              onClick={() => {
                setSelectedOffer(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Offer
            </Button>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredOffers}
          isLoading={isLoading}
        />
      )}

      <OfferForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setSelectedOffer(null);
        }}
        onSubmit={selectedOffer ? handleUpdate : handleCreate}
        offer={selectedOffer || undefined}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Offer"
        description="Are you sure you want to delete this offer? This will also delete all associated creatives and targeting rules."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
