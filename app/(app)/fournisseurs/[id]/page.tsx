import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FournisseurDetailContent } from '@/components/fournisseurs/FournisseurDetailContent'

export default async function FournisseurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: fournisseur }, { data: facturesAchat }] = await Promise.all([
    supabase.from('fournisseurs').select('*').eq('id', id).single(),
    supabase
      .from('factures_achat')
      .select('*')
      .eq('fournisseur_id', id)
      .is('archived_at', null)
      .order('date_facture', { ascending: false }),
  ])

  if (!fournisseur) notFound()

  return (
    <FournisseurDetailContent
      fournisseur={fournisseur}
      facturesAchat={facturesAchat || []}
    />
  )
}
