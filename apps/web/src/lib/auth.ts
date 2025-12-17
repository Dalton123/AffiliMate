import { hashApiKey } from './api-key-utils';
import { createAdminClient } from './supabase/server';

export type ApiKeyValidationResult =
  | { valid: true; projectId: string }
  | { valid: false; error: 'missing_api_key' | 'invalid_api_key' | 'api_key_expired' | 'api_key_inactive' | 'insufficient_scope' };

export async function validateApiKey(apiKey: string | null): Promise<ApiKeyValidationResult> {
  // Check if key is provided
  if (!apiKey) {
    return { valid: false, error: 'missing_api_key' };
  }

  // Validate key format
  if (!apiKey.startsWith('am_live_') && !apiKey.startsWith('am_test_')) {
    return { valid: false, error: 'invalid_api_key' };
  }

  // Hash the key for lookup
  const keyHash = hashApiKey(apiKey);

  // Use admin client to bypass RLS
  const supabase = await createAdminClient();

  // Look up the API key by hash
  const { data: apiKeyRecord, error } = await supabase
    .from('api_keys')
    .select('id, project_id, is_active, expires_at, scopes')
    .eq('key_hash', keyHash)
    .single();

  if (error || !apiKeyRecord) {
    return { valid: false, error: 'invalid_api_key' };
  }

  // Check if key is active
  if (!apiKeyRecord.is_active) {
    return { valid: false, error: 'api_key_inactive' };
  }

  // Check expiration
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return { valid: false, error: 'api_key_expired' };
  }

  // Check scope includes 'serve'
  const scopes = apiKeyRecord.scopes as string[];
  if (!scopes.includes('serve')) {
    return { valid: false, error: 'insufficient_scope' };
  }

  // Update last_used_at timestamp (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyRecord.id)
    .then(() => {});

  return { valid: true, projectId: apiKeyRecord.project_id };
}
