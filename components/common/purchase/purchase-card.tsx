"use client"

import type React from "react"
import { Card, CardContent } from "@/components/common/ui/card"
import { cn } from "@/lib/utils/utils"
import { Check } from "lucide-react"
import { motion } from "framer-motion"

export interface PurchaseCardProps {
  title: string
  description?: string
  price?: string | number
  priceLabel?: string
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  image?: string
  className?: string
  children?: React.ReactNode
}

export function PurchaseCard({
  title,
  description,
  price,
  priceLabel,
  selected = false,
  onClick,
  disabled = false,
  image,
  className,
  children,
}: PurchaseCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer border-2",
        selected ? "border-primary shadow-lg" : "border-border hover:border-primary/50",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
      onClick={() => !disabled && onClick?.()}
    >
      {selected && (
        <motion.div
          className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <Check className="h-4 w-4" />
        </motion.div>
      )}

      <CardContent className="p-4 flex flex-col h-full">
        {image && (
          <div className="w-full h-32 mb-4 overflow-hidden rounded-md">
            <img src={image || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex flex-col flex-grow">
          <h3 className="font-medium text-lg">{title}</h3>
          {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
          {children}
        </div>

        {(price || priceLabel) && (
          <div className="mt-4 flex items-end justify-between">
            {price && (
              <div className="text-xl font-bold">{typeof price === "number" ? `₪${price.toFixed(2)}` : price}</div>
            )}
            {priceLabel && <div className="text-sm text-muted-foreground">{priceLabel}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
