"use client"

import { Package } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ISubscription } from "@/lib/db/models/subscription"

interface Props {
  subscriptions: ISubscription[]
  selectedId?: string
  onSelect: (id: string) => void
  onNext: () => void
  onPrev: () => void
}

export default function GuestSubscriptionSelectionStep({
  subscriptions,
  selectedId,
  onSelect,
  onNext,
  onPrev,
}: Props) {
  const { t, language, dir } = useTranslation()
  return (
    <div className="space-y-6 px-4 sm:px-6" dir={dir} lang={language}>
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{t("subscriptions.purchase.selectSubscription")}</h2>
        <p className="text-muted-foreground mt-2">
          {t("subscriptions.purchase.selectSubscriptionDesc")}
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map(sub => (
          <Card
            key={String(sub._id)}
            className={`cursor-pointer border-2 transition-all ${selectedId === String(sub._id) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
            onClick={() => onSelect(String(sub._id))}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {sub.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">{sub.description}</p>
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                {sub.quantity + sub.bonusQuantity} {t("subscriptions.treatmentsLabel")}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={onPrev}>
          {t("common.back")}
        </Button>
        <Button onClick={onNext} disabled={!selectedId}>
          {t("common.next")}
        </Button>
      </div>
    </div>
  )
}
