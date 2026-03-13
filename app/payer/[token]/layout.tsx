import { Toaster } from 'sonner'

export const metadata = {
  title: 'Paiement — HL Renovation',
}

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {children}
      <Toaster richColors position="top-right" />
    </div>
  )
}
