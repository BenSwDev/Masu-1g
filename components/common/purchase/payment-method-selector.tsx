"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTranslation } from "@/lib/translations/i18n"
import { PurchaseCard } from "./purchase-card"
import { PaymentMethodForm } from "@/components/dashboard/member/payment-methods/payment-method-form"
import { CreditCard, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"

interface PaymentMethodSelectorProps {
  paymentMethods: IPaymentMethod[]
  selectedPaymentMethodId: string
  onPaymentMethodSelect: (id: string) => void
  onPaymentMethodUpserted?: (method: IPaymentMethod) => void
  showAddButton?: boolean
  className?: string
  isSubmitting?: boolean
}

export function PaymentMethodSelector({
  paymentMethods,
  selectedPaymentMethodId,
  onPaymentMethodSelect,
  onPaymentMethodUpserted,
  showAddButton = true,
  className,
  isSubmitting,
}: PaymentMethodSelectorProps) {
  const { t, dir } = useTranslation()
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false)

  const handlePaymentMethodAdded = (method: IPaymentMethod) => {
    setShowPaymentMethodForm(false)
    onPaymentMethodUpserted?.(method)
  }

  if (paymentMethods.length === 0 && !showAddButton) {
    return (
      <Alert>
        <AlertDescription>{t("paymentMethods.noPaymentMethods")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {paymentMethods.length === 0 && !showAddButton && (
        <Alert>
          <AlertDescription>{t("paymentMethods.noPaymentMethods")}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {paymentMethods.map(pm => (
          <PurchaseCard
            key={pm._id.toString?.() || ''}
            title={pm.cardName || `${t("paymentMethods.card")} **** ${pm.cardNumber.slice(-4)}`}
            description={`${t("paymentMethods.fields.expiry")}: ${pm.expiryMonth}/${pm.expiryYear}`}
            icon={<CreditCard className="w-5 h-5" />}
            isSelected={selectedPaymentMethodId === pm._id.toString?.() || ''}
            onClick={() => onPaymentMethodSelect(pm._id.toString?.() || '')}
            badge={pm.isDefault ? t("paymentMethods.defaultCard") : undefined}
            badgeVariant="outline"
          />
        ))}
      </div>

      {showAddButton && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPaymentMethodForm(true)}
          className="w-full h-12"
          disabled={Boolean(isSubmitting)}
        >
          <PlusCircle className={cn("w-4 h-4", dir === "rtl" ? "ml-2" : "mr-2")} />
          {t("paymentMethods.addNewLink")}
        </Button>
      )}

      {showPaymentMethodForm && (
        <PaymentMethodForm
          open={showPaymentMethodForm}
          onOpenChange={setShowPaymentMethodForm}
          onPaymentMethodUpserted={handlePaymentMethodAdded}
        />
      )}
    </div>
  )
}
