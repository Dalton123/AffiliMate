'use client';

import { useState } from 'react';
import { Play, Copy, Check, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlacements } from '@/hooks/use-placements';
import type { ServeResponse, CreativeFormat } from '@affilimate/types';

const FORMATS: { value: CreativeFormat | 'all'; label: string }[] = [
  { value: 'all', label: 'Any format' },
  { value: 'banner', label: 'Banner' },
  { value: 'text', label: 'Text Link' },
  { value: 'native', label: 'Native' },
];

export default function TestPage() {
  // Form state
  const [placementId, setPlacementId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [size, setSize] = useState('');
  const [format, setFormat] = useState('all');

  // Response state
  const [response, setResponse] = useState<ServeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Data fetching
  const { data: placements = [], isLoading: placementsLoading } = usePlacements();

  const selectedPlacement = placements.find((p) => p.id === placementId);

  const handleTest = async () => {
    if (!selectedPlacement) {
      toast.error('Please select a placement');
      return;
    }
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const params = new URLSearchParams({
        placement: selectedPlacement.slug,
        debug: 'true',
      });
      if (country.trim()) params.set('country', country.trim().toUpperCase());
      if (category.trim()) params.set('category', category.trim());
      if (size.trim()) params.set('size', size.trim());
      if (format && format !== 'all') params.set('format', format);

      const res = await fetch(`/api/v1/serve?${params}`, {
        headers: { 'X-API-Key': apiKey.trim() },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Request failed');
        return;
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyClickUrl = async () => {
    if (!response?.creative?.click_url) return;
    await navigator.clipboard.writeText(response.creative.click_url);
    setCopied(true);
    toast.success('Click URL copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Test Placement</h1>
        <p className="text-muted-foreground">
          Preview how your placements will serve creatives.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="rounded-lg border border-border bg-background p-6 space-y-4">
          <h2 className="font-semibold text-lg">Configuration</h2>

          {/* Placement */}
          <div className="space-y-2">
            <Label htmlFor="placement">Placement</Label>
            {placementsLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : placements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No placements found. Create a placement first.
              </p>
            ) : (
              <Select value={placementId} onValueChange={setPlacementId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a placement..." />
                </SelectTrigger>
                <SelectContent>
                  {placements.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="am_live_..."
            />
            <p className="text-xs text-muted-foreground">
              Enter your full API key (from the API Keys page).
            </p>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Country (optional)</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="US, GB, DE..."
              maxLength={2}
            />
            <p className="text-xs text-muted-foreground">
              2-letter ISO country code to simulate geo targeting.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (optional)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="electronics, fashion..."
            />
          </div>

          {/* Size & Format Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size (optional)</Label>
              <Input
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="300x250"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Any format" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Test Button */}
          <Button
            onClick={handleTest}
            disabled={isLoading || !placementId || !apiKey.trim()}
            className="w-full"
          >
            {isLoading ? (
              'Testing...'
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Test Placement
              </>
            )}
          </Button>
        </div>

        {/* Response Panel */}
        <div className="rounded-lg border border-border bg-background p-6 space-y-4">
          <h2 className="font-semibold text-lg">Response</h2>

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!response && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Info className="w-8 h-8 mb-2" />
              <p className="text-sm">Run a test to see the response</p>
            </div>
          )}

          {/* Response Content */}
          {response && (
            <div className="space-y-4">
              {/* Creative Preview */}
              {response.creative ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Creative</div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    {response.creative.image_url ? (
                      <img
                        src={response.creative.image_url}
                        alt={response.creative.alt_text || 'Creative preview'}
                        className="max-w-full h-auto rounded border border-border"
                        style={{
                          maxHeight: '200px',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <div className="h-24 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
                        No image (text link)
                      </div>
                    )}
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-mono">
                          {response.creative.width}x{response.creative.height}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Format:</span>
                        <span className="capitalize">{response.creative.format}</span>
                      </div>
                    </div>
                  </div>

                  {/* Click URL */}
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Click URL</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 rounded bg-muted text-xs font-mono truncate">
                        {response.creative.click_url}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyClickUrl}
                        className="shrink-0"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    No creative matched the criteria.
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                {/* Geo Info */}
                {response.geo && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Geo Detection
                    </div>
                    <div className="text-sm">
                      <span className="font-mono font-medium">
                        {response.geo.country || 'Unknown'}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        ({response.geo.source})
                      </span>
                    </div>
                  </div>
                )}

                {/* Fallback Status */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Fallback
                  </div>
                  <div className="text-sm">
                    {response.fallback ? (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        Yes ({response.fallback_type})
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">No</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Debug Info */}
              {response.debug && (
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Debug Info
                  </div>
                  <div className="p-3 rounded bg-muted/50 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rules matched:</span>
                      <span className="font-mono">{response.debug.rules_matched}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Selection:</span>
                      <p className="mt-1 text-xs font-mono">
                        {response.debug.selection_reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw JSON */}
              <details className="pt-4 border-t border-border">
                <summary className="text-xs text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground">
                  Raw JSON Response
                </summary>
                <pre className="mt-2 p-3 rounded bg-muted text-xs font-mono overflow-auto max-h-48">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
