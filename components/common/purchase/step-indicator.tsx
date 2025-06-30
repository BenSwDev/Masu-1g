"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"

interface Step {
  key: string
  label: string
  icon: LucideIcon
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: string
  className?: string
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  const { dir } = useTranslation()
  const currentIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className={cn("w-full mb-10", className)}>
      <div className="flex items-center justify-between">
        {steps.map((stepItem, index) => {
          const Icon = stepItem.icon
          const isActive = index <= currentIndex
          const isCurrent = stepItem.key === currentStep
          const isCompleted = index < currentIndex

          return (
            <div key={stepItem.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative">
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300",
                    isActive
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 text-muted-foreground",
                    isCurrent && "ring-4 ring-primary/20"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div
                  className={cn(
                    "mt-2 text-sm font-medium transition-colors text-center",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {stepItem.label}
                </div>
                {/* Animated progress indicator */}
                {isCompleted && (
                  <div className="absolute top-6 left-full w-full h-0.5 bg-primary transform -translate-x-6">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: "100%",
                        animation: "progress 0.5s ease-in-out",
                      }}
                    ></div>
                  </div>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors",
                    index < currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
      <style jsx global>{`
        @keyframes progress {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
