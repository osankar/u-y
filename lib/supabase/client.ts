import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Fails at runtime (not module load) if env vars are absent — safe for builds without .env.local
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
