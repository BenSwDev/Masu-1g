"use client"

import { CheckCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"

interface Props {
  voucher: GiftVoucherPlain | null
}

export default function GuestGiftVoucherConfirmation({ voucher }: Props) {
  if (!voucher) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">אירעה שגיאה בעיבוד השובר</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">הרכישה הושלמה!</h1>
        <p className="text-lg text-muted-foreground">להלן פרטי השובר שרכשת</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>פרטי השובר</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>קוד שובר:</span>
            <span>{voucher.code}</span>
          </div>
          <div className="flex justify-between">
            <span>סוג שובר:</span>
            <span>{voucher.voucherType === "monetary" ? "כספי" : "טיפול"}</span>
          </div>
          {voucher.voucherType === "monetary" ? (
            <div className="flex justify-between">
              <span>ערך:</span>
              <span>{voucher.amount} ₪</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span>טיפול:</span>
                <span>{voucher.treatmentName}</span>
              </div>
              {voucher.selectedDurationName && (
                <div className="flex justify-between">
                  <span>משך:</span>
                  <span>{voucher.selectedDurationName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>מחיר:</span>
                <span>{voucher.amount} ₪</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div className="text-center">
        <Button asChild>
          <Link href="/">חזרה לדף הבית</Link>
        </Button>
      </div>
    </div>
  )
}
