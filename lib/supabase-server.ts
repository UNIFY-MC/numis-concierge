import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente de servidor (Server Components, Route Handlers, Server Actions). Lê e
// escreve a sessão via cookies. Schema 'numis' como o cliente de browser.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'numis' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Chamado de um Server Component — ignorar (o middleware refresca a sessão).
          }
        },
      },
    },
  )
}
