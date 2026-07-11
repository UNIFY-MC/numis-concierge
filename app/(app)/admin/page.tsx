import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/profiles'
import { getCollectors, getPlatformStats } from '@/lib/admin'
import AdminPanel from '@/components/AdminPanel'

export default async function AdminPage() {
  const profile = await getMyProfile()
  if (!profile?.isAdmin) redirect('/inicio')

  const collectors = await getCollectors()
  const stats = await getPlatformStats(collectors)

  return <AdminPanel stats={stats} collectors={collectors} />
}
