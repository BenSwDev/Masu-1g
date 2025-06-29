"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/utils"
import { Check } from "lucide-react"

interface PurchaseCardProps {
  title: string
  description?: string
  price?: number | string
  currency?: string
  isSelected?: boolean
  onClick?: () => void
  disabled?: boolean
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  children?: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

export function PurchaseCard({
  title,
  description,
  price,
  currency = "₪",
  isSelected = false,
  onClick,
  disabled = false,
  badge,
  badgeVariant = "secondary",
  children,
  className,
  icon,
}: PurchaseCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-md relative overflow-hidden",
        isSelected
          ? "ring-2 ring-primary border-primary bg-primary/5 shadow-md transform scale-[1.02]"
          : "border-border hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      onClick={disabled ? undefined : onClick}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground p-1 rounded-bl-md">
          <Check className="w-4 h-4" />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 flex items-start gap-3">
            {icon && <div className="mt-1 text-muted-foreground">{icon}</div>}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && <CardDescription className="mt-1">{description}</CardDescription>}
            </div>
          </div>
          {badge && (
            <Badge variant={badgeVariant} className="ml-2">
              {badge}
            </Badge>
          )}
        </div>
        {price !== undefined && (
          <div className="text-2xl font-bold text-primary mt-2">
            {price} {currency}
          </div>
        )}
      </CardHeader>
      {children && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}
