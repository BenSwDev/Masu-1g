"use client"

import React from "react"
import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import { useTranslation } from "@/lib/translations/i18n"
import { cn } from "@/lib/utils/utils"
import confetti from "canvas-confetti"

export interface PurchaseSuccessProps {
  title?: string
  message?: string
  onContinue?: () => void
  continueLabel?: string
  className?: string
  showConfetti?: boolean
}

export function PurchaseSuccess({
  title,
  message,
  onContinue,
  continueLabel,
  className,
  showConfetti = true,
}: PurchaseSuccessProps) {
  const { t } = useTranslation()

  React.useEffect(() => {
    if (showConfetti) {
      const duration = 3 * 1000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#5E35B1", "#3B82F6", "#10B981"],
        })
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#5E35B1", "#3B82F6", "#10B981"],
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      frame()
    }
  }, [showConfetti])

  return (
    <motion.div
      className={cn("flex flex-col items-center justify-center text-center p-8", className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <CheckCircle className="h-24 w-24 text-primary mb-6" />
      </motion.div>

      <motion.h2
        className="text-2xl font-bold mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {title || t("purchase.success.title")}
      </motion.h2>

      <motion.p
        className="text-muted-foreground mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {message || t("purchase.success.message")}
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Button onClick={onContinue}>{continueLabel || t("purchase.success.continue")}</Button>
      </motion.div>
    </motion.div>
  )
}
