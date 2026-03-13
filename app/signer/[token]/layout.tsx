import { Toaster } from 'sonner'

export const metadata = {
  title: 'Signature devis — HL Rénovation',
}

export default function SignatureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  )
}
