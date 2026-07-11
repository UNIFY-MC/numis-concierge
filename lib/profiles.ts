import { createClient } from './supabase-server'

export interface MyProfile {
  id: string
  nome: string | null
  username: string | null
  isAdmin: boolean
}

// Perfil do utilizador da sessão (server-side). Serve para gate de admin e para
// o shell decidir se mostra o menu de administração.
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, nome, username, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    nome: data?.nome ?? null,
    username: data?.username ?? null,
    isAdmin: data?.is_admin ?? false,
  }
}
