import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Emails autorizados (projeto pessoal). Vazio = qualquer conta Google entra (cada
// uma vê só a sua colecção via RLS). Preenchido = só estes emails passam.
function allowedEmails(): string[] {
  return (process.env.NUMIS_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

function isPublicPath(path: string): boolean {
  return path === '/login' || path.startsWith('/auth/')
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user) {
    if (isPublicPath(path)) return response
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Autenticado mas fora da allowlist (quando definida) → barra o acesso.
  const allow = allowedEmails()
  const email = (user.email ?? '').toLowerCase()
  if (allow.length > 0 && !allow.includes(email)) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = '?erro=acesso'
    return NextResponse.redirect(url)
  }

  if (path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/moedas'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
