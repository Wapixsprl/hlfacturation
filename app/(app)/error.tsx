'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {process.env.NODE_ENV === 'development'
            ? error.message || 'Erreur inconnue'
            : 'Le chargement de cette page a échoué. Essayez de recharger.'}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            Code : {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            size="sm"
          >
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    </div>
  )
}
