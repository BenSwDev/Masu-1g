"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { BookingInitialData } from "@/types/booking"
import type { GiftVoucher } from '@/types/core';
import { useTranslation } from "@/lib/translations/i18n"

interface MemberRedemptionModalProps {
  subscriptions: BookingInitialData["activeUserSubscriptions"]
  vouchers: BookingInitialData["usableGiftVouchers"]
}

export default function MemberRedemptionModal({
  subscriptions,
  vouchers,
}: MemberRedemptionModalProps) {
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
          {subscriptions?.map((sub: UserSubscription) => (
            <div key={sub._id} className="border rounded p-3 space-y-1">
              <div className="font-medium">{(sub.subscriptionId as any)?.name}</div>
              {sub.treatmentId && (
                <div className="text-sm text-muted-foreground">{sub.treatmentId.name}</div>
              )}
              <div className="mt-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
                <div className="font-mono text-lg font-bold text-blue-800">{sub.code}</div>
                <div className="text-xs text-blue-600 mt-1">קוד המנוי למימוש</div>
              </div>
            </div>
          ))}
          {vouchers?.map((v: GiftVoucher) => (
            <div key={v._id} className="border rounded p-3 space-y-1">
              <div className="font-medium">
                {v.voucherType === "monetary"
                  ? t("giftVouchers.types.monetary") || "שובר כספי"
                  : t("giftVouchers.types.treatment") || "שובר טיפול"}
              </div>
              <div className="mt-2 p-3 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                <div className="font-mono text-lg font-bold text-green-800">{v.code}</div>
                <div className="text-xs text-green-600 mt-1">קוד השובר למימוש</div>
              </div>
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


