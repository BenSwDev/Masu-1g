"use client"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { CheckCircle, GiftIcon, Ticket } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import type { IBooking } from "@/lib/db/models/booking" // Assuming IBooking is correctly typed
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"

interface BookingConfirmationProps {
  bookingResult: (IBooking & { updatedVoucherDetails?: IGiftVoucher }) | null // Allow updatedVoucherDetails
  translations: Record<string, string>
}

export default function BookingConfirmation({ bookingResult, translations }: BookingConfirmationProps) {
  if (!bookingResult) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-destructive">
          {translations["bookings.confirmation.errorTitle"] || "Booking Confirmation Error"}
        </h2>
        <p className="text-muted-foreground mt-2">
          {translations["bookings.confirmation.errorDesc"] ||
            "There was an issue confirming your booking. Please check your bookings page or contact support."}
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/member/bookings">
            {translations["bookings.confirmation.viewMyBookings"] || "View My Bookings"}
          </Link>
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
        <CardTitle className="text-3xl font-bold text-primary">
          {translations["bookings.confirmation.title"] || "Booking Confirmed!"}
        </CardTitle>
        <CardDescription className="text-lg text-muted-foreground mt-2">
          {translations["bookings.confirmation.description"] || "Your appointment has been successfully scheduled."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="space-y-3 text-sm">
          <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">
            {translations["bookings.confirmation.summaryTitle"] || "Booking Summary"}
          </h3>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {translations["bookings.confirmation.bookingId"] || "Booking ID"}:
            </span>
            <span className="font-medium text-foreground">{bookingId.toString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {translations["bookings.confirmation.treatment"] || "Treatment"}:
            </span>
            <span className="font-medium text-foreground">{(treatmentId as any)?.name || "Treatment Name"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {translations["bookings.confirmation.dateTime"] || "Date & Time"}:
            </span>
            <span className="font-medium text-foreground">{format(new Date(bookingDateTime), "PPPp")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{translations["bookings.confirmation.address"] || "Address"}:</span>
            <span className="font-medium text-foreground">
              {(selectedAddressId as any)?.street || "Selected Address"}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">
            {translations["bookings.confirmation.paymentTitle"] || "Payment Details"}
          </h3>
          {priceDetails.isBaseTreatmentCoveredBySubscription && (
            <div className="flex items-center text-green-600">
              <Ticket className="h-5 w-5 mr-2" />
              <span>
                {translations["bookings.confirmation.coveredBySubscription"] || "Treatment covered by subscription."}
              </span>
            </div>
          )}
          {priceDetails.isBaseTreatmentCoveredByTreatmentVoucher &&
            !priceDetails.isBaseTreatmentCoveredBySubscription && (
              <div className="flex items-center text-green-600">
                <GiftIcon className="h-5 w-5 mr-2" />
                <span>
                  {translations["bookings.confirmation.coveredByTreatmentVoucher"] ||
                    "Treatment covered by treatment gift voucher."}
                </span>
              </div>
            )}
          {priceDetails.appliedGiftVoucherId &&
            priceDetails.voucherAppliedAmount > 0 &&
            updatedVoucherDetails?.voucherType === "monetary" && (
              <div className="flex flex-col text-green-600">
                <div className="flex items-center">
                  <GiftIcon className="h-5 w-5 mr-2" />
                  <span>
                    {translations["bookings.confirmation.paidWithMonetaryVoucher"] || "Paid with Monetary Voucher"}:{" "}
                    {priceDetails.voucherAppliedAmount.toFixed(2)} {translations["common.currency"] || "ILS"}
                  </span>
                </div>
                {typeof updatedVoucherDetails.remainingAmount === "number" && (
                  <span className="text-xs ml-7">
                    ({translations["bookings.confirmation.voucherRemainingBalance"] || "Remaining Balance"}:{" "}
                    {updatedVoucherDetails.remainingAmount.toFixed(2)} {translations["common.currency"] || "ILS"})
                  </span>
                )}
              </div>
            )}
          {priceDetails.couponDiscount > 0 && (
            <div className="flex items-center text-green-600">
              {/* Icon for coupon if available */}
              <span>
                {translations["bookings.confirmation.couponApplied"] || "Coupon Applied"}: -
                {priceDetails.couponDiscount.toFixed(2)} {translations["common.currency"] || "ILS"}
              </span>
            </div>
          )}

          <div className="flex justify-between font-semibold text-lg text-foreground pt-2">
            <span>{translations["bookings.confirmation.totalPaid"] || "Total Paid"}:</span>
            <span>
              {priceDetails.finalAmount === 0 && priceDetails.isFullyCoveredByVoucherOrSubscription
                ? translations["bookings.confirmation.covered"] || "Covered"
                : `${priceDetails.finalAmount.toFixed(2)} ${translations["common.currency"] || "ILS"}`}
            </span>
          </div>
          {priceDetails.paymentDetails?.paymentStatus === "not_required" && priceDetails.finalAmount === 0 && (
            <p className="text-sm text-muted-foreground">
              {translations["bookings.confirmation.noPaymentRequired"] || "No payment was required for this booking."}
            </p>
          )}
        </div>

        <div className="pt-6 text-center">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/dashboard/member/bookings">
              {translations["bookings.confirmation.viewMyBookings"] || "View My Bookings"}
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center pt-4">
          {translations["bookings.confirmation.contactSupport"] ||
            "If you have any questions, please contact our support team."}
        </p>
      </CardContent>
    </Card>
  )
}
