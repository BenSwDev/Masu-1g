"use client"

import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { cn } from "@/lib/utils/utils"

interface PurchaseSuccessProps {
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function PurchaseSuccess({
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: PurchaseSuccessProps) {
  const { t } = useTranslation()

  return (
    <Card className={cn("w-full max-w-md mx-auto text-center", className)}>
      <CardHeader>
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">{title || t("common.purchaseSuccessful")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{message || t("common.purchaseSuccessMessage")}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {onAction && (
          <Button onClick={onAction} className="w-full">
            {actionLabel || t("common.continue")}
          </Button>
        )}
        {onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction} className="w-full">
            {secondaryActionLabel || t("common.goBack")}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
