import { supabase } from './supabase'

export interface PaisEnquadramento {
  pais_codigo: string
  titulo: string | null
  introducao: string | null
  fonte: string
  updated_at: string
}

// O cliente já está ligado ao schema numis (ver lib/supabase.ts).
// Aceita códigos virtuais (ex. 'de-A') — usa só a parte do país.
export async function getEnquadramento(paisCodigo: string): Promise<PaisEnquadramento | null> {
  const codigo = paisCodigo.split('-')[0].toLowerCase()
  const { data, error } = await supabase
    .from('pais_enquadramento')
    .select('*')
    .eq('pais_codigo', codigo)
    .maybeSingle()
  if (error) return null
  return data
}
