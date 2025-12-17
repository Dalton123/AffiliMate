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
import { RuleForm } from '@/components/rules/rule-form';
import { getColumns } from '@/components/rules/columns';
import {
  useRules,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
} from '@/hooks/use-rules';
import { usePlacements } from '@/hooks/use-placements';
import { useCreatives } from '@/hooks/use-creatives';
import { useProject } from '@/providers/project-provider';
import type { TargetingRule, CreateRuleRequest } from '@affilimate/types';

export default function RulesPage() {
  const { project, isLoading: projectLoading } = useProject();
  const { data: rules = [], isLoading } = useRules();
  const { data: placements = [] } = usePlacements();
  const { data: creatives = [] } = useCreatives();
  const createMutation = useCreateRule();
  const updateMutation = useUpdateRule();
  const deleteMutation = useDeleteRule();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TargetingRule | null>(null);
  const [placementFilter, setPlacementFilter] = useState<string>('all');

  // Filter rules by placement
  const filteredRules = useMemo(() => {
    if (placementFilter === 'all') return rules;
    return rules.filter((r) => r.placement_id === placementFilter);
  }, [rules, placementFilter]);

  const handleCreate = (data: CreateRuleRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Rule created');
        setFormOpen(false);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const handleUpdate = (data: CreateRuleRequest) => {
    if (!selectedRule) return;
    updateMutation.mutate(
      { id: selectedRule.id, ...data },
      {
        onSuccess: () => {
          toast.success('Rule updated');
          setFormOpen(false);
          setSelectedRule(null);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!selectedRule) return;
    deleteMutation.mutate(selectedRule.id, {
      onSuccess: () => {
        toast.success('Rule deleted');
        setDeleteOpen(false);
        setSelectedRule(null);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const columns = getColumns({
    onEdit: (rule) => {
      setSelectedRule(rule);
      setFormOpen(true);
    },
    onDelete: (rule) => {
      setSelectedRule(rule);
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
          <h1 className="text-2xl font-bold tracking-tight">Targeting Rules</h1>
          <p className="text-muted-foreground">
            Configure which creatives show for each placement based on country,
            category, and priority.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedRule(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {rules.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={placementFilter}
            onValueChange={setPlacementFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by placement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Placements</SelectItem>
              {placements.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {rules.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-border bg-background">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No rules yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create targeting rules to connect placements with creatives.
            </p>
            <Button
              onClick={() => {
                setSelectedRule(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRules}
          isLoading={isLoading}
        />
      )}

      <RuleForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setSelectedRule(null);
        }}
        onSubmit={selectedRule ? handleUpdate : handleCreate}
        rule={selectedRule || undefined}
        placements={placements}
        creatives={creatives}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Rule"
        description="Are you sure you want to delete this targeting rule?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
