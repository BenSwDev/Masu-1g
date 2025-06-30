"use client"

import { Package, User, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import { formatPhoneForDisplay } from "@/lib/phone-utils"

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
  const { t, language, dir } = useTranslation()
  const totalPrice = subscription ? subscription.quantity * durationPrice : 0

  return (
    <div className="space-y-6 px-4 sm:px-6" dir={dir} lang={language}>
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{t("subscriptions.purchase.summary")}</h2>
        <p className="text-muted-foreground mt-2">
          {t("subscriptions.purchase.reviewBeforePurchase")}
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-3">{t("subscriptions.detailsTitle")}</h3>
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
                {subscription ? subscription.quantity + subscription.bonusQuantity : 0}{" "}
                {t("subscriptions.treatmentsLabel")}
              </span>
            </CardContent>
          </Card>
          <h3 className="text-lg font-medium mb-3">{t("treatments.treatmentDetails")}</h3>
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
          <h3 className="text-lg font-medium mb-3">{t("giftVouchers.purchaserDetails")}</h3>
          <Card>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4" /> {t("common.name")}:
                </span>
                <span className="font-medium">
                  {guestInfo.firstName} {guestInfo.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" /> {t("common.email")}:
                </span>
                <span className="font-medium">{guestInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-4 w-4" /> {t("common.phone")}:
                </span>
                <span className="font-medium">{formatPhoneForDisplay(guestInfo.phone || "")}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("common.priceSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-2">
                <span>{t("subscriptions.pricePerSession")}:</span>
                <span>{durationPrice.toFixed(2)} ₪</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>{t("subscriptions.quantity")}</span>
                <span>{subscription?.quantity || 0}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>{t("subscriptions.bonusQuantity")}</span>
                <span>{subscription?.bonusQuantity || 0}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>{t("common.total")}</span>
                <span>{totalPrice.toFixed(2)} ₪</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onPrev}>
          {t("common.back")}
        </Button>
        <Button onClick={onNext}>{t("subscriptions.purchase.confirmAndPay")}</Button>
      </div>
    </div>
  )
}
