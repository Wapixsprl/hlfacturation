'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Paperclip, Trash2, Loader2, FileText, Image } from 'lucide-react'

export interface PieceJointe {
  name: string
  file_path: string
  signed_url: string
}

interface Props {
  value: PieceJointe[]
  onChange: (files: PieceJointe[]) => void
  docType: 'devis' | 'factures'
  disabled?: boolean
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext))
    return <Image className="h-4 w-4 text-[#707070] shrink-0" />
  return <FileText className="h-4 w-4 text-[#707070] shrink-0" />
}

export function PiecesJointesUploader({ value, onChange, docType, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/documents/upload?type=${docType}`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors du téléchargement')
        return
      }
      onChange([
        ...value,
        { name: data.file_name, file_path: data.file_path, signed_url: data.signed_url },
      ])
      toast.success('Fichier ajouté')
    } catch {
      toast.error('Erreur lors du téléchargement')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (pj: PieceJointe) => {
    setDeletingPath(pj.file_path)
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: pj.file_path }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la suppression')
        return
      }
      onChange(value.filter((f) => f.file_path !== pj.file_path))
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeletingPath(null)
    }
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((pj) => (
            <li
              key={pj.file_path}
              className="flex items-center gap-3 rounded-lg border border-[#EBEBEB] px-3 py-2 bg-[#FAFAFA]"
            >
              {fileIcon(pj.name)}
              <a
                href={pj.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-[#141414] truncate hover:underline"
              >
                {pj.name}
              </a>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDelete(pj)}
                  disabled={deletingPath === pj.file_path}
                  className="shrink-0 text-[#ADADAD] hover:text-red-500 transition-colors"
                >
                  {deletingPath === pj.file_path ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Paperclip className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Envoi en cours...' : 'Ajouter un fichier'}
          </Button>
          <p className="text-xs text-[#ADADAD]">PDF, PNG, JPG ou WebP — 10 MB max</p>
        </>
      )}
    </div>
  )
}
