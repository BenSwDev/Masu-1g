"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { useTranslation } from "@/lib/translations/i18n"

interface SummaryItem {
  label: string
  value: string | number
  highlight?: boolean
}

interface PurchaseSummaryProps {
  title?: string
  items: SummaryItem[]
  totalPrice?: number
  currency?: string
  className?: string
}

export function PurchaseSummary({ title, items, totalPrice, currency = "₪", className }: PurchaseSummaryProps) {
  const { t } = useTranslation()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title || t("common.summary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center py-2">
            <span className={`text-gray-600 ${item.highlight ? "font-medium" : ""}`}>{item.label}:</span>
            <span className={`${item.highlight ? "font-semibold text-lg" : "font-medium"}`}>{item.value}</span>
          </div>
        ))}

        {totalPrice !== undefined && (
          <>
            <Separator className="my-4" />
            <div className="flex justify-between items-center pt-3 text-lg">
              <span className="font-semibold">{t("common.totalPrice")}:</span>
              <span className="font-bold text-xl text-primary">
                {totalPrice.toFixed(2)} {currency}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
