import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm text-[#111827] transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#9CA3AF] focus-visible:border-[#17C2D7] focus-visible:ring-3 focus-visible:ring-[#17C2D7]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:opacity-50 aria-invalid:border-[#DC2626] aria-invalid:ring-3 aria-invalid:ring-[#DC2626]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
