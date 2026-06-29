import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

// Auth Supabase (Google OAuth): refresca a sessão e protege tudo exceto /login,
// /auth/* e assets. Substitui o gate de password (Passo C, decisions/0002).
export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
}
