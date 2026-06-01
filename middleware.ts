import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, isValidSession } from '@/lib/auth-gate'

export async function middleware(req: NextRequest) {
  const ok = await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)
  if (ok) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

// Protege tudo excepto a página de login, internos do Next e ficheiros estáticos.
export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|.*\\.).*)'],
}
