import Sidebar from '@/components/Sidebar'
import { getMyProfile } from '@/lib/profiles'

// Shell partilhado por todas as rotas (app): sidebar + área de conteúdo.
// A área de conteúdo não impõe largura máxima — cada página gere o seu layout
// (o Dashboard centra-se; a MoedasCollection mantém o seu).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile()
  return (
    <div className="flex min-h-screen bg-mp-bg">
      <Sidebar isAdmin={profile?.isAdmin ?? false} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
