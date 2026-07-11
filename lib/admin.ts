import { createClient } from './supabase-server'

export interface Collector {
  id: string
  nome: string | null
  username: string | null
  plano: string
  isAdmin: boolean
  criadoEm: string
  moedas: number
  paises: number
}

export interface PlatformStats {
  colecionadores: number
  moedasTotais: number
  tiposCatalogo: number
  variantesCatalogo: number
}

export interface PaisResumo {
  paisCodigo: string
  paisNome: string
  moedas: number
  exemplares: number
}

// Resumo por colecionador (RPC gated por is_admin() — não-admin recebe zero linhas).
export async function getCollectors(): Promise<Collector[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_collectors')
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    nome: (r.nome as string) ?? null,
    username: (r.username as string) ?? null,
    plano: (r.plano as string) ?? 'free',
    isAdmin: (r.is_admin as boolean) ?? false,
    criadoEm: r.criado_em as string,
    moedas: Number(r.moedas ?? 0),
    paises: Number(r.paises ?? 0),
  }))
}

export async function getPlatformStats(collectors: Collector[]): Promise<PlatformStats> {
  const supabase = await createClient()
  const [tipos, variantes] = await Promise.all([
    supabase.from('catalog_coins').select('*', { count: 'exact', head: true }),
    supabase.from('catalog_issues').select('*', { count: 'exact', head: true }),
  ])
  return {
    colecionadores: collectors.length,
    moedasTotais: collectors.reduce((s, c) => s + c.moedas, 0),
    tiposCatalogo: tipos.count ?? 0,
    variantesCatalogo: variantes.count ?? 0,
  }
}

export async function getCollectorPaises(userId: string): Promise<PaisResumo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_collector_paises', { uid: userId })
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    paisCodigo: r.pais_codigo as string,
    paisNome: (r.pais_nome as string) ?? (r.pais_codigo as string),
    moedas: Number(r.moedas ?? 0),
    exemplares: Number(r.exemplares ?? 0),
  }))
}

export async function getCollectorNome(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('nome, username')
    .eq('id', userId)
    .maybeSingle()
  return data?.nome ?? data?.username ?? null
}
