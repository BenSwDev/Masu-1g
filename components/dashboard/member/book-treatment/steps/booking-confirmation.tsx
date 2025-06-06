"use client"

import type React from "react"
import { useMemo } from "react"
import { format } from "date-fns"
import {
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  GiftIcon,
  Ticket,
  CreditCard,
  Info,
  ListChecks,
  Building,
  Home,
  Briefcase,
  Hotel,
} from "lucide-react"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { useTranslation } from "@/lib/translations/i18n"
import type { BookingInitialData } from "@/types/booking"
import type { IBooking, IBookingAddressSnapshot } from "@/lib/db/models/booking"
import type { IGiftVoucher, IGiftVoucherUsageHistory } from "@/lib/db/models/gift-voucher"
import type { UserSessionData } from "@/types/next-auth"
import Link from "next/link"

interface BookingConfirmationProps {
  bookingResult: IBooking // Type from your IBooking model definition
  initialData: BookingInitialData
  currentUser: UserSessionData
}

export default function BookingConfirmation({ bookingResult, initialData, currentUser }: BookingConfirmationProps) {
  const { t } = useTranslation()

  if (!bookingResult) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("common.error")}</AlertTitle>
        <AlertDescription>{t("bookings.confirmation.errorLoading")}</AlertDescription>
        {/* bookings.confirmation.errorLoading: Error loading booking confirmation. Please try again or contact support. */}
      </Alert>
    )
  }

  const {
    bookingNumber,
    status,
    recipientName,
    recipientPhone,
    bookedByUserName,
    bookedByUserEmail,
    bookedByUserPhone,
    treatmentId,
    selectedDurationId,
    bookingDateTime,
    isFlexibleTime,
    flexibilityRangeHours,
    therapistGenderPreference,
    notes,
    professionalId,
    bookingAddressSnapshot,
    source,
    priceDetails,
    paymentDetails,
    // @ts-ignore // Accessing potentially added property
    updatedVoucherDetails,
  } = bookingResult

  const selectedTreatment = useMemo(() => {
    return initialData.activeTreatments.find(
      (treat) => treat._id.toString() === (treatmentId as any)?.toString(), // treatmentId might be ObjectId or string
    )
  }, [initialData.activeTreatments, treatmentId])

  const selectedDuration = useMemo(() => {
    if (selectedTreatment?.pricingType === "duration_based" && selectedDurationId) {
      return selectedTreatment.durations?.find((d) => d._id.toString() === (selectedDurationId as any)?.toString())
    }
    return null
  }, [selectedTreatment, selectedDurationId])

  const getBookingStatusText = (statusKey: string) => {
    const key = `bookings.confirmation.status.${statusKey.toLowerCase()}`
    // Example keys:
    // bookings.confirmation.status.pending_professional_assignment: Pending Professional Assignment
    // bookings.confirmation.status.confirmed: Confirmed
    // bookings.confirmation.status.professional_en_route: Professional En Route
    // bookings.confirmation.status.completed: Completed
    // bookings.confirmation.status.cancelled_by_user: Cancelled by User
    // bookings.confirmation.status.cancelled_by_admin: Cancelled by Admin
    // bookings.confirmation.status.no_show: No Show
    return t(key) || statusKey
  }

  const getPaymentStatusText = (statusKey: string) => {
    const key = `bookings.confirmation.paymentStatus.${statusKey.toLowerCase()}`
    // Example keys:
    // bookings.confirmation.paymentStatus.pending: Pending
    // bookings.confirmation.paymentStatus.paid: Paid
    // bookings.confirmation.paymentStatus.failed: Failed
    // bookings.confirmation.paymentStatus.not_required: Not Required
    return t(key) || statusKey
  }

  const getGenderPreferenceText = (preferenceKey?: string) => {
    if (!preferenceKey) return t("preferences.treatment.genderAny")
    const key = `preferences.treatment.gender${preferenceKey.charAt(0).toUpperCase()}${preferenceKey.slice(1)}`
    return t(key) || preferenceKey
  }

  const bookingSourceText = useMemo(() => {
    if (source === "subscription_redemption") return t("bookings.confirmation.sourceSubscription")
    if (source === "gift_voucher_redemption") return t("bookings.confirmation.sourceGiftVoucher")
    return t("bookings.confirmation.sourceNewPurchase")
    // bookings.confirmation.sourceSubscription: Subscription Redemption
    // bookings.confirmation.sourceGiftVoucher: Gift Voucher Redemption
    // bookings.confirmation.sourceNewPurchase: New Purchase
  }, [source, t])

  const redeemedSubscriptionDetails = useMemo(() => {
    if (priceDetails.redeemedUserSubscriptionId) {
      const sub = initialData.activeUserSubscriptions.find(
        (s) => s._id.toString() === priceDetails.redeemedUserSubscriptionId?.toString(),
      )
      return sub ? (sub.subscriptionId as any)?.name || t("bookings.unknownSubscription") : null
    }
    return null
  }, [priceDetails.redeemedUserSubscriptionId, initialData.activeUserSubscriptions, t])

  const redeemedGiftVoucherDetails = useMemo(() => {
    if (priceDetails.appliedGiftVoucherId) {
      const voucher = initialData.usableGiftVouchers.find(
        (v) => v._id.toString() === priceDetails.appliedGiftVoucherId?.toString(),
      )
      if (voucher) {
        return voucher.voucherType === "treatment"
          ? `${voucher.code} (${voucher.treatmentName || selectedTreatment?.name}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""})`
          : `${voucher.code} (${t("bookings.monetaryVoucher")} - ${t("bookings.balance")}: ${voucher.remainingAmount?.toFixed(2)} ${t("common.currency")})`
      }
    }
    return null
  }, [priceDetails.appliedGiftVoucherId, initialData.usableGiftVouchers, selectedTreatment, t])

  const professionalName = professionalId
    ? (professionalId as any).name
    : t("bookings.confirmation.professionalToBeAssigned")
  // bookings.confirmation.professionalToBeAssigned: To be assigned

  const renderAddressLine = (labelKey: string, value?: string | number | null, icon?: React.ReactNode) =>
    value && (
      <div className="flex items-start">
        {icon && <span className="mr-2 mt-1 text-muted-foreground">{icon}</span>}
        <p>
          <span className="text-muted-foreground">{t(labelKey)}:</span> {value}
        </p>
      </div>
    )

  const getAddressIcon = (addressType?: string) => {
    switch (addressType) {
      case "apartment":
        return <Building className="h-4 w-4" />
      case "house":
      case "private":
        return <Home className="h-4 w-4" />
      case "office":
        return <Briefcase className="h-4 w-4" />
      case "hotel":
        return <Hotel className="h-4 w-4" />
      default:
        return <MapPin className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-green-50 dark:bg-green-900/30 p-6">
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-500 mb-3" />
            <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400">
              {t("bookings.confirmation.title")}
              {/* bookings.confirmation.title: Booking Confirmed! */}
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              {t("bookings.confirmation.thankYou")}
              {/* bookings.confirmation.thankYou: Thank you for your booking! We've received your request. */}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-muted-foreground">{t("bookings.confirmation.bookingNumber")}:</span>
            {/* bookings.confirmation.bookingNumber: Booking Number */}
            <span className="font-semibold">{bookingNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-muted-foreground">{t("bookings.confirmation.status")}:</span>
            {/* bookings.confirmation.status: Status */}
            <span className="font-semibold">{getBookingStatusText(status)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Booking For Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="mr-2 h-5 w-5 text-primary" />
            {t("bookings.confirmation.bookedFor")}
            {/* bookings.confirmation.bookedFor: Booked For */}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recipientName ? (
            <>
              {renderAddressLine("bookings.confirmation.recipientName", recipientName)}
              {/* bookings.confirmation.recipientName: Recipient Name */}
              {recipientPhone &&
                renderAddressLine(
                  "bookings.confirmation.recipientPhone",
                  recipientPhone,
                  <Phone className="h-4 w-4" />,
                )}
              {/* bookings.confirmation.recipientPhone: Recipient Phone */}
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">{t("bookings.confirmation.bookedBy")}:</p>
              {/* bookings.confirmation.bookedBy: Booked By */}
              {renderAddressLine("", bookedByUserName, <User className="h-4 w-4" />)}
            </>
          ) : (
            <>
              {renderAddressLine("", bookedByUserName, <User className="h-4 w-4" />)}
              {bookedByUserEmail && renderAddressLine("", bookedByUserEmail, <Mail className="h-4 w-4" />)}
              {bookedByUserPhone && renderAddressLine("", bookedByUserPhone, <Phone className="h-4 w-4" />)}
            </>
          )}
        </CardContent>
      </Card>

      {/* Treatment Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ListChecks className="mr-2 h-5 w-5 text-primary" />
            {t("bookings.confirmation.treatmentDetails")}
            {/* bookings.confirmation.treatmentDetails: Treatment Details */}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-medium">{t("bookings.confirmation.treatment")}:</span>
            {/* bookings.confirmation.treatment: Treatment */}
            <div className="font-semibold text-right">
              <span>
                {selectedTreatment?.name || t("common.notAvailable")}
                {selectedDuration
                  ? ` (${selectedDuration.minutes} ${t("common.minutes")})`
                  : selectedTreatment?.pricingType === "fixed" && selectedTreatment.defaultDurationMinutes
                    ? ` (${selectedTreatment.defaultDurationMinutes} ${t("common.minutes")})`
                    : ""}
              </span>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">{t("bookings.confirmation.dateTime")}:</span>
            {/* bookings.confirmation.dateTime: Date & Time */}
            <span className="font-semibold text-right">
              {bookingDateTime
                ? format(new Date(bookingDateTime), "PPP HH:mm", { locale: initialData.locale })
                : t("common.notAvailable")}
            </span>
          </div>
          {isFlexibleTime && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">{t("bookings.steps.summary.flexibleTime")}:</span>
                <span className="font-semibold text-primary text-right">
                  {t("bookings.confirmation.flexibleTimeInfo", { hours: flexibilityRangeHours || 2 })}
                  {/* bookings.confirmation.flexibleTimeInfo: Flexible: Yes (±{hours} hours) */}
                </span>
              </div>
            </>
          )}
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">{t("bookings.confirmation.therapistPreference")}:</span>
            {/* bookings.confirmation.therapistPreference: Therapist Preference */}
            <span className="font-semibold text-right">{getGenderPreferenceText(therapistGenderPreference)}</span>
          </div>
          {notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">{t("bookings.confirmation.notes")}:</span>
                {/* bookings.confirmation.notes: Notes */}
                <p className="font-semibold text-sm bg-muted p-2 rounded-md whitespace-pre-wrap">{notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Professional Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="mr-2 h-5 w-5 text-primary" />
            {t("bookings.confirmation.professionalDetails")}
            {/* bookings.confirmation.professionalDetails: Professional Details */}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            <span className="text-muted-foreground">{t("bookings.confirmation.professionalName")}:</span>{" "}
            {professionalName}
          </p>
          {/* bookings.confirmation.professionalName: Professional */}
        </CardContent>
      </Card>

      {/* Address Details Section */}
      {bookingAddressSnapshot && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              {getAddressIcon(
                (bookingAddressSnapshot as IBookingAddressSnapshot & { addressType?: string }).addressType,
              )}
              <span className="ml-2">{t("bookings.confirmation.addressDetails")}</span>
              {/* bookings.confirmation.addressDetails: Address Details */}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{bookingAddressSnapshot.fullAddress || t("common.notAvailable")}</p>
            {/* bookings.confirmation.fullAddress: Full Address */}
            {renderAddressLine("addresses.fields.city", bookingAddressSnapshot.city)}
            {renderAddressLine("addresses.fields.street", bookingAddressSnapshot.street)}
            {renderAddressLine("addresses.fields.streetNumber", bookingAddressSnapshot.streetNumber)}
            {renderAddressLine("addresses.fields.apartment", bookingAddressSnapshot.apartment)}
            {renderAddressLine("addresses.fields.entrance", bookingAddressSnapshot.entrance)}
            {renderAddressLine("addresses.fields.floor", bookingAddressSnapshot.floor)}
            {bookingAddressSnapshot.doorName &&
              renderAddressLine("addresses.fields.doorName", bookingAddressSnapshot.doorName)}
            {bookingAddressSnapshot.buildingName &&
              renderAddressLine("addresses.fields.buildingName", bookingAddressSnapshot.buildingName)}
            {bookingAddressSnapshot.hotelName &&
              renderAddressLine("addresses.fields.hotelName", bookingAddressSnapshot.hotelName)}
            {bookingAddressSnapshot.roomNumber &&
              renderAddressLine("addresses.fields.roomNumber", bookingAddressSnapshot.roomNumber)}
            {bookingAddressSnapshot.otherInstructions &&
              renderAddressLine("addresses.fields.otherInstructions", bookingAddressSnapshot.otherInstructions)}
            {bookingAddressSnapshot.notes && (
              <>
                <Separator className="my-2" />
                <p className="text-xs">
                  <span className="text-muted-foreground">{t("bookings.confirmation.addressNotes")}:</span>{" "}
                  {bookingAddressSnapshot.notes}
                  {/* bookings.confirmation.addressNotes: Address Notes */}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Source & Price Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-primary" />
            {t("bookings.confirmation.priceSummary")}
            {/* bookings.confirmation.priceSummary: Price Summary */}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bookings.confirmation.bookingSource")}:</span>
            {/* bookings.confirmation.bookingSource: Booking Source */}
            <span className="font-semibold">{bookingSourceText}</span>
          </div>
          {redeemedSubscriptionDetails && (
            <div className="flex justify-between items-center text-green-600">
              <span className="flex items-center">
                <Ticket className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.usedSubscription")}:
              </span>
              {/* bookings.confirmation.usedSubscription: Used Subscription */}
              <span className="font-medium">{redeemedSubscriptionDetails}</span>
            </div>
          )}
          {redeemedGiftVoucherDetails && (
            <div className="flex justify-between items-center text-green-600">
              <span className="flex items-center">
                <GiftIcon className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.usedGiftVoucher")}:
              </span>
              {/* bookings.confirmation.usedGiftVoucher: Used Gift Voucher */}
              <span className="font-medium">{redeemedGiftVoucherDetails}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span>{t("bookings.confirmation.basePrice")}:</span>
            {/* bookings.confirmation.basePrice: Base Price */}
            <span>
              {priceDetails.basePrice.toFixed(2)} {t("common.currency")}
            </span>
          </div>
          {priceDetails.isBaseTreatmentCoveredBySubscription && (
            <div className="flex justify-between items-center font-medium text-green-600">
              <span className="flex items-center">
                <Ticket className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.treatmentCoveredBySubscription")}
              </span>
              {/* bookings.confirmation.treatmentCoveredBySubscription: Treatment covered by subscription */}
              <span className="line-through text-muted-foreground">
                (-{priceDetails.basePrice.toFixed(2)} {t("common.currency")})
              </span>
            </div>
          )}
          {priceDetails.isBaseTreatmentCoveredByTreatmentVoucher &&
            !priceDetails.isBaseTreatmentCoveredBySubscription && (
              <div className="flex justify-between items-center font-medium text-green-600">
                <span className="flex items-center">
                  <GiftIcon className="mr-2 h-4 w-4" />
                  {t("bookings.confirmation.treatmentCoveredByVoucher")}
                </span>
                {/* bookings.confirmation.treatmentCoveredByVoucher: Treatment covered by voucher */}
                <span className="line-through text-muted-foreground">
                  (-{priceDetails.basePrice.toFixed(2)} {t("common.currency")})
                </span>
              </div>
            )}
          {priceDetails.surcharges?.map((surcharge, index) => (
            <div key={index} className="flex justify-between">
              <span>{t(surcharge.description) || surcharge.description}:</span>
              <span className="text-orange-600">
                + {surcharge.amount.toFixed(2)} {t("common.currency")}
              </span>
            </div>
          ))}
          {priceDetails.appliedGiftVoucherId &&
            priceDetails.voucherAppliedAmount > 0 &&
            !priceDetails.isBaseTreatmentCoveredByTreatmentVoucher && (
              <div className="flex justify-between items-center font-medium text-green-600">
                <span className="flex items-center">
                  <GiftIcon className="mr-2 h-4 w-4" />
                  {t("bookings.confirmation.monetaryVoucherApplied")}
                </span>
                {/* bookings.confirmation.monetaryVoucherApplied: Monetary voucher applied */}
                <span>
                  - {priceDetails.voucherAppliedAmount.toFixed(2)} {t("common.currency")}
                </span>
              </div>
            )}
          {priceDetails.discountAmount > 0 && (
            <div className="flex justify-between items-center font-medium text-green-600">
              <span className="flex items-center">
                <Tag className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.couponDiscount")}:
              </span>
              {/* bookings.confirmation.couponDiscount: Coupon Discount */}
              <span>
                - {priceDetails.discountAmount.toFixed(2)} {t("common.currency")}
              </span>
            </div>
          )}
          <Separator className="my-3" />
          <div className="flex justify-between font-bold text-lg">
            <span>{t("bookings.confirmation.totalAmount")}:</span>
            {/* bookings.confirmation.totalAmount: Total Amount */}
            <span className="text-primary">
              {priceDetails.isFullyCoveredByVoucherOrSubscription
                ? t("bookings.confirmation.gift") /* bookings.confirmation.gift: Gift */
                : `${priceDetails.finalAmount.toFixed(2)} ${t("common.currency")}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-primary" />
            {t("bookings.confirmation.paymentDetails")}
            {/* bookings.confirmation.paymentDetails: Payment Details */}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bookings.confirmation.paymentStatus")}:</span>
            {/* bookings.confirmation.paymentStatus: Payment Status */}
            <span className="font-semibold">{getPaymentStatusText(paymentDetails.paymentStatus)}</span>
          </div>
          {paymentDetails.paymentMethodId && priceDetails.finalAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("bookings.confirmation.paymentMethod")}:</span>
              {/* bookings.confirmation.paymentMethod: Payment Method */}
              <span className="font-semibold">
                {initialData.userPaymentMethods.find(
                  (pm) => pm._id.toString() === paymentDetails.paymentMethodId?.toString(),
                )?.displayName || t("common.cardEndingIn", { last4: "XXXX" })}
                {/* common.cardEndingIn: Card ending in {last4} */}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voucher Usage History if applicable */}
      {updatedVoucherDetails &&
        (updatedVoucherDetails as IGiftVoucher).usageHistory &&
        (updatedVoucherDetails as IGiftVoucher).usageHistory!.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" />
                {t("bookings.confirmation.voucherUsageTitle")}
                {/* bookings.confirmation.voucherUsageTitle: Voucher Usage Update */}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                {t("bookings.confirmation.voucherCodeUsed", { code: (updatedVoucherDetails as IGiftVoucher).code })}
              </p>
              {/* bookings.confirmation.voucherCodeUsed: Details for voucher {code}: */}
              <p>
                {t("bookings.confirmation.voucherRemainingBalance", {
                  balance: (updatedVoucherDetails as IGiftVoucher).remainingAmount?.toFixed(2) || "0.00",
                  currency: t("common.currency"),
                })}
              </p>
              {/* bookings.confirmation.voucherRemainingBalance: Remaining Balance: {balance} {currency} */}
              {(updatedVoucherDetails as IGiftVoucher).usageHistory!.map(
                (entry: IGiftVoucherUsageHistory, index: number) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    {/* Ensure entry.date is converted to Date object if it's a string */}
                    <span>{format(new Date(entry.date), "PPP HH:mm", { locale: initialData.locale })}: </span>
                    <span>
                      {t(entry.description) || entry.description} - {entry.amountUsed.toFixed(2)} {t("common.currency")}
                    </span>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        )}

      <CardFooter className="flex flex-col items-center gap-4 p-6 border-t">
        <Link href="/dashboard/member/bookings" passHref legacyBehavior>
          <Button size="lg" className="w-full sm:w-auto">
            {t("bookings.confirmation.viewBookingsLink")}
            {/* bookings.confirmation.viewBookingsLink: View My Bookings */}
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground text-center">
          {t("bookings.confirmation.contactSupport")}
          {/* bookings.confirmation.contactSupport: If you have any questions or need to make changes, please contact support or visit your bookings page. */}
        </p>
      </CardFooter>
    </div>
  )
}
