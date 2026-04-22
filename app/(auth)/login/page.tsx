'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then(data => setLogoUrl(data.logo_url))
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Identifiants incorrects')
      setLoading(false)
      return
    }

    // Mise a jour directe via le client deja authentifie (RLS: user peut modifier sa propre ligne)
    if (data.user) {
      await supabase
        .from('utilisateurs')
        .update({ derniere_connexion: new Date().toISOString() })
        .eq('id', data.user.id)
        .then(() => {}, () => {})
    }

    // Log connexion (fire and forget — necessite migration 028)
    fetch('/api/auth/connexion', { method: 'POST' }).catch(() => {})

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - dark branding */}
      <div className="hidden lg:flex lg:w-[480px] bg-[#1E2028] flex-col justify-between p-10">
        <div>
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={180}
              height={60}
              className="h-10 w-auto object-contain brightness-0 invert"
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#17C2D7] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">HL</span>
              </div>
              <span className="text-white text-lg font-semibold">HL Facturation</span>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Gerez votre facturation en toute simplicite
          </h2>
          <p className="text-[#6B7280] text-[15px] leading-relaxed">
            Devis, factures, tresorerie — tout au meme endroit.
          </p>
        </div>
        <p className="text-[#4B5563] text-[12px]">HL Renovation - Tournai, Belgique</p>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB] px-4">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={180}
                height={60}
                className="mx-auto h-12 w-auto object-contain"
              />
            ) : (
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#17C2D7] rounded-xl mb-4">
                <span className="text-white text-xl font-bold">HL</span>
              </div>
            )}
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#111827]">Connectez-vous</h1>
            <p className="text-[14px] text-[#9CA3AF] mt-1.5">Accedez a votre espace facturation</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-7 shadow-sm">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium text-[#374151]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[13px] font-medium text-[#374151]">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-[#17C2D7] hover:bg-[#14a8bc] text-white text-[14px] font-semibold shadow-sm"
                disabled={loading}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </div>

          <div className="text-center mt-5">
            <Link
              href="/reset-password"
              className="text-[13px] text-[#9CA3AF] hover:text-[#17C2D7] transition-colors duration-150"
            >
              Mot de passe oublie ?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
