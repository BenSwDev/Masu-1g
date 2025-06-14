"use client"

import { Package, User, Mail, Phone } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"

interface GuestInfo {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

interface Props {
  guestInfo: GuestInfo
  subscription?: ISubscription
  treatment?: ITreatment
  durationPrice?: number
  onNext: () => void
  onPrev: () => void
}

export default function GuestSubscriptionSummaryStep({
  guestInfo,
  subscription,
  treatment,
  durationPrice = 0,
  onNext,
  onPrev,
}: Props) {
  const { dir } = useTranslation()
  const totalPrice = subscription ? (subscription.quantity * durationPrice) : 0

  return (
    <div className="space-y-6" dir={dir}>
      <div className="text-center">
        <h2 className="text-2xl font-semibold">סיכום הזמנה</h2>
        <p className="text-muted-foreground mt-2">בדוק את הפרטים לפני התשלום</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-3">פרטי המנוי</h3>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {subscription?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">{subscription?.description}</p>
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                {subscription ? subscription.quantity + subscription.bonusQuantity : 0} טיפולים
              </span>
            </CardContent>
          </Card>
          <h3 className="text-lg font-medium mb-3">פרטי הטיפול</h3>
          <Card>
            <CardHeader>
              <CardTitle>{treatment?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{treatment?.description}</p>
            </CardContent>
          </Card>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-3">פרטי מזמין</h3>
          <Card>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4" /> שם:
                </span>
                <span className="font-medium">{guestInfo.firstName} {guestInfo.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" /> אימייל:
                </span>
                <span className="font-medium">{guestInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-4 w-4" /> טלפון:
                </span>
                <span className="font-medium">{guestInfo.phone}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>סיכום מחיר</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-2">
                <span>מחיר לטיפול:</span>
                <span>{durationPrice.toFixed(2)} ₪</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>כמות טיפולים במנוי:</span>
                <span>{subscription?.quantity || 0}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>טיפולי בונוס:</span>
                <span>{subscription?.bonusQuantity || 0}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>סה"כ:</span>
                <span>{totalPrice.toFixed(2)} ₪</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onPrev}>חזור</Button>
        <Button onClick={onNext}>המשך לתשלום</Button>
      </div>
    </div>
  )
}
