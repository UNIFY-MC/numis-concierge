import { supabase } from './supabase'
import type { Moeda, MoedaInsert } from './types'

export async function getMoedas(): Promise<Moeda[]> {
  const { data, error } = await supabase
    .from('moedas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getMoeda(id: string): Promise<Moeda | null> {
  const { data, error } = await supabase
    .from('moedas')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createMoeda(moeda: MoedaInsert): Promise<Moeda> {
  const { data, error } = await supabase
    .from('moedas')
    .insert(moeda)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMoeda(id: string, updates: Partial<MoedaInsert>): Promise<Moeda> {
  const { data, error } = await supabase
    .from('moedas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMoeda(id: string): Promise<void> {
  const { error } = await supabase.from('moedas').delete().eq('id', id)
  if (error) throw error
}
