import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const goldenBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-golden bg-golden-gradient text-white",
        secondary: "border-golden bg-golden/10 text-golden",
        destructive: "border-destructive bg-destructive text-destructive-foreground",
        outline: "border-golden text-golden",
        success: "border-green-500 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        warning: "border-yellow-500 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        error: "border-red-500 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function GoldenBadge({ className, variant, ...props }) {
  return (
    <div className={cn(goldenBadgeVariants({ variant }), className)} {...props} />
  )
}

export { GoldenBadge, goldenBadgeVariants }
