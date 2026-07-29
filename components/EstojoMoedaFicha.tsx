'use client'

import { useEffect, useState } from 'react'
import Flag from '@/components/Flag'
import { eur } from '@/lib/valor'
import { getFichaMoeda, type EstojoConteudoItem, type FichaMoeda } from '@/lib/estojos'

// Ficha de leitura da moeda que está numa casa: fotos grandes, o que o catálogo
// sabe do tipo e do ano, e o valor de mercado com a proveniência.
export default function EstojoMoedaFicha({
  item,
  onClose,
}: {
  item: EstojoConteudoItem
  onClose: () => void
}) {
  const [ficha, setFicha] = useState<FichaMoeda | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!item.coinId) { setErro(true); return }
    getFichaMoeda(item.coinId, item.issueId).then(setFicha).catch(() => setErro(true))
  }, [item.coinId, item.issueId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const casa = item.linha && item.coluna ? `Folha ${item.folha ?? 1} · Linha ${item.linha} · Coluna ${item.coluna}` : 'Sem casa atribuída'
  const graus = ficha?.precosMercado ? Object.entries(ficha.precosMercado) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-mp-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-mp-ink">
              <Flag code={item.paisCodigo} size={20} />
              {item.denominacao ?? item.titulo}
            </h2>
            <p className="mt-1 font-sans text-sm text-mp-ink-soft">
              {[item.paisNome, item.serie, item.ano, item.variante].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg px-2 py-1 font-sans text-sm text-mp-ink-soft hover:bg-mp-surface-muted">
            ✕
          </button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-4">
          <Face url={item.anverso} alt="Anverso" />
          <Face url={item.reverso} alt="Reverso" />
          <div className="min-w-[10rem] flex-1">
            <p className="font-sans text-[11px] uppercase tracking-wide text-mp-ink-faint">Onde está</p>
            <p className="font-sans text-sm text-mp-ink">{casa}</p>
            {item.quantidade > 1 && <p className="font-sans text-xs text-mp-ink-soft">{item.quantidade} exemplares nesta casa</p>}
            {item.valorMercado != null && (
              <p className="mt-2 font-serif text-2xl font-semibold text-mp-gold-strong">{eur(item.valorMercado)}</p>
            )}
            {ficha?.valorMercadoFonte && (
              <p className="font-sans text-[11px] text-mp-ink-faint">
                {ficha.valorMercadoGrau ? `grau ${ficha.valorMercadoGrau} · ` : ''}{ficha.valorMercadoFonte}
                {ficha.valorMercadoData && ` · ${new Date(ficha.valorMercadoData).toLocaleDateString('pt-PT')}`}
              </p>
            )}
          </div>
        </div>

        {erro ? (
          <p className="font-sans text-sm text-mp-ink-soft">Não foi possível carregar a ficha do catálogo.</p>
        ) : !ficha ? (
          <p className="font-sans text-sm text-mp-ink-soft">A carregar…</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              <Campo label="Tipo" valor={ficha.tipoEmissao} />
              <Campo label="Tema" valor={ficha.tema} />
              <Campo label="Metal" valor={ficha.metal} />
              <Campo label="Composição" valor={ficha.composicao} />
              <Campo label="Peso" valor={ficha.pesoG != null ? `${ficha.pesoG} g` : null} />
              <Campo label="Diâmetro" valor={ficha.diametroMm != null ? `${ficha.diametroMm} mm` : null} />
              <Campo label="Espessura" valor={ficha.espessuraMm != null ? `${ficha.espessuraMm} mm` : null} />
              <Campo label="Forma" valor={ficha.forma} />
              <Campo label="Casa da moeda" valor={ficha.casaMoeda} />
              <Campo label="Tiragem" valor={ficha.tiragem != null ? ficha.tiragem.toLocaleString('pt-PT') : null} />
              <Campo label="Raridade" valor={ficha.raridade} />
              <Campo label="Estado (posse)" valor={item.formato} />
              <Campo label="Grau" valor={item.grau} />
              <Campo label="KM" valor={ficha.kmRef} />
              <Campo label="Gomes" valor={ficha.gomesRef} />
            </dl>

            {graus.length > 1 && (
              <div className="mt-5">
                <p className="mb-1 font-sans text-[11px] uppercase tracking-wide text-mp-ink-faint">Valor por grau</p>
                <div className="flex flex-wrap gap-2">
                  {graus.map(([g, v]) => (
                    <span key={g} className="rounded-lg bg-mp-surface-muted px-2 py-1 font-sans text-xs text-mp-ink-soft">
                      {g}: <b className="font-serif text-mp-gold-strong">{eur(Number(v))}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(ficha.anversoDesc || ficha.reversoDesc) && (
              <div className="mt-5 space-y-2">
                {ficha.anversoDesc && <Descricao lado="Anverso" texto={ficha.anversoDesc} />}
                {ficha.reversoDesc && <Descricao lado="Reverso" texto={ficha.reversoDesc} />}
              </div>
            )}

            {ficha.notas && <p className="mt-4 font-sans text-xs text-mp-ink-soft">{ficha.notas}</p>}

            {ficha.numistaId && (
              <a
                href={`https://pt.numista.com/catalogue/pieces${ficha.numistaId}.html`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block font-sans text-xs font-semibold text-mp-gold-strong hover:underline"
              >
                Ver na Numista ↗
              </a>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string | null }) {
  if (!valor) return null
  return (
    <div>
      <dt className="font-sans text-[11px] uppercase tracking-wide text-mp-ink-faint">{label}</dt>
      <dd className="font-sans text-sm text-mp-ink">{valor}</dd>
    </div>
  )
}

function Descricao({ lado, texto }: { lado: string; texto: string }) {
  return (
    <p className="font-sans text-xs text-mp-ink-soft">
      <b className="text-mp-ink">{lado}:</b> {texto}
    </p>
  )
}

function Face({ url, alt }: { url: string | null; alt: string }) {
  const anel = 'h-28 w-28 rounded-full bg-mp-surface-muted object-cover ring-1 ring-mp-border'
  if (!url) return <span className={`grid ${anel} place-items-center font-sans text-[11px] text-mp-ink-faint`}>{alt}</span>
  return <img src={url} alt={alt} className={anel} />
}
