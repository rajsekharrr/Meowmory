import { createServerClient as _createServerClient, createBrowserClient as _createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-side client using service role key — for API routes only. */
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return _createServerClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/** Browser-side client using anon key — for client components and hooks. */
export function createBrowserClient() {
  return _createBrowserClient(url, anonKey);
}
