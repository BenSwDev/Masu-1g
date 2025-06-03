"use client"
import { Button } from "@/components/common/ui/button"
import { cn } from "@/lib/utils/utils"
import { useTranslation } from "@/lib/translations/i18n"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"

export interface PurchaseNavigationProps {
  onNext?: () => void
  onBack?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  isLoading?: boolean
  nextLabel?: string
  backLabel?: string
  className?: string
  isLastStep?: boolean
}

export function PurchaseNavigation({
  onNext,
  onBack,
  canGoNext = true,
  canGoBack = true,
  isLoading = false,
  nextLabel,
  backLabel,
  className,
  isLastStep = false,
}: PurchaseNavigationProps) {
  const { t } = useTranslation()

  return (
    <div className={cn("flex justify-between mt-8", className)}>
      <Button variant="outline" onClick={onBack} disabled={!canGoBack || isLoading} className="flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        {backLabel || t("common.back")}
      </Button>

      <Button onClick={onNext} disabled={!canGoNext || isLoading} className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {nextLabel || (isLastStep ? t("common.finish") : t("common.next"))}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}
