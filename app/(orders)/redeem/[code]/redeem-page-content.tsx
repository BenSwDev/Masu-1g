"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"
import { useTranslation } from "@/lib/translations/i18n"
import type { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"

interface RedeemPageContentProps {
  voucher: Awaited<ReturnType<typeof getGiftVoucherByCode>>["voucher"] | null
  code: string
}

export default function RedeemPageContent({ voucher, code }: RedeemPageContentProps) {
  const { t, language, dir } = useTranslation()

  if (!voucher) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center px-4" dir={dir} lang={language}>
        <p className="text-destructive">{t("giftVouchers.redeem.voucherInvalid")}</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-10 px-4" dir={dir} lang={language}>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{t("giftVouchers.voucherDetailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm md:text-base">
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
              <span>{t("giftVouchers.remaining")}</span>
              <span>{voucher.remainingAmount?.toFixed(2)} ₪</span>
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
            </>
          )}
        </CardContent>
      </Card>
      <div className="text-center">
        <Button asChild>
          <Link href={`/bookings/treatment?voucherCode=${code}`}>{t("giftVouchers.redeemVoucher")}</Link>
        </Button>
      </div>
    </div>
  )
}

