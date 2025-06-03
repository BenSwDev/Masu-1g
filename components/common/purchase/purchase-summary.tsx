"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { cn } from "@/lib/utils/utils"
import { useTranslation } from "@/lib/translations/i18n"

export interface SummaryItem {
  label: string
  value: string | number
  highlight?: boolean
}

export interface PurchaseSummaryProps {
  title?: string
  items: SummaryItem[]
  total: {
    label: string
    value: string | number
  }
  className?: string
}

export function PurchaseSummary({ title, items, total, className }: PurchaseSummaryProps) {
  const { t } = useTranslation()

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title || t("common.summary")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between">
              <span className={cn("text-sm", item.highlight && "font-medium")}>{item.label}</span>
              <span className={cn("text-sm", item.highlight && "font-medium")}>
                {typeof item.value === "number" ? `₪${item.value.toFixed(2)}` : item.value}
              </span>
            </div>
          ))}

          <Separator className="my-2" />

          <div className="flex justify-between font-bold">
            <span>{total.label}</span>
            <span>{typeof total.value === "number" ? `₪${total.value.toFixed(2)}` : total.value}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
