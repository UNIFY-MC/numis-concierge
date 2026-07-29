'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import SkinToggle from '@/components/ui/SkinToggle'

// Navegação principal. Só Dashboard e Moedas têm página; o resto fica visível
// mas desativado com chip "em breve" (fiel ao mockup, sem links mortos).
interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
}

const PRINCIPAL: NavItem[] = [
  { label: 'Dashboard', href: '/inicio', icon: <IconGrid /> },
  { label: 'Coleções', href: '/colecoes', icon: <IconLayers /> },
  { label: 'Moedas', href: '/moedas', icon: <IconCoin /> },
  { label: 'Estojos', href: '/estojos', icon: <IconBox /> },
  { label: 'Catálogos', icon: <IconBook /> },
  { label: 'Cadernetas', icon: <IconNote /> },
  { label: 'Trocas', icon: <IconSwap /> },
  { label: 'Favoritos', icon: <IconHeart /> },
  { label: 'Relatórios', icon: <IconChart /> },
  { label: 'Mercado', icon: <IconBag /> },
]

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  // Abaixo de md o painel vira gaveta: sem isto o menu só existia em landscape.
  const [aberto, setAberto] = useState(false)

  useEffect(() => setAberto(false), [pathname])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const abrir = () => { setCollapsed(false); setAberto(true) }
  const compacto = collapsed && !aberto
  const topoSeguro = 'pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6'

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b border-mp-border bg-mp-surface px-4 pt-[env(safe-area-inset-top)] md:hidden print:hidden">
        <button
          type="button"
          onClick={abrir}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          className="grid h-10 w-10 place-items-center rounded-xl text-mp-ink transition-colors hover:bg-mp-surface-muted"
        >
          <IconMenu />
        </button>
        <Link href="/inicio" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-mp-coin font-serif text-base font-semibold text-white ring-1 ring-mp-coin-dark/25">€</span>
          <span className="text-lg font-extrabold tracking-tight text-mp-ink">Numis</span>
        </Link>
      </header>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          aria-hidden
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        data-sidebar
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-mp-border bg-mp-surface px-4 pb-6 transition-transform duration-200 md:sticky md:top-0 md:z-auto md:w-60 md:translate-x-0 md:transition-[width] print:hidden ${topoSeguro} ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        } ${compacto ? 'md:w-[4.5rem] md:px-2' : 'md:px-4'}`}
      >
      {/* Marca + botão de colapso */}
      <div className={`flex items-center ${compacto ? 'justify-center' : 'justify-between'}`}>
        <Link href="/inicio" className="flex items-center gap-2.5 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-mp-coin font-serif text-lg font-semibold text-white shadow-sm ring-1 ring-mp-coin-dark/25">€</span>
          {!compacto && <span className="text-xl font-extrabold tracking-tight text-mp-ink">Numis</span>}
        </Link>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar menu"
          className="grid h-9 w-9 place-items-center rounded-lg text-mp-ink-faint transition-colors hover:bg-mp-surface-muted hover:text-mp-ink md:hidden"
        >
          <IconFechar />
        </button>
        {!compacto && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Colapsar painel"
            className="hidden h-8 w-8 place-items-center rounded-lg text-mp-ink-faint transition-colors hover:bg-mp-surface-muted hover:text-mp-ink md:grid"
          >
            <IconCollapse />
          </button>
        )}
      </div>

      {compacto && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expandir painel"
          className="mx-auto grid h-8 w-8 place-items-center rounded-lg text-mp-ink-faint transition-colors hover:bg-mp-surface-muted hover:text-mp-ink"
        >
          <IconExpand />
        </button>
      )}

      {/* Navegação */}
      <nav className="flex-1 flex flex-col gap-1">
        {PRINCIPAL.map((item) => {
          const active = item.href && pathname === item.href
          const conteudo = (
            <>
              <span className={`shrink-0 ${active ? 'text-mp-primary-strong' : 'text-mp-ink-faint'}`}>{item.icon}</span>
              {!compacto && <span className="flex-1">{item.label}</span>}
              {!compacto && !item.href && (
                <span className="rounded-full bg-mp-surface-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-mp-ink-faint">
                  em breve
                </span>
              )}
            </>
          )
          const base = `flex items-center rounded-xl py-2.5 font-sans text-sm transition-colors ${compacto ? 'justify-center px-0' : 'gap-3 px-3'}`
          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              title={compacto ? item.label : undefined}
              className={`${base} ${active ? 'bg-mp-primary-soft font-semibold text-mp-primary-strong' : 'text-mp-ink-soft hover:bg-mp-surface-muted'}`}
            >
              {conteudo}
            </Link>
          ) : (
            <span key={item.label} title={compacto ? item.label : undefined} className={`${base} cursor-default select-none text-mp-ink-faint`}>
              {conteudo}
            </span>
          )
        })}
      </nav>

      {/* Administração — só para o dono/admin (is_admin no profile) */}
      {isAdmin && (
        <div className="flex flex-col gap-1">
          {!compacto && (
            <p className="px-3 pb-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-mp-ink-faint">
              Administração
            </p>
          )}
          <Link
            href="/admin"
            title={compacto ? 'Administração' : undefined}
            className={`flex items-center rounded-xl py-2.5 font-sans text-sm transition-colors ${compacto ? 'justify-center px-0' : 'gap-3 px-3'} ${
              pathname.startsWith('/admin')
                ? 'bg-mp-primary-soft font-semibold text-mp-primary-strong'
                : 'text-mp-ink-soft hover:bg-mp-surface-muted'
            }`}
          >
            <span className={`shrink-0 ${pathname.startsWith('/admin') ? 'text-mp-primary-strong' : 'text-mp-ink-faint'}`}>
              <IconShield />
            </span>
            {!compacto && <span className="flex-1">Administração</span>}
          </Link>
        </div>
      )}

      {/* Ajuda */}
      <div className={`flex items-center rounded-2xl bg-mp-falta-bg ${compacto ? 'justify-center px-0 py-3' : 'gap-2.5 px-3 py-3'}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mp-primary text-white"><IconChatSm /></span>
        {!compacto && (
          <div className="min-w-0">
            <p className="font-sans text-xs font-semibold text-mp-ink">Precisas de ajuda?</p>
            <p className="font-sans text-[11px] text-mp-ink-soft">Fala com o Numis!</p>
          </div>
        )}
      </div>

      {!compacto && <SkinToggle />}
      </aside>
    </>
  )
}

/* ── Ícones inline (sem dependências externas; mesma abordagem do Flag.tsx) ── */
function svg(path: React.ReactNode) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  )
}
function IconGrid() { return svg(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>) }
function IconLayers() { return svg(<><path d="M12 3 3 8l9 5 9-5-9-5z" /><path d="M3 13l9 5 9-5" /></>) }
function IconCoin() { return svg(<><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5h3a2 2 0 0 1 0 4h-3M11 8v8" /></>) }
function IconBook() { return svg(<><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M8 3v18" /></>) }
function IconNote() { return svg(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>) }
function IconSwap() { return svg(<><path d="M7 4 3 8l4 4" /><path d="M3 8h13" /><path d="M17 20l4-4-4-4" /><path d="M21 16H8" /></>) }
function IconHeart() { return svg(<path d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.4 12 20 12 20z" />) }
function IconChart() { return svg(<><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M13 16V8M18 16v-6" /></>) }
function IconBag() { return svg(<><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></>) }
function IconMenu() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg> }
function IconFechar() { return svg(<path d="M6 6l12 12M18 6L6 18" />) }
function IconCollapse() { return svg(<><path d="M15 6l-6 6 6 6" /><path d="M20 4v16" /></>) }
function IconExpand() { return svg(<><path d="M9 6l6 6-6 6" /><path d="M4 4v16" /></>) }
function IconBox() { return svg(<><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>) }
function IconShield() { return svg(<><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9.5 12l1.8 1.8 3.2-3.4" /></>) }
function IconChatSm() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9 9 0 0 1-4-1l-5 1 1.5-4.5A8.38 8.38 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" /></svg> }
