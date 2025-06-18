"use client"

import { CheckCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { useTranslation } from "@/lib/translations/i18n"

interface Props {
  voucher: GiftVoucherPlain | null
}

export default function GuestGiftVoucherConfirmation({ voucher }: Props) {
  const { t, language, dir } = useTranslation()
  if (!voucher) {
    return (
      <div className="text-center py-8" dir={dir} lang={language}>
        <p className="text-destructive">{t("giftVouchers.processingError")}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6" dir={dir} lang={language}>
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">{t("giftVouchers.purchaseComplete")}</h1>
        <p className="text-lg text-muted-foreground">{t("giftVouchers.voucherDetailsDescription")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("giftVouchers.voucherDetailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>{t("giftVouchers.voucherCode")}</span>
            <span>{voucher.code}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("giftVouchers.type")}</span>
            <span>{voucher.voucherType === "monetary" ? t("giftVouchers.types.monetary") : t("giftVouchers.types.treatment")}</span>
          </div>
          {voucher.voucherType === "monetary" ? (
            <div className="flex justify-between">
              <span>{t("giftVouchers.value")}</span>
              <span>{voucher.amount} ₪</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span>{t("giftVouchers.treatment")}</span>
                <span>{voucher.treatmentName}</span>
              </div>
              {voucher.selectedDurationName && (
                <div className="flex justify-between">
                  <span>{t("giftVouchers.duration")}</span>
                  <span>{voucher.selectedDurationName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t("giftVouchers.price")}</span>
                <span>{voucher.amount} ₪</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div className="text-center">
        <Button asChild>
          <Link href="/">{t("common.backToHome")}</Link>
        </Button>
      </div>
    </div>
  )
}
