"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Play, RotateCcw, Clock, User } from "lucide-react"

interface ProgressSummary {
  purchaseType: "booking" | "subscription" | "gift-voucher"
  currentStep: string
  stepsCompleted: number
  hasGuestUser: boolean
  hasFormData: boolean
  timeAgo: number
  canResume: boolean
}

interface GuestProgressOptionsProps {
  progressSummary: ProgressSummary
  onResume: () => void
  onStartFresh: () => void
  onCancel: () => void
}

export default function GuestProgressOptions({
  progressSummary,
  onResume,
  onStartFresh,
  onCancel
}: GuestProgressOptionsProps) {
  const { t } = useTranslation()

  const getPurchaseTypeLabel = (type: string) => {
    switch (type) {
      case "booking":
        return t("landing.bookTreatment")
      case "subscription":
        return t("landing.bookSubscription")
      case "gift-voucher":
        return t("landing.bookGiftVoucher")
      default:
        return t("guest.purchase.title")
    }
  }

  const getTimeAgoText = (minutes: number) => {
    if (minutes < 1) return t("guest.progress.justNow")
    if (minutes < 60) return t("guest.progress.minutesAgo", { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t("guest.progress.hoursAgo", { count: hours })
    const days = Math.floor(hours / 24)
    return t("guest.progress.daysAgo", { count: days })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t("guest.progress.foundExisting")}
        </h3>
        <p className="text-gray-600">
          {t("guest.progress.foundExistingDescription")}
        </p>
      </div>

      {/* Progress Summary Card */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              {getPurchaseTypeLabel(progressSummary.purchaseType)}
            </span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {t(`guest.steps.${progressSummary.currentStep}`)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            {getTimeAgoText(progressSummary.timeAgo)}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${progressSummary.hasGuestUser ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{t("guest.progress.userDetails")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${progressSummary.hasFormData ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>{t("guest.progress.formData")}</span>
            </div>
          </div>

          {progressSummary.stepsCompleted > 0 && (
            <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
              {t("guest.progress.stepsCompleted", { count: progressSummary.stepsCompleted })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {progressSummary.canResume && (
          <Button
            onClick={onResume}
            className="w-full h-12 text-lg"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            {t("guest.progress.resumeFromWhere", { 
              step: t(`guest.steps.${progressSummary.currentStep}`) 
            })}
          </Button>
        )}

        <Button
          onClick={onStartFresh}
          variant="outline"
          className="w-full h-12 text-lg border-2"
          size="lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          {t("guest.progress.startFresh")}
        </Button>

        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full"
        >
          {t("common.cancel")}
        </Button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        {t("guest.progress.disclaimer")}
      </div>
    </div>
  )
} 