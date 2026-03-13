'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Utilisateur {
  id: string
  entreprise_id: string
  nom: string | null
  prenom: string | null
  email: string
  role: 'super_admin' | 'utilisateur' | 'comptable'
  actif: boolean
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('id', user.id)
          .single()
        setUtilisateur(data)
      }

      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setUtilisateur(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, utilisateur, loading }
}
