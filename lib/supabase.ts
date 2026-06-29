import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY em falta')
}

// Singleton de browser: persiste a sessão Supabase em cookies (Google OAuth) e
// envia o JWT em cada query — a RLS por user_id passa a aplicar-se sozinha.
export const supabase = createBrowserClient(url, key, {
  db: { schema: 'numis' },
})
