'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error('Erreur lors de l\'envoi')
      setLoading(false)
      return
    }

    setSent(true)
    toast.success('Email de réinitialisation envoyé')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-black rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">HL</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">Réinitialisation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sent ? 'Vérifiez votre boîte mail' : 'Entrez votre email pour recevoir un lien'}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-black hover:bg-black/90"
                disabled={loading}
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </Button>
            </form>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Un email a été envoyé à <strong>{email}</strong>.
              Cliquez sur le lien pour réinitialiser votre mot de passe.
            </p>
          )}
          <div className="text-center mt-4">
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
