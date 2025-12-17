import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  TargetingRule,
  CreateRuleRequest,
  UpdateRuleRequest,
} from '@affilimate/types';

const RULES_KEY = ['rules'];

async function fetchRules(): Promise<TargetingRule[]> {
  const res = await fetch('/api/admin/rules');
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch rules');
  }
  const { data } = await res.json();
  return data;
}

async function createRule(data: CreateRuleRequest): Promise<TargetingRule> {
  const res = await fetch('/api/admin/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create rule');
  }
  const { data: rule } = await res.json();
  return rule;
}

async function updateRule({
  id,
  ...data
}: UpdateRuleRequest & { id: string }): Promise<TargetingRule> {
  const res = await fetch(`/api/admin/rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update rule');
  }
  const { data: rule } = await res.json();
  return rule;
}

async function deleteRule(id: string): Promise<void> {
  const res = await fetch(`/api/admin/rules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete rule');
  }
}

export function useRules() {
  return useQuery({
    queryKey: RULES_KEY,
    queryFn: fetchRules,
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
  });
}
