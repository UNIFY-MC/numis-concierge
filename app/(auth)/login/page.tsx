import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, sessionToken } from '@/lib/auth-gate'

async function entrar(formData: FormData) {
  'use server'
  const password = String(formData.get('password') ?? '')
  const esperada = process.env.APP_PASSWORD

  if (esperada && password === esperada) {
    const jar = await cookies()
    jar.set(SESSION_COOKIE, await sessionToken(esperada), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    })
    redirect('/moedas')
  }
  redirect('/login?erro=1')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-mp-bg">
      <form
        action={entrar}
        className="w-full max-w-sm bg-mp-surface border border-mp-border rounded-2xl p-8 shadow-sm"
      >
        <h1 className="text-xl font-serif font-semibold mb-1">
          Moedas do <span className="text-mp-gold">Pinto</span>
        </h1>
        <p className="text-sm text-mp-ink-soft mb-6">Introduz a password de acesso.</p>

        <input
          type="password"
          name="password"
          autoFocus
          placeholder="Password"
          className="w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-mp-gold mb-3"
        />

        {erro && (
          <p className="text-sm text-mp-falta mb-3">Password incorrecta.</p>
        )}

        <button
          type="submit"
          className="w-full bg-mp-gold text-white rounded-lg py-2.5 text-sm font-medium hover:bg-mp-gold-strong"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}
