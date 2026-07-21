import { getPageAccess } from '@/lib/auth/getPageAccess'
import { redirect } from 'next/navigation'
import { ExportsPageContent } from '@/components/exports/ExportsPageContent'

export default async function ExportsPage() {
  const access = await getPageAccess()
  if (access && !['super_admin', 'comptable'].includes(access.role)) {
    redirect('/dashboard')
  }
  return <ExportsPageContent />
}
