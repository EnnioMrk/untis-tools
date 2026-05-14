import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export const Skeleton = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      ref={ref}
      {...props}
    />
  )
)
Skeleton.displayName = "Skeleton"
