'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { DeleteDialog } from '@/components/delete-dialog';
import { ApiKeyForm } from '@/components/api-keys/api-key-form';
import { KeyDisplay } from '@/components/api-keys/key-display';
import { getColumns } from '@/components/api-keys/columns';
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from '@/hooks/use-api-keys';
import { useProject } from '@/providers/project-provider';
import type { ApiKey, CreateApiKeyRequest, CreateApiKeyResponse } from '@affilimate/types';

export default function ApiKeysPage() {
  const { project, isLoading: projectLoading } = useProject();
  const { data: apiKeys = [], isLoading } = useApiKeys();
  const createMutation = useCreateApiKey();
  const deleteMutation = useDeleteApiKey();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [keyDisplayOpen, setKeyDisplayOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null);

  const handleCreate = (data: CreateApiKeyRequest) => {
    createMutation.mutate(data, {
      onSuccess: (response) => {
        setFormOpen(false);
        setNewKey(response);
        setKeyDisplayOpen(true);
        toast.success('API key created');
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const handleDelete = () => {
    if (!selectedApiKey) return;
    deleteMutation.mutate(selectedApiKey.id, {
      onSuccess: () => {
        toast.success('API key revoked');
        setDeleteOpen(false);
        setSelectedApiKey(null);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const columns = getColumns({
    onDelete: (apiKey) => {
      setSelectedApiKey(apiKey);
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
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for accessing the serve endpoint.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {apiKeys.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-border bg-background">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No API keys yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create an API key to start using the serve endpoint.
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={apiKeys} isLoading={isLoading} />
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="mb-2 font-medium">Usage Example</h3>
        <pre className="overflow-x-auto rounded-md bg-background p-3 text-sm font-mono">
{`curl "https://your-domain.com/api/v1/serve?placement=sidebar&country=US" \\
  -H "X-API-Key: am_live_xxxxx..."`}
        </pre>
      </div>

      <ApiKeyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {newKey && (
        <KeyDisplay
          open={keyDisplayOpen}
          onOpenChange={(open) => {
            setKeyDisplayOpen(open);
            if (!open) setNewKey(null);
          }}
          apiKey={newKey.key}
          keyName={newKey.name}
        />
      )}

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Revoke API Key"
        description="Are you sure you want to revoke this API key? Any applications using this key will no longer be able to access the API."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
