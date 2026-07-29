'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Flag from '@/components/Flag'
import EstojoQuickAdd from '@/components/EstojoQuickAdd'
import EstojoGrelha from '@/components/EstojoGrelha'
import EstojoFolhas from '@/components/EstojoFolhas'
import EstojoPosicao from '@/components/EstojoPosicao'
import EstojoVariante from '@/components/EstojoVariante'
import EstojoModal from '@/components/EstojoModal'
import EstojoPrint from '@/components/EstojoPrint'
import { eur } from '@/lib/valor'
import {
  arrumarSemCasa,
  getConteudoEstojo,
  getEstojo,
  getVariantesDeCoins,
  proximaPosicao,
  removerAlocacao,
  type VarianteOpcao,
  type EstojoConteudoItem,
  type Estojo,
  type Posicao,
} from '@/lib/estojos'

const FORMATO_CURTO: Record<string, string> = {
  bnc: 'BNC',
  proof: 'Proof',
  normal: 'Normal',
  carteira_fdc: 'Carteira FDC',
  carteira_bebe: 'Carteira bebé',
}
const METAIS_PT: Record<string, string> = {
  gold: 'Ouro', silver: 'Prata', copper: 'Cobre', bronze: 'Bronze', brass: 'Latão',
  nickel: 'Níquel', bimetallic: 'Bimetálica', 'copper-nickel': 'Cuproníquel', cupronickel: 'Cuproníquel',
  steel: 'Aço', billon: 'Bolhão', tin: 'Estanho', zinc: 'Zinco',
}
const metalPt = (m: string | null) => (m ? METAIS_PT[m.toLowerCase()] ?? m : '—')

export default function EstojoDetalhe({ id }: { id: string }) {
  const [estojo, setEstojo] = useState<Estojo | null>(null)
  const [itens, setItens] = useState<EstojoConteudoItem[] | null>(null)
  const [posicao, setPosicao] = useState<Posicao | null>(null)
  const [vista, setVista] = useState<'grelha' | 'tabela'>('grelha')
  const [editar, setEditar] = useState(false)
  const [soAFolha, setSoAFolha] = useState(true)
  const [variantes, setVariantes] = useState<Record<string, VarianteOpcao[]>>({})
  // Folha onde se está a trabalhar: a inserção nunca recua para buracos de folhas
  // anteriores. 0 = ainda não se escolheu nenhuma (arranca na última usada).
  const folhaRef = useRef(0)

  async function carregar() {
    const [e, conteudo] = await Promise.all([getEstojo(id), getConteudoEstojo(id)])
    setEstojo(e)
    setItens(conteudo)
    getVariantesDeCoins(conteudo.map((i) => i.coinId ?? '')).then(setVariantes).catch(() => {})
    // Sem grelha definida não há casas: as moedas entram por ordem de chegada.
    if (!e?.linhas || !e?.colunas) {
      setPosicao(null)
      return
    }
    const ultima = conteudo.reduce((m, i) => Math.max(m, i.folha ?? 1), 1)
    const pos = proximaPosicao(conteudo, e.linhas, e.colunas, folhaRef.current || ultima)
    folhaRef.current = pos.folha
    setPosicao(pos)
  }

  function escolherPosicao(p: Posicao) {
    folhaRef.current = p.folha
    setPosicao(p)
  }

  // Saltar para uma folha: assenta na primeira casa livre dessa folha.
  function escolherFolha(f: number) {
    if (!estojo?.linhas || !estojo?.colunas) return
    const p = proximaPosicao(lista, estojo.linhas, estojo.colunas, f)
    escolherPosicao(p.folha === f ? p : { folha: f, linha: 1, coluna: 1 })
  }

  useEffect(() => {
    carregar().catch(() => setItens([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function remover(alocacaoId: string) {
    await removerAlocacao(alocacaoId)
    await carregar()
  }

  async function arrumar() {
    if (!estojo?.linhas || !estojo?.colunas) return
    await arrumarSemCasa(id, estojo.linhas, estojo.colunas)
    await carregar()
  }

  const lista = itens ?? []
  const totalExemplares = lista.reduce((s, i) => s + i.quantidade, 0)
  const totalMercado = lista.reduce((s, i) => s + (i.valorMercado ?? 0) * i.quantidade, 0)
  const temGrelha = !!(estojo?.linhas && estojo?.colunas)
  const proximaOrdem = lista.reduce((m, i) => Math.max(m, i.ordem), 0) + 1
  const semCasa = lista.filter((i) => !i.linha || !i.coluna).length
  const folhasUsadas = Math.max(lista.reduce((m, i) => Math.max(m, i.folha ?? 1), 1), posicao?.folha ?? 1)
  // A tabela obedece ao mesmo filtro da grelha: ver só a folha em que se trabalha.
  const naVista = temGrelha && soAFolha && posicao
    ? lista.filter((i) => (i.folha ?? 1) === posicao.folha)
    : lista

  const th = 'px-3 py-2.5 font-semibold whitespace-nowrap'
  const td = 'px-3 py-2 whitespace-nowrap'
  const aba = (on: boolean) =>
    `rounded-lg px-3 py-1.5 font-sans text-xs font-semibold ${on ? 'bg-mp-gold text-white' : 'text-mp-ink-soft hover:bg-mp-surface-muted'}`

  return (
    <div className="w-full px-6 py-8">
      <div className="print:hidden">
      <Link href="/estojos" className="mb-4 inline-flex items-center gap-1 font-sans text-sm text-mp-ink-soft hover:text-mp-ink">
        ← Estojos
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">{estojo?.nome ?? 'Estojo'}</h1>
          <p className="mt-1 font-sans text-sm text-mp-ink-soft">
            {estojo?.localizacao && <span className="text-mp-ink">📍 {estojo.localizacao} · </span>}
            {temGrelha && <span>{estojo!.linhas}×{estojo!.colunas} por folha · </span>}
            {itens && `${itens.length} ${temGrelha ? 'casas' : 'moedas'} · ${totalExemplares} exemplares`}
            {totalMercado > 0 && <span> · <b className="font-serif text-mp-gold-strong">{eur(totalMercado)}</b> mercado</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {temGrelha && (
            <div className="flex gap-1 rounded-xl border border-mp-border bg-mp-surface p-1">
              <button onClick={() => setVista('grelha')} className={aba(vista === 'grelha')}>Grelha</button>
              <button onClick={() => setVista('tabela')} className={aba(vista === 'tabela')}>Tabela</button>
            </div>
          )}
          <button
            onClick={() => window.print()}
            disabled={!estojo}
            className="rounded-xl border border-mp-border bg-mp-surface px-3 py-2 font-sans text-xs font-semibold text-mp-ink-soft hover:border-mp-gold hover:text-mp-gold-strong disabled:opacity-50"
          >
            Imprimir
          </button>
          <button
            onClick={() => setEditar(true)}
            disabled={!estojo}
            className="rounded-xl border border-mp-border bg-mp-surface px-3 py-2 font-sans text-xs font-semibold text-mp-ink-soft hover:border-mp-gold hover:text-mp-gold-strong disabled:opacity-50"
          >
            {temGrelha ? 'Editar estojo' : 'Definir grelha'}
          </button>
        </div>
      </header>

      {estojo && !temGrelha && (
        <p className="mb-4 rounded-xl border border-mp-border bg-mp-surface-muted/50 px-4 py-3 font-sans text-xs text-mp-ink-soft">
          Este estojo não tem grelha, por isso as moedas entram por ordem de chegada e não têm folha/linha/coluna.
          Carrega em <b className="text-mp-ink">Definir grelha</b> para dizer quantas linhas e colunas tem cada folha.
        </p>
      )}

      {temGrelha && semCasa > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-mp-border bg-mp-surface-muted/50 px-4 py-3 font-sans text-xs text-mp-ink-soft">
          <span>{semCasa} moedas ainda sem casa atribuída (entraram antes da grelha).</span>
          <button onClick={arrumar} className="rounded-lg bg-mp-gold px-3 py-1.5 font-semibold text-white hover:bg-mp-gold-strong">
            Arrumar nas casas livres
          </button>
        </div>
      )}

      <EstojoQuickAdd
        estojoId={id}
        posicao={posicao}
        onPosicao={escolherPosicao}
        grelha={{ linhas: estojo?.linhas ?? null, colunas: estojo?.colunas ?? null }}
        proximaOrdem={proximaOrdem}
        onAdded={carregar}
      />

      {temGrelha && posicao && (
        <EstojoFolhas
          folhas={folhasUsadas}
          activa={posicao.folha}
          soAFolha={soAFolha}
          onFolha={escolherFolha}
          onSoAFolha={setSoAFolha}
        />
      )}

      {itens === null ? (
        <p className="font-sans text-sm text-mp-ink-soft">A carregar…</p>
      ) : temGrelha && posicao && vista === 'grelha' ? (
        <EstojoGrelha
          itens={itens}
          linhas={estojo!.linhas!}
          colunas={estojo!.colunas!}
          posicao={posicao}
          soAFolha={soAFolha}
          onEscolher={escolherPosicao}
          onRemover={remover}
        />
      ) : naVista.length === 0 ? (
        <p className="rounded-2xl border border-mp-border bg-mp-surface p-6 font-sans text-sm text-mp-ink-soft">
          {lista.length === 0
            ? 'Este estojo ainda não tem moedas. Usa a barra acima para pesquisar e adicionar.'
            : 'Esta folha ainda está vazia. Desliga "Mostrar só esta folha" para veres o estojo todo.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-mp-border bg-mp-surface">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-mp-border text-[11px] uppercase tracking-wide text-mp-ink-faint">
                <th className={th}>#</th>
                {temGrelha && <th className={th}>Folha · Linha · Coluna</th>}
                <th className={th}>Moeda</th>
                <th className={th}>Coleção / Série</th>
                <th className={th}>Ano</th>
                <th className={th}>Variante</th>
                <th className={th}>Estado</th>
                <th className={th}>Grau</th>
                <th className={th}>Metal</th>
                <th className={th + ' text-right'}>Valor mercado</th>
                <th className={th + ' text-right'}>Qtd</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {naVista.map((i, idx) => (
                <tr key={i.alocacaoId} className="border-b border-mp-border last:border-0 hover:bg-mp-surface-muted">
                  <td className={td + ' font-serif font-semibold text-mp-gold'}>{i.ordem || idx + 1}</td>
                  {temGrelha && (
                    <td className={td}>
                      <EstojoPosicao item={i} grelha={{ linhas: estojo!.linhas, colunas: estojo!.colunas }} onGuardado={carregar} />
                    </td>
                  )}
                  <td className={td}>
                    <span className="flex items-center gap-2.5 text-mp-ink">
                      <Flag code={i.paisCodigo} size={18} />
                      <span>
                        {i.denominacao ?? i.titulo}
                        {i.paisNome && <span className="text-mp-ink-faint"> · {i.paisNome}</span>}
                      </span>
                    </span>
                  </td>
                  <td className={td + ' text-mp-ink-soft'}>{i.serie ?? '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>{i.ano ?? '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>
                    <EstojoVariante item={i} opcoes={variantes[i.coinId ?? ''] ?? []} onGuardado={carregar} />
                  </td>
                  <td className={td + ' text-mp-ink-soft'}>{i.formato ? FORMATO_CURTO[i.formato] ?? i.formato : '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>{i.grau ?? '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>{metalPt(i.metal)}</td>
                  <td className={td + ' text-right tabular-nums text-mp-gold-strong'}>{i.valorMercado != null ? eur(i.valorMercado * i.quantidade) : '—'}</td>
                  <td className={td + ' text-right font-medium text-mp-ink'}>{i.quantidade}</td>
                  <td className={td + ' text-right'}>
                    <button onClick={() => remover(i.alocacaoId)} title="Retirar desta casa" className="rounded-lg px-2 py-1 text-xs text-mp-falta hover:bg-mp-falta-bg">
                      Retirar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {estojo && itens && <EstojoPrint estojo={estojo} itens={itens} />}

      {editar && estojo && (
        <EstojoModal
          estojo={estojo}
          onClose={() => setEditar(false)}
          onGuardado={async () => {
            setEditar(false)
            await carregar()
          }}
        />
      )}
    </div>
  )
}
