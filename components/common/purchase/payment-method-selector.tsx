"use client"

import type React from "react"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Card, CardContent } from "@/components/common/ui/card"
import { cn } from "@/lib/utils/utils"
import { useTranslation } from "@/lib/translations/i18n"
import { CreditCard, Wallet } from "lucide-react"

export interface PaymentMethod {
  id: string
  label: string
  icon?: React.ReactNode
  description?: string
}

export interface PaymentMethodSelectorProps {
  methods: PaymentMethod[]
  selectedMethod: string
  onSelectMethod: (method: string) => void
  className?: string
}

export function PaymentMethodSelector({
  methods,
  selectedMethod,
  onSelectMethod,
  className,
}: PaymentMethodSelectorProps) {
  const { t } = useTranslation()

  const defaultMethods: PaymentMethod[] = [
    {
      id: "credit_card",
      label: t("payment.methods.credit_card"),
      icon: <CreditCard className="h-5 w-5" />,
      description: t("payment.methods.credit_card_description"),
    },
    {
      id: "wallet",
      label: t("payment.methods.wallet"),
      icon: <Wallet className="h-5 w-5" />,
      description: t("payment.methods.wallet_description"),
    },
  ]

  const paymentMethods = methods.length > 0 ? methods : defaultMethods

  return (
    <div className={cn("w-full", className)}>
      <RadioGroup value={selectedMethod} onValueChange={onSelectMethod} className="space-y-3">
        {paymentMethods.map((method) => (
          <div key={method.id}>
            <Label htmlFor={method.id} className="cursor-pointer">
              <Card
                className={cn(
                  "transition-all border-2",
                  selectedMethod === method.id ? "border-primary" : "border-border",
                )}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <RadioGroupItem value={method.id} id={method.id} />

                  {method.icon && <div className="flex-shrink-0">{method.icon}</div>}

                  <div className="flex-grow">
                    <div className="font-medium">{method.label}</div>
                    {method.description && <div className="text-sm text-muted-foreground">{method.description}</div>}
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
