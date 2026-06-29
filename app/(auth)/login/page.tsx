'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

function LoginCard() {
  const params = useSearchParams()
  const erro = params.get('erro')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function entrarGoogle() {
    setLoading(true)
    setMsg('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setLoading(false)
      setMsg(error.message)
    }
  }

  const aviso =
    erro === 'acesso'
      ? 'Esta conta não tem acesso a esta colecção.'
      : erro === 'auth'
        ? 'Não foi possível concluir o início de sessão.'
        : msg

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-mp-bg">
      <div className="w-full max-w-sm bg-mp-surface border border-mp-border rounded-2xl p-8 shadow-sm">
        <h1 className="text-xl font-serif font-semibold mb-1">
          Moedas do <span className="text-mp-gold">Pinto</span>
        </h1>
        <p className="text-sm text-mp-ink-soft mb-6">Inicia sessão para aceder à colecção.</p>

        <button
          type="button"
          onClick={entrarGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-mp-surface border border-mp-border rounded-lg py-2.5 text-sm font-medium hover:border-mp-gold disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? 'A redireccionar…' : 'Entrar com Google'}
        </button>

        {aviso && <p className="text-sm text-mp-falta mt-3">{aviso}</p>}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  )
}
