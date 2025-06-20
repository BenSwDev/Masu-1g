"use client"

import React, { useEffect, useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"
import { Progress } from "@/components/common/ui/progress"
import { Loader2, CreditCard, CheckCircle, Clock, Shield } from "lucide-react"

interface GuestPaymentProcessingStepProps {
  onComplete: () => void
  bookingNumber?: string
  amount: number
}

export function GuestPaymentProcessingStep({
  onComplete,
  bookingNumber,
  amount
}: GuestPaymentProcessingStepProps) {
  const { t, dir, language } = useTranslation()
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { key: "processing", icon: CreditCard, label: t("bookings.payment.processing.steps.payment") },
    { key: "validating", icon: Shield, label: t("bookings.payment.processing.steps.validation") },
    { key: "booking", icon: Clock, label: t("bookings.payment.processing.steps.booking") },
    { key: "notifications", icon: CheckCircle, label: t("bookings.payment.processing.steps.notifications") }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => onComplete(), 500)
          return 100
        }
        
        // Update current step based on progress
        const newProgress = prev + Math.random() * 15 + 5
        const stepIndex = Math.floor((newProgress / 100) * steps.length)
        setCurrentStep(Math.min(stepIndex, steps.length - 1))
        
        return Math.min(newProgress, 100)
      })
    }, 800)

    return () => clearInterval(interval)
  }, [onComplete, steps.length])

  const formatPrice = (amount: number) => {
    return `₪${amount.toFixed(2)}`
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir={dir} lang={language}>
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">
          {t("bookings.payment.processing.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("bookings.payment.processing.description")}
        </p>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("bookings.payment.processing.progress")}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Current Step */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              {React.createElement(steps[currentStep]?.icon || Clock, {
                className: "h-5 w-5 text-primary"
              })}
              <span className="font-medium">
                {steps[currentStep]?.label || t("bookings.payment.processing.steps.processing")}
              </span>
            </div>

            {/* Steps List */}
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep
                const isCurrent = index === currentStep
                const isUpcoming = index > currentStep

                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                      isCompleted
                        ? "text-green-600 bg-green-50"
                        : isCurrent
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground"
                    }`}
                  >
                    {React.createElement(step.icon, {
                      className: `h-4 w-4 ${
                        isCompleted ? "text-green-600" : isCurrent ? "text-primary" : "text-muted-foreground"
                      }`
                    })}
                    <span className="text-sm">{step.label}</span>
                    {isCompleted && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
                    {isCurrent && <Loader2 className="h-4 w-4 text-primary animate-spin ml-auto" />}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">{t("bookings.payment.processing.transaction")}</h3>
          <div className="space-y-3 text-sm">
            {bookingNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.payment.processing.bookingNumber")}:</span>
                <span className="font-mono">{bookingNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("bookings.payment.processing.amount")}:</span>
              <span className="font-semibold">{formatPrice(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("bookings.payment.processing.status")}:</span>
              <span className="text-orange-600">{t("bookings.payment.processing.statusValue")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("bookings.payment.processing.estimated")}:</span>
              <span>{t("bookings.payment.processing.estimatedValue")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Shield className="h-4 w-4" />
        <span>{t("bookings.payment.processing.security")}</span>
      </div>
    </div>
  )
} 