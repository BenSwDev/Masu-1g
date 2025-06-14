"use client"

import { Package } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
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
  const { dir } = useTranslation()
  return (
    <div className="space-y-6" dir={dir}>
      <div className="text-center">
        <h2 className="text-2xl font-semibold">בחר מנוי</h2>
        <p className="text-muted-foreground mt-2">בחר את המנוי המתאים עבורך</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map((sub) => (
          <Card
            key={sub._id.toString()}
            className={`cursor-pointer border-2 transition-all ${selectedId === sub._id.toString() ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
            onClick={() => onSelect(sub._id.toString())}
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
                {sub.quantity + sub.bonusQuantity} טיפולים
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={onPrev}>חזור</Button>
        <Button onClick={onNext} disabled={!selectedId}>המשך</Button>
      </div>
    </div>
  )
}
