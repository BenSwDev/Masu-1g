"use client"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { CheckCircle, GiftIcon, Ticket } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import type { IBooking } from "@/lib/db/models/booking" // Assuming IBooking is correctly typed
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"
import { useTranslation } from "@/lib/translations/i18n"

interface BookingConfirmationProps {
  bookingResult: (IBooking & { updatedVoucherDetails?: IGiftVoucher }) | null
}

export default function BookingConfirmation({ bookingResult }: BookingConfirmationProps) {
  const { t } = useTranslation()
  if (!bookingResult) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-destructive">{t("bookings.confirmation.errorTitle")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.confirmation.errorDesc")}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/member/bookings">{t("bookings.confirmation.viewMyBookings")}</Link>
        </Button>
      </div>
    )
  }

  const {
    treatmentId,
    bookingDateTime,
    selectedAddressId,
    priceDetails,
    _id: bookingId,
    updatedVoucherDetails, // Destructure this
  } = bookingResult

  // For display, you might want to fetch actual names/details based on IDs
  // For simplicity, we'll just show what's available in bookingResult or use placeholders

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center bg-primary/5 rounded-t-lg py-8">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <CardTitle className="text-3xl font-bold text-primary">{t("bookings.confirmation.title")}</CardTitle>
        <CardDescription className="text-lg text-muted-foreground mt-2">
          {t("bookings.confirmation.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="space-y-3 text-sm">
          <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">
            {t("bookings.confirmation.summaryTitle")}
          </h3>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bookings.confirmation.bookingId")}:</span>
            <span className="font-medium text-foreground">{bookingId.toString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bookings.confirmation.treatment")}:</span>
            <span className="font-medium text-foreground">{(treatmentId as any)?.name || "Treatment Name"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bookings.confirmation.dateTime")}:</span>
            <span className="font-medium text-foreground">{format(new Date(bookingDateTime), "PPPp")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bookings.confirmation.address")}:</span>
            <span className="font-medium text-foreground">
              {(selectedAddressId as any)?.street || "Selected Address"}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">
            {t("bookings.confirmation.paymentTitle")}
          </h3>
          {priceDetails.isBaseTreatmentCoveredBySubscription && (
            <div className="flex items-center text-green-600">
              <Ticket className="h-5 w-5 mr-2" />
              <span>{t("bookings.confirmation.coveredBySubscription")}</span>
            </div>
          )}
          {priceDetails.isBaseTreatmentCoveredByTreatmentVoucher &&
            !priceDetails.isBaseTreatmentCoveredBySubscription && (
              <div className="flex items-center text-green-600">
                <GiftIcon className="h-5 w-5 mr-2" />
                <span>{t("bookings.confirmation.coveredByTreatmentVoucher")}</span>
              </div>
            )}
          {priceDetails.appliedGiftVoucherId &&
            priceDetails.voucherAppliedAmount > 0 &&
            updatedVoucherDetails?.voucherType === "monetary" && (
              <div className="flex flex-col text-green-600">
                <div className="flex items-center">
                  <GiftIcon className="h-5 w-5 mr-2" />
                  <span>
                    {t("bookings.confirmation.paidWithMonetaryVoucher")}: {priceDetails.voucherAppliedAmount.toFixed(2)}{" "}
                    {t("common.currency")}
                  </span>
                </div>
                {typeof updatedVoucherDetails.remainingAmount === "number" && (
                  <span className="text-xs ml-7">
                    ({t("bookings.confirmation.voucherRemainingBalance")}:{" "}
                    {updatedVoucherDetails.remainingAmount.toFixed(2)} {t("common.currency")})
                  </span>
                )}
              </div>
            )}
          {priceDetails.couponDiscount > 0 && (
            <div className="flex items-center text-green-600">
              {/* Icon for coupon if available */}
              <span>
                {t("bookings.confirmation.couponApplied")}: -{priceDetails.couponDiscount.toFixed(2)}{" "}
                {t("common.currency")}
              </span>
            </div>
          )}

          <div className="flex justify-between font-semibold text-lg text-foreground pt-2">
            <span>{t("bookings.confirmation.totalPaid")}:</span>
            <span>
              {priceDetails.finalAmount === 0 && priceDetails.isFullyCoveredByVoucherOrSubscription
                ? t("bookings.confirmation.covered")
                : `${priceDetails.finalAmount.toFixed(2)} ${t("common.currency")}`}
            </span>
          </div>
          {priceDetails.paymentDetails?.paymentStatus === "not_required" && priceDetails.finalAmount === 0 && (
            <p className="text-sm text-muted-foreground">{t("bookings.confirmation.noPaymentRequired")}</p>
          )}
        </div>

        <div className="pt-6 text-center">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/dashboard/member/bookings">{t("bookings.confirmation.viewMyBookings")}</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center pt-4">{t("bookings.confirmation.contactSupport")}</p>
      </CardContent>
    </Card>
  )
}
