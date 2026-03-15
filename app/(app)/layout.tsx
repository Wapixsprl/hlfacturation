import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from 'sonner'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MainContent } from '@/components/layout/MainContent'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: utilisateur, error: userError } = await supabase
    .from('utilisateurs')
    .select('*, entreprises(*)')
    .eq('id', user.id)
    .single()

  if (!utilisateur) {
    // Don't redirect to /login (causes infinite loop since user IS authenticated)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-[#DC2626] mb-2">Compte non configure</h1>
          <p className="text-[#6B7280] mb-4">
            Votre compte existe mais n&apos;est pas lie a une entreprise.
            {userError && <span className="block text-sm text-[#DC2626] mt-2">{userError.message}</span>}
          </p>
          <form action="/api/auth/signout" method="POST">
            <button className="px-4 py-2 bg-[#1E2028] text-white rounded-lg hover:bg-[#2a2d35] transition-colors duration-150">
              Se deconnecter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Sidebar utilisateur={utilisateur} />
      <MainContent>
        <Header utilisateur={utilisateur} />
        <main className="px-5 sm:px-8 py-6 max-w-7xl mx-auto">
          {children}
        </main>
      </MainContent>
      <Toaster position="top-right" richColors />
    </div>
  )
}
