export interface Moeda {
  id: string
  nome: string
  pais: string
  ano: number | null
  valor_facial: string | null
  metal: string | null
  estado: 'VF' | 'XF' | 'AU' | 'UNC' | 'PF' | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type MoedaInsert = Omit<Moeda, 'id' | 'created_at' | 'updated_at'>
