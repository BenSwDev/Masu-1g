"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"
import type { BookingInitialData } from "@/types/booking"
import { useTranslation } from "@/lib/translations/i18n"

interface MemberRedemptionModalProps {
  subscriptions: BookingInitialData["activeUserSubscriptions"]
  vouchers: BookingInitialData["usableGiftVouchers"]
}

export default function MemberRedemptionModal({ subscriptions, vouchers }: MemberRedemptionModalProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if ((subscriptions?.length || 0) > 0 || (vouchers?.length || 0) > 0) {
      setOpen(true)
    }
  }, [subscriptions, vouchers])

  if (!subscriptions?.length && !vouchers?.length) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("bookings.redeem.chooseTitle") || "מימוש שובר או מנוי"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {subscriptions?.map((sub: any) => (
            <div key={sub._id} className="border rounded p-3 space-y-1">
              <div className="font-medium">{(sub.subscriptionId as any)?.name}</div>
              {sub.treatmentId && (
                <div className="text-sm text-muted-foreground">{sub.treatmentId.name}</div>
              )}
              <Button asChild className="mt-2 w-full">
                <Link href={`/redeem-subscription/${sub._id}`}>{t("subscriptions.redeem") || "למימוש"}</Link>
              </Button>
            </div>
          ))}
          {vouchers?.map((v: any) => (
            <div key={v._id} className="border rounded p-3 space-y-1">
              <div className="font-medium">{v.voucherType === "monetary" ? t("giftVouchers.types.monetary") || "שובר כספי" : t("giftVouchers.types.treatment") || "שובר טיפול"}</div>
              <div className="text-sm">{v.code}</div>
              <Button asChild className="mt-2 w-full">
                <Link href={`/redeem/${v.code}`}>{t("giftVouchers.redeemVoucher") || "למימוש"}</Link>
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={() => setOpen(false)} className="mt-4 w-full">
          {t("common.close") || "סגור"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

