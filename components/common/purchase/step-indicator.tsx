"use client"

import React from "react"
import { cn } from "@/lib/utils/utils"
import { useTranslation } from "@/lib/translations/i18n"
import { Check } from "lucide-react"
import { motion } from "framer-motion"

export interface StepIndicatorProps {
  steps: string[]
  currentStep: number
  completedSteps: number[]
  className?: string
}

export function StepIndicator({ steps, currentStep, completedSteps, className }: StepIndicatorProps) {
  const { t } = useTranslation()

  return (
    <div className={cn("w-full flex justify-between items-center mb-8", className)}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index)
        const isActive = currentStep === index

        return (
          <React.Fragment key={index}>
            {/* Step circle */}
            <motion.div
              className={cn(
                "relative flex items-center justify-center rounded-full w-10 h-10 text-sm font-medium border-2",
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isActive
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground",
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              {isCompleted ? <Check className="h-5 w-5" /> : <span>{index + 1}</span>}

              {/* Step label */}
              <span className="absolute -bottom-7 whitespace-nowrap text-xs font-medium text-center w-max left-1/2 transform -translate-x-1/2">
                {t(step)}
              </span>
            </motion.div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <motion.div
                className={cn(
                  "flex-1 h-0.5 mx-2",
                  index < completedSteps.length ? "bg-primary" : "bg-muted-foreground/30",
                )}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.05 }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
