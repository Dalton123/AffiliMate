"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plug, RefreshCw, Unplug, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAwinConnection,
  useConnectAwin,
  useDisconnectAwin,
  useSyncPromotions,
} from "@/hooks/use-awin";

interface ConnectFormData {
  publisher_id: string;
  api_token: string;
}

export default function AwinPage() {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const { data, isLoading } = useAwinConnection();
  const connectMutation = useConnectAwin();
  const disconnectMutation = useDisconnectAwin();
  const syncMutation = useSyncPromotions();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ConnectFormData>();

  const onConnect = async (formData: ConnectFormData) => {
    try {
      await connectMutation.mutateAsync(formData);
      reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const onDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      setShowDisconnectDialog(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const onSync = async () => {
    try {
      await syncMutation.mutateAsync();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connection = data?.connection;
  const isConnected = data?.connected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Awin Integration</h1>
        <p className="text-muted-foreground">
          Connect your Awin publisher account to sync promotions and deals.
        </p>
      </div>

      {/* Connection Status */}
      {isConnected && connection && (
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h3 className="font-medium">Connected to Awin</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Publisher ID: <code className="rounded bg-muted px-1">{connection.publisher_id}</code>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Promotions
            </Button>
          </div>

          {/* Sync Status */}
          <div className="mt-4 rounded-md bg-muted/50 p-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                {connection.sync_status === "success" && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Success
                  </span>
                )}
                {connection.sync_status === "failed" && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" /> Failed
                  </span>
                )}
                {connection.sync_status === "pending" && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Clock className="h-4 w-4" /> Pending
                  </span>
                )}
              </div>
              {connection.last_sync_at && (
                <div>
                  <span className="text-muted-foreground">Last sync:</span>{" "}
                  {new Date(connection.last_sync_at).toLocaleString()}
                </div>
              )}
            </div>
            {connection.sync_error && (
              <p className="mt-2 text-sm text-destructive">{connection.sync_error}</p>
            )}
          </div>

          {/* Sync Result */}
          {syncMutation.isSuccess && syncMutation.data && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Sync completed successfully!
              </p>
              <ul className="mt-2 text-sm text-green-700 dark:text-green-300">
                <li>Created: {syncMutation.data.result.created}</li>
                <li>Updated: {syncMutation.data.result.updated}</li>
                <li>Total synced: {syncMutation.data.result.synced}</li>
                {syncMutation.data.result.errors.length > 0 && (
                  <li className="text-destructive">
                    Errors: {syncMutation.data.result.errors.length}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Connect Form (when not connected) */}
      {!isConnected && (
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Connect Awin Account</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your Awin publisher credentials to enable promotion syncing.
            </p>
          </div>

          <form onSubmit={handleSubmit(onConnect)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publisher_id">Publisher ID</Label>
              <Input
                id="publisher_id"
                placeholder="Your Awin publisher ID"
                {...register("publisher_id", { required: "Publisher ID is required" })}
              />
              {errors.publisher_id && (
                <p className="text-sm text-destructive">{errors.publisher_id.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Found in your Awin dashboard URL or account settings.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_token">API Token</Label>
              <Input
                id="api_token"
                type="password"
                placeholder="Your Awin OAuth token"
                {...register("api_token", { required: "API token is required" })}
              />
              {errors.api_token && (
                <p className="text-sm text-destructive">{errors.api_token.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Generate from{" "}
                <a
                  href="https://ui.awin.com/awin-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  ui.awin.com/awin-api
                </a>
              </p>
            </div>

            {connectMutation.isError && (
              <p className="text-sm text-destructive">
                {connectMutation.error?.message || "Failed to connect"}
              </p>
            )}

            <Button type="submit" disabled={connectMutation.isPending}>
              {connectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plug className="mr-2 h-4 w-4" />
              )}
              Connect
            </Button>
          </form>
        </div>
      )}

      {/* Danger Zone */}
      {isConnected && (
        <div className="rounded-lg border border-destructive/50 bg-background p-6">
          <h3 className="font-medium text-destructive">Danger Zone</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Disconnecting will stop syncing promotions. Existing deals will remain.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => setShowDisconnectDialog(true)}
          >
            <Unplug className="mr-2 h-4 w-4" />
            Disconnect Awin
          </Button>
        </div>
      )}

      {/* Disconnect Confirmation */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Awin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your Awin credentials and stop syncing promotions.
              Existing deals will remain but won&apos;t be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
