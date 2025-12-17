'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Upload, ArrowLeft, ArrowRight, Check, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOffers } from '@/hooks/use-offers';
import { usePlacements } from '@/hooks/use-placements';
import { useImportCreatives } from '@/hooks/use-import-creatives';
import { parseSnippets, type ParseResult } from '@/lib/snippet-parser';
import type { ImportCreativesResponse } from '@affilimate/types';

type Step = 'configure' | 'preview' | 'complete';

export default function ImportPage() {
  // Step state
  const [step, setStep] = useState<Step>('configure');

  // Form state
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [snippetsText, setSnippetsText] = useState<string>('');
  const [defaultCountries, setDefaultCountries] = useState<string>('');
  const [autoCreateRules, setAutoCreateRules] = useState<boolean>(false);
  const [targetPlacementId, setTargetPlacementId] = useState<string>('');

  // Preview state
  const [parsedSnippets, setParsedSnippets] = useState<ParseResult[]>([]);
  const [loadedDimensions, setLoadedDimensions] = useState<Record<number, { width: number; height: number }>>({});

  // Results state
  const [importResults, setImportResults] = useState<ImportCreativesResponse | null>(null);

  // Data fetching
  const { data: offers = [], isLoading: offersLoading } = useOffers();
  const { data: placements = [], isLoading: placementsLoading } = usePlacements();
  const importMutation = useImportCreatives();

  // Computed values
  const validSnippets = parsedSnippets.filter((p) => p.parsed && p.parsed.click_url);
  const invalidSnippets = parsedSnippets.filter((p) => !p.parsed || !p.parsed.click_url);

  // Handlers
  const handlePreview = () => {
    if (!selectedOfferId) {
      toast.error('Please select an offer');
      return;
    }
    if (!snippetsText.trim()) {
      toast.error('Please paste at least one snippet');
      return;
    }
    if (autoCreateRules && !targetPlacementId) {
      toast.error('Please select a placement for auto-creating rules');
      return;
    }

    const results = parseSnippets(snippetsText);
    if (results.length === 0) {
      toast.error('No valid snippets found');
      return;
    }

    setParsedSnippets(results);
    setLoadedDimensions({}); // Reset loaded dimensions for new preview
    setStep('preview');
  };

  const handleImport = async () => {
    if (validSnippets.length === 0) {
      toast.error('No valid snippets to import');
      return;
    }

    // Parse country codes from comma-separated string
    const countries = defaultCountries
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length === 2);

    // Build dimensions array matching the snippets order
    const dimensions = validSnippets.map((s) => {
      const loaded = loadedDimensions[s.index];
      if (loaded) return loaded;
      if (s.parsed?.width && s.parsed?.height) {
        return { width: s.parsed.width, height: s.parsed.height };
      }
      return null;
    });

    try {
      const result = await importMutation.mutateAsync({
        offer_id: selectedOfferId,
        snippets: validSnippets.map((s) => s.raw),
        source: 'awin',
        default_countries: countries.length > 0 ? countries : undefined,
        auto_create_rules: autoCreateRules,
        target_placement_id: autoCreateRules ? targetPlacementId : undefined,
        dimensions,
      });

      setImportResults(result);
      setStep('complete');

      if (result.failed === 0) {
        toast.success(`Successfully imported ${result.imported} creatives`);
      } else {
        toast.warning(`Imported ${result.imported} creatives, ${result.failed} failed`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    }
  };

  const handleReset = () => {
    setStep('configure');
    setSelectedOfferId('');
    setSnippetsText('');
    setDefaultCountries('');
    setAutoCreateRules(false);
    setTargetPlacementId('');
    setParsedSnippets([]);
    setLoadedDimensions({});
    setImportResults(null);
  };

  // Render helpers
  const renderConfigureStep = () => (
    <div className="rounded-lg border border-border bg-background p-6 space-y-6">
      {/* Offer Select */}
      <div className="space-y-2">
        <Label htmlFor="offer">Select Offer</Label>
        {offersLoading ? (
          <div className="h-10 bg-muted animate-pulse rounded-md" />
        ) : offers.length === 0 ? (
          <div className="p-4 border border-dashed border-border rounded-md">
            <p className="text-sm text-muted-foreground">
              No offers found.{' '}
              <Link href="/offers" className="text-primary hover:underline">
                Create an offer
              </Link>{' '}
              before importing creatives.
            </p>
          </div>
        ) : (
          <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an offer..." />
            </SelectTrigger>
            <SelectContent>
              {offers.map((offer) => (
                <SelectItem key={offer.id} value={offer.id}>
                  {offer.name}
                  {offer.advertiser_name && ` (${offer.advertiser_name})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          All imported creatives will be assigned to this offer.
        </p>
      </div>

      {/* Snippets Textarea */}
      <div className="space-y-2">
        <Label htmlFor="snippets">HTML Snippets</Label>
        <Textarea
          id="snippets"
          value={snippetsText}
          onChange={(e) => setSnippetsText(e.target.value)}
          rows={10}
          placeholder={'Paste Awin HTML snippets here, one per line:\n\n<a href="https://www.awin1.com/cread.php?..."><img src="https://www.awin1.com/cshow.php?..." width="300" height="250"></a>'}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Each line should contain a complete HTML snippet from Awin.
        </p>
      </div>

      {/* Options Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Default Countries */}
        <div className="space-y-2">
          <Label htmlFor="countries">Default Countries (optional)</Label>
          <Input
            id="countries"
            value={defaultCountries}
            onChange={(e) => setDefaultCountries(e.target.value)}
            placeholder="US, CA, GB"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated country codes to apply to targeting rules.
          </p>
        </div>

        {/* Auto-create Rules */}
        <div className="space-y-2">
          <Label>Auto-create Targeting Rules</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoCreateRules"
              checked={autoCreateRules}
              onChange={(e) => setAutoCreateRules(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="autoCreateRules" className="text-sm">
              Create rules for a placement
            </label>
          </div>
          {autoCreateRules && (
            <div className="mt-2">
              {placementsLoading ? (
                <div className="h-10 bg-muted animate-pulse rounded-md" />
              ) : placements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No placements found.{' '}
                  <Link href="/placements" className="text-primary hover:underline">
                    Create a placement
                  </Link>{' '}
                  first.
                </p>
              ) : (
                <Select value={targetPlacementId} onValueChange={setTargetPlacementId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select placement..." />
                  </SelectTrigger>
                  <SelectContent>
                    {placements.map((placement) => (
                      <SelectItem key={placement.id} value={placement.id}>
                        {placement.name} ({placement.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handlePreview}
          disabled={!selectedOfferId || !snippetsText.trim() || offers.length === 0}
        >
          Preview Import
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
        <div className="flex items-center gap-2 text-green-600">
          <Check className="w-4 h-4" />
          <span className="font-medium">{validSnippets.length} valid</span>
        </div>
        {invalidSnippets.length > 0 && (
          <div className="flex items-center gap-2 text-red-600">
            <X className="w-4 h-4" />
            <span className="font-medium">{invalidSnippets.length} errors</span>
          </div>
        )}
      </div>

      {/* Preview Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Preview</th>
              <th className="px-4 py-3 text-left font-medium">Dimensions</th>
              <th className="px-4 py-3 text-left font-medium">Click URL</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parsedSnippets.map((result) => (
              <tr key={result.index} className="bg-background">
                <td className="px-4 py-3">
                  {result.parsed?.image_url ? (
                    <img
                      src={result.parsed.image_url}
                      alt="Preview"
                      className="max-w-[100px] max-h-[60px] object-contain rounded border border-border"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (img.naturalWidth && img.naturalHeight) {
                          setLoadedDimensions((prev) => ({
                            ...prev,
                            [result.index]: { width: img.naturalWidth, height: img.naturalHeight },
                          }));
                        }
                      }}
                    />
                  ) : (
                    <div className="w-[100px] h-[60px] bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const dims = loadedDimensions[result.index] || {
                      width: result.parsed?.width,
                      height: result.parsed?.height,
                    };
                    return dims.width && dims.height ? (
                      <span className="font-mono">
                        {dims.width}x{dims.height}
                        {loadedDimensions[result.index] && !result.parsed?.width && (
                          <span className="ml-1 text-xs text-green-600">(detected)</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Loading...</span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  {result.parsed?.click_url ? (
                    <span className="font-mono text-xs truncate block max-w-[300px]" title={result.parsed.click_url}>
                      {result.parsed.click_url.slice(0, 50)}...
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {result.parsed && result.parsed.click_url ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <Check className="w-4 h-4" />
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600" title={result.error}>
                      <X className="w-4 h-4" />
                      {result.error || 'Invalid'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('configure')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={validSnippets.length === 0 || importMutation.isPending}
        >
          {importMutation.isPending ? (
            'Importing...'
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import {validSnippets.length} Creative{validSnippets.length !== 1 && 's'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="p-6 rounded-lg border border-border bg-background text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
          <Check className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Import Complete</h2>
        <p className="text-muted-foreground">
          Successfully imported {importResults?.imported || 0} creative
          {importResults?.imported !== 1 && 's'}
          {importResults?.failed ? `, ${importResults.failed} failed` : ''}.
        </p>
      </div>

      {/* Results Details */}
      {importResults && importResults.results.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {importResults.results.map((result) => (
                <tr key={result.index} className="bg-background">
                  <td className="px-4 py-3 font-mono">{result.index + 1}</td>
                  <td className="px-4 py-3">
                    {result.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <X className="w-4 h-4" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {result.status === 'success' && result.parsed ? (
                      <span className="text-muted-foreground">
                        {result.parsed.width}x{result.parsed.height} banner created
                      </span>
                    ) : (
                      <span className="text-red-600">{result.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={handleReset}>
          Import More
        </Button>
        <Button asChild>
          <Link href="/creatives">
            View Creatives
            <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Creatives</h1>
        <p className="text-muted-foreground">
          Paste Awin HTML snippets to bulk import creatives.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`px-3 py-1 rounded-full ${
            step === 'configure'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          1. Configure
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <span
          className={`px-3 py-1 rounded-full ${
            step === 'preview'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          2. Preview
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <span
          className={`px-3 py-1 rounded-full ${
            step === 'complete'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          3. Complete
        </span>
      </div>

      {/* Step Content */}
      {step === 'configure' && renderConfigureStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'complete' && renderCompleteStep()}
    </div>
  );
}
