import type { SearchResult } from '../supabase/types';

export async function hashSearchResults(results: SearchResult[]): Promise<string> {
  const payload = results.map(r => `${r.url}|${r.title}`).join('\n');
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
