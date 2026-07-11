import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/profiles'
import { getCollectorNome, getCollectorPaises } from '@/lib/admin'
import AdminColecionador from '@/components/AdminColecionador'

export default async function AdminUtilizadorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getMyProfile()
  if (!profile?.isAdmin) redirect('/inicio')

  const { id } = await params
  const [nome, paises] = await Promise.all([getCollectorNome(id), getCollectorPaises(id)])

  return <AdminColecionador nome={nome ?? 'Colecionador'} paises={paises} />
}
