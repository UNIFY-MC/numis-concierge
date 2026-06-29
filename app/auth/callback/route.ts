import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Recebe o code do Google OAuth e troca-o por uma sessão (cookies).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/moedas'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?erro=auth`)
}
