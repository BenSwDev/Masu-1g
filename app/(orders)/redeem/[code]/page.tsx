import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"

interface Params { code: string }

export default async function RedeemPage({ params }: { params: Params }) {
  const result = await getGiftVoucherByCode(params.code)
  if (!result.success || !result.voucher) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center">
        <p className="text-destructive">שובר לא נמצא או שאינו תקף</p>
      </div>
    )
  }
  const voucher = result.voucher
  return (
    <div className="max-w-xl mx-auto space-y-6 py-10">
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
            <span>סוג:</span>
            <span>{voucher.voucherType === "monetary" ? "כספי" : "טיפול"}</span>
          </div>
          {voucher.voucherType === "monetary" ? (
            <div className="flex justify-between">
              <span>יתרה:</span>
              <span>{voucher.remainingAmount?.toFixed(2)} ₪</span>
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
            </>
          )}
        </CardContent>
      </Card>
      <div className="text-center">
        <Button asChild>
          <Link href={`/bookings/treatment?voucherCode=${params.code}`}>ממש שובר</Link>
        </Button>
      </div>
    </div>
  )
}
