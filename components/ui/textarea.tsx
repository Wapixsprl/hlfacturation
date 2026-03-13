import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)] outline-none placeholder:text-[#9CA3AF] focus-visible:border-[#17C2D7] focus-visible:ring-3 focus-visible:ring-[#17C2D7]/20 disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:opacity-50 aria-invalid:border-[#DC2626] aria-invalid:ring-3 aria-invalid:ring-[#DC2626]/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
