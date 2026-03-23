import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase browser client factory.
 * Uses createBrowserClient which internally handles singleton behavior.
 * We keep this as a factory to maintain proper TypeScript types.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}
