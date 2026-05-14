"use client"

import { ReactNode } from "react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Card } from "@/components/ui/card"

interface AppHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  showThemeToggle?: boolean
  icon?: ReactNode
}

export function AppHeader({
  title,
  description,
  actions,
  showThemeToggle = true,
  icon,
}: AppHeaderProps) {
  return (
    <Card className="relative z-20 mb-6 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>}
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showThemeToggle && <ThemeToggle />}
          {actions}
        </div>
      </div>
    </Card>
  )
}
