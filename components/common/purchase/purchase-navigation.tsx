"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { cn } from "@/lib/utils"

interface PurchaseNavigationProps {
  onNext?: () => void
  onPrevious?: () => void
  onComplete?: () => void
  canGoNext?: boolean
  canGoPrevious?: boolean
  isLoading?: boolean
  isLastStep?: boolean
  nextLabel?: string
  previousLabel?: string
  completeLabel?: string
  className?: string
}

export function PurchaseNavigation({
  onNext,
  onPrevious,
  onComplete,
  canGoNext = true,
  canGoPrevious = true,
  isLoading = false,
  isLastStep = false,
  nextLabel,
  previousLabel,
  completeLabel,
  className,
}: PurchaseNavigationProps) {
  const { t, dir } = useTranslation()

  return (
    <div className={cn("flex justify-between items-center mt-8", className)}>
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={!canGoPrevious || isLoading}
        className={cn(
          "flex items-center gap-2 transition-all duration-300",
          !canGoPrevious && "opacity-0 pointer-events-none"
        )}
      >
        {dir === "rtl" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        {previousLabel || t("common.back")}
      </Button>

      {isLastStep ? (
        <Button
          onClick={onComplete}
          disabled={!canGoNext || isLoading}
          className="flex items-center gap-2 transition-all duration-300 px-6 py-2 h-11"
          size="lg"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {completeLabel || t("common.complete")}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canGoNext || isLoading}
          className={cn(
            "flex items-center gap-2 transition-all duration-300",
            !canGoNext && "opacity-70 cursor-not-allowed"
          )}
        >
          {nextLabel || t("common.next")}
          {dir === "rtl" ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  )
}
