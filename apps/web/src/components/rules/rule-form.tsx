'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  TargetingRule,
  Placement,
  Creative,
  CreateRuleRequest,
} from '@affilimate/types';

interface RuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateRuleRequest) => void;
  rule?: TargetingRule;
  placements: Placement[];
  creatives: Creative[];
  isLoading?: boolean;
}

// Common country codes
const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
];

export function RuleForm({
  open,
  onOpenChange,
  onSubmit,
  rule,
  placements,
  creatives,
  isLoading,
}: RuleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateRuleRequest>({
    defaultValues: {
      placement_id: '',
      creative_id: '',
      countries: [],
      categories: [],
      priority: 50,
      weight: 100,
    },
  });

  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const placementId = watch('placement_id');
  const creativeId = watch('creative_id');
  const priority = watch('priority');
  const weight = watch('weight');

  useEffect(() => {
    if (rule) {
      reset({
        placement_id: rule.placement_id,
        creative_id: rule.creative_id,
        countries: rule.countries,
        categories: rule.categories,
        priority: rule.priority,
        weight: rule.weight,
      });
      setSelectedCountries(rule.countries);
    } else {
      reset({
        placement_id: placements[0]?.id || '',
        creative_id: creatives[0]?.id || '',
        countries: [],
        categories: [],
        priority: 50,
        weight: 100,
      });
      setSelectedCountries([]);
    }
  }, [rule, placements, creatives, reset]);

  const addCountry = (code: string) => {
    if (!selectedCountries.includes(code)) {
      const updated = [...selectedCountries, code];
      setSelectedCountries(updated);
      setValue('countries', updated);
    }
  };

  const removeCountry = (code: string) => {
    const updated = selectedCountries.filter((c) => c !== code);
    setSelectedCountries(updated);
    setValue('countries', updated);
  };

  const onFormSubmit = (data: CreateRuleRequest) => {
    onSubmit({ ...data, countries: selectedCountries });
  };

  const canSubmit = placements.length > 0 && creatives.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="placement_id">Placement</Label>
            <Select
              value={placementId}
              onValueChange={(v) => setValue('placement_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a placement" />
              </SelectTrigger>
              <SelectContent>
                {placements.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {placements.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Create a placement first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="creative_id">Creative</Label>
            <Select
              value={creativeId}
              onValueChange={(v) => setValue('creative_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a creative" />
              </SelectTrigger>
              <SelectContent>
                {creatives.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.size && ` (${c.size})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {creatives.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Create a creative first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Countries (empty = all countries)</Label>
            <Select onValueChange={addCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Add country..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_COUNTRIES.filter(
                  (c) => !selectedCountries.includes(c.code)
                ).map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCountries.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedCountries.map((code) => (
                  <Badge key={code} variant="secondary" className="gap-1">
                    {code}
                    <button
                      type="button"
                      onClick={() => removeCountry(code)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (0-100)</Label>
              <Input
                id="priority"
                type="number"
                min={0}
                max={100}
                {...register('priority', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Higher = preferred
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (1-100)</Label>
              <Input
                id="weight"
                type="number"
                min={1}
                max={100}
                {...register('weight', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Random selection weight
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading ? 'Saving...' : rule ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
