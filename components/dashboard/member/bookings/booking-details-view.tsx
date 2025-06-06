"use client"

import type React from "react"
import { useMemo } from "react"
import { format } from "date-fns"
import {
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  GiftIcon,
  Ticket,
  CreditCard,
  ListChecks,
  Building,
  Home,
  Briefcase,
  Hotel,
  Hourglass,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Badge } from "@/components/common/ui/badge"
import { useTranslation } from "@/lib/translations/i18n"
import type { PopulatedBooking } from "@/actions/booking-actions"
import type { IBookingAddressSnapshot, ITreatmentDuration } from "@/lib/db/models/booking"
import { cn, formatCurrency } from "@/lib/utils/utils"
import type { IGiftVoucherUsageHistory } from "@/lib/db/models/gift-voucher"

interface BookingDetailsViewProps {
  booking: PopulatedBooking
  // currentUser: UserSessionData // May not be needed if all info is in booking
}

export default function BookingDetailsView({ booking }: BookingDetailsViewProps) {
  const { t, locale } = useTranslation()

  const {
    bookingNumber,
    status,
    recipientName,
    recipientPhone,
    bookedByUserName,
    bookedByUserEmail,
    bookedByUserPhone,
    treatmentId: populatedTreatment, // Renamed for clarity
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
  } = booking

  const selectedTreatmentName = populatedTreatment?.name || t("common.unknownTreatment")
  const selectedTreatmentPricingType = populatedTreatment?.pricingType

  const selectedDuration = useMemo(() => {
    if (populatedTreatment?.pricingType === "duration_based" && selectedDurationId && populatedTreatment.durations) {
      return populatedTreatment.durations.find(
        (d: ITreatmentDuration) => d._id.toString() === selectedDurationId.toString(),
      )
    }
    return null
  }, [populatedTreatment, selectedDurationId])

  const getBookingStatusInfo = (statusKey: PopulatedBooking["status"]) => {
    // Reusing logic from BookingCard, can be centralized if needed
    switch (statusKey) {
      case "pending_professional_assignment":
        return {
          label: t("memberBookings.status.pending_professional_assignment"),
          icon: <Hourglass className="mr-1.5 h-4 w-4 text-amber-600" />,
          badgeClass: "bg-amber-100 text-amber-700 border-amber-300",
          textColor: "text-amber-700",
        }
      case "confirmed":
        return {
          label: t("memberBookings.status.confirmed"),
          icon: <CheckCircle className="mr-1.5 h-4 w-4 text-green-600" />,
          badgeClass: "bg-green-100 text-green-700 border-green-300",
          textColor: "text-green-700",
        }
      case "completed":
        return {
          label: t("memberBookings.status.completed"),
          icon: <CheckCircle className="mr-1.5 h-4 w-4 text-sky-600" />,
          badgeClass: "bg-sky-100 text-sky-700 border-sky-300",
          textColor: "text-sky-700",
        }
      case "cancelled_by_user":
      case "cancelled_by_admin":
        return {
          label: t(`memberBookings.status.${statusKey}`),
          icon: <XCircle className="mr-1.5 h-4 w-4 text-red-600" />,
          badgeClass: "bg-red-100 text-red-700 border-red-300",
          textColor: "text-red-700",
        }
      case "no_show":
        return {
          label: t("memberBookings.status.no_show"),
          icon: <User className="mr-1.5 h-4 w-4 text-orange-600" />,
          badgeClass: "bg-orange-100 text-orange-700 border-orange-300",
          textColor: "text-orange-700",
        }
      default:
        return {
          label: t(`memberBookings.status.${statusKey}`) || statusKey,
          icon: <Info className="mr-1.5 h-4 w-4 text-gray-600" />,
          badgeClass: "bg-gray-100 text-gray-700 border-gray-300",
          textColor: "text-gray-700",
        }
    }
  }
  const statusInfo = getBookingStatusInfo(status)

  const getPaymentStatusText = (statusKey: string) => {
    const key = `bookings.confirmation.paymentStatus.${statusKey.toLowerCase()}`
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
  }, [source, t])

  const redeemedSubscriptionName = useMemo(() => {
    if (priceDetails.redeemedUserSubscriptionId && typeof priceDetails.redeemedUserSubscriptionId === "object") {
      const sub = priceDetails.redeemedUserSubscriptionId
      // @ts-ignore // Assuming subscriptionId might be populated with name
      return sub.subscriptionId?.name || t("bookings.unknownSubscription")
    }
    return null
  }, [priceDetails.redeemedUserSubscriptionId, t])

  const redeemedGiftVoucherInfo = useMemo(() => {
    if (priceDetails.appliedGiftVoucherId && typeof priceDetails.appliedGiftVoucherId === "object") {
      const voucher = priceDetails.appliedGiftVoucherId
      return voucher.voucherType === "treatment"
        ? `${voucher.code} (${voucher.treatmentName || selectedTreatmentName}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""})`
        : `${voucher.code} (${t("bookings.monetaryVoucher")} - ${t("bookings.balance")}: ${voucher.remainingAmount?.toFixed(2)} ${t("common.currency")})`
    }
    return null
  }, [priceDetails.appliedGiftVoucherId, selectedTreatmentName, t])

  const professionalName = professionalId?.name || t("bookings.confirmation.professionalToBeAssigned")

  const renderDetailItem = (labelKey: string, value?: string | number | null, icon?: React.ReactNode) =>
    value || value === 0 ? (
      <div className="flex items-start py-1">
        {icon && <span className="mr-2 mt-1 flex-shrink-0 text-muted-foreground">{icon}</span>}
        <p className="text-sm">
          <span className="text-muted-foreground">{t(labelKey)}:</span>{" "}
          <span className="font-medium text-foreground">{value}</span>
        </p>
      </div>
    ) : null

  const getAddressIcon = (addressType?: string) => {
    switch (addressType) {
      case "apartment":
        return <Building className="h-5 w-5" />
      case "house":
      case "private":
        return <Home className="h-5 w-5" />
      case "office":
        return <Briefcase className="h-5 w-5" />
      case "hotel":
        return <Hotel className="h-5 w-5" />
      default:
        return <MapPin className="h-5 w-5" />
    }
  }

  const paymentMethodDisplayName = useMemo(() => {
    if (priceDetails.finalAmount === 0) return t("common.notApplicable")
    if (paymentDetails.paymentMethodId && typeof paymentDetails.paymentMethodId === "object") {
      // @ts-ignore
      return paymentDetails.paymentMethodId.displayName || t("common.unknown")
    }
    return t("common.unknown")
  }, [paymentDetails.paymentMethodId, priceDetails.finalAmount, t])

  return (
    <div className="space-y-4 p-4 pb-6 bg-background text-foreground">
      {/* Booking Info Header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-primary">
          {t("bookingDetails.drawerTitle")} #{bookingNumber}
        </h2>
        <Badge variant="outline" className={cn("mt-1 text-xs font-medium", statusInfo.badgeClass)}>
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
      </div>

      {/* Booking For Section */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-md flex items-center text-primary">
            <User className="mr-2 h-5 w-5" />
            {t("bookings.confirmation.bookedFor")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-1">
          {recipientName ? (
            <>
              {renderDetailItem("bookings.confirmation.recipientName", recipientName)}
              {recipientPhone &&
                renderDetailItem("bookings.confirmation.recipientPhone", recipientPhone, <Phone className="h-4 w-4" />)}
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground pt-1">{t("bookings.confirmation.bookedBy")}:</p>
              {renderDetailItem("", bookedByUserName, <User className="h-4 w-4" />)}
            </>
          ) : (
            <>
              {renderDetailItem("", bookedByUserName, <User className="h-4 w-4" />)}
              {bookedByUserEmail && renderDetailItem("", bookedByUserEmail, <Mail className="h-4 w-4" />)}
              {bookedByUserPhone && renderDetailItem("", bookedByUserPhone, <Phone className="h-4 w-4" />)}
            </>
          )}
        </CardContent>
      </Card>

      {/* Treatment Details Section */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-md flex items-center text-primary">
            <ListChecks className="mr-2 h-5 w-5" />
            {t("bookings.confirmation.treatmentDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">{t("bookings.confirmation.treatment")}:</span>
            <div className="text-sm font-semibold text-right">
              <span>
                {selectedTreatmentName}
                {selectedDuration
                  ? ` (${selectedDuration.minutes} ${t("common.minutes")})`
                  : selectedTreatmentPricingType === "fixed" && populatedTreatment?.defaultDurationMinutes
                    ? ` (${populatedTreatment.defaultDurationMinutes} ${t("common.minutes")})`
                    : ""}
              </span>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("bookings.confirmation.dateTime")}:</span>
            <span className="text-sm font-semibold text-right">
              {bookingDateTime ? format(new Date(bookingDateTime), "PPP HH:mm", { locale }) : t("common.notAvailable")}
            </span>
          </div>
          {isFlexibleTime && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t("bookings.steps.summary.flexibleTime")}:</span>
                <span className="text-sm font-semibold text-primary text-right">
                  {t("bookings.confirmation.flexibleTimeInfo", { hours: flexibilityRangeHours || 2 })}
                </span>
              </div>
            </>
          )}
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("bookings.confirmation.therapistPreference")}:</span>
            <span className="text-sm font-semibold text-right">
              {getGenderPreferenceText(therapistGenderPreference)}
            </span>
          </div>
          {notes && (
            <>
              <Separator />
              <div className="space-y-1 pt-1">
                <span className="text-sm text-muted-foreground">{t("bookings.confirmation.notes")}:</span>
                <p className="text-sm font-medium bg-muted/50 p-2 rounded-md whitespace-pre-wrap">{notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Professional Details Section */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-md flex items-center text-primary">
            <User className="mr-2 h-5 w-5" />
            {t("bookings.confirmation.professionalDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {renderDetailItem(t("bookings.confirmation.professionalName"), professionalName)}
        </CardContent>
      </Card>

      {/* Address Details Section */}
      {bookingAddressSnapshot && (
        <Card className="shadow-md">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-md flex items-center text-primary">
              {getAddressIcon(
                (bookingAddressSnapshot as IBookingAddressSnapshot & { addressType?: string }).addressType,
              )}
              <span className="ml-2">{t("bookings.confirmation.addressDetails")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-0.5">
            <p className="text-sm font-semibold">{bookingAddressSnapshot.fullAddress || t("common.notAvailable")}</p>
            {renderDetailItem("addresses.fields.city", bookingAddressSnapshot.city)}
            {renderDetailItem("addresses.fields.street", bookingAddressSnapshot.street)}
            {renderDetailItem("addresses.fields.streetNumber", bookingAddressSnapshot.streetNumber)}
            {renderDetailItem("addresses.fields.apartment", bookingAddressSnapshot.apartment)}
            {renderDetailItem("addresses.fields.entrance", bookingAddressSnapshot.entrance)}
            {renderDetailItem("addresses.fields.floor", bookingAddressSnapshot.floor)}
            {bookingAddressSnapshot.doorName &&
              renderDetailItem("addresses.fields.doorName", bookingAddressSnapshot.doorName)}
            {bookingAddressSnapshot.buildingName &&
              renderDetailItem("addresses.fields.buildingName", bookingAddressSnapshot.buildingName)}
            {bookingAddressSnapshot.hotelName &&
              renderDetailItem("addresses.fields.hotelName", bookingAddressSnapshot.hotelName)}
            {bookingAddressSnapshot.roomNumber &&
              renderDetailItem("addresses.fields.roomNumber", bookingAddressSnapshot.roomNumber)}
            {bookingAddressSnapshot.otherInstructions &&
              renderDetailItem("addresses.fields.otherInstructions", bookingAddressSnapshot.otherInstructions)}
            {bookingAddressSnapshot.notes && (
              <>
                <Separator className="my-2" />
                <p className="text-xs">
                  <span className="text-muted-foreground">{t("bookings.confirmation.addressNotes")}:</span>{" "}
                  {bookingAddressSnapshot.notes}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Source & Price Summary Section */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-md flex items-center text-primary">
            <CreditCard className="mr-2 h-5 w-5" />
            {t("bookings.confirmation.priceSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bookings.confirmation.bookingSource")}:</span>
            <span className="font-semibold">{bookingSourceText}</span>
          </div>
          {redeemedSubscriptionName && (
            <div className="flex justify-between items-center text-green-600 dark:text-green-400">
              <span className="flex items-center">
                <Ticket className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.usedSubscription")}:
              </span>
              <span className="font-medium">{redeemedSubscriptionName}</span>
            </div>
          )}
          {redeemedGiftVoucherInfo && (
            <div className="flex justify-between items-center text-green-600 dark:text-green-400">
              <span className="flex items-center">
                <GiftIcon className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.usedGiftVoucher")}:
              </span>
              <span className="font-medium">{redeemedGiftVoucherInfo}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span>{t("bookings.confirmation.basePrice")}:</span>
            <span>{formatCurrency(priceDetails.basePrice, t("common.currency"), locale)}</span>
          </div>
          {priceDetails.isBaseTreatmentCoveredBySubscription && (
            <div className="flex justify-between items-center font-medium text-green-600 dark:text-green-400">
              <span className="flex items-center">
                <Ticket className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.treatmentCoveredBySubscription")}
              </span>
              <span className="line-through text-muted-foreground">
                (-{formatCurrency(priceDetails.basePrice, t("common.currency"), locale)})
              </span>
            </div>
          )}
          {priceDetails.isBaseTreatmentCoveredByTreatmentVoucher &&
            !priceDetails.isBaseTreatmentCoveredBySubscription && (
              <div className="flex justify-between items-center font-medium text-green-600 dark:text-green-400">
                <span className="flex items-center">
                  <GiftIcon className="mr-2 h-4 w-4" />
                  {t("bookings.confirmation.treatmentCoveredByVoucher")}
                </span>
                <span className="line-through text-muted-foreground">
                  (-{formatCurrency(priceDetails.basePrice, t("common.currency"), locale)})
                </span>
              </div>
            )}
          {priceDetails.surcharges?.map((surcharge, index) => (
            <div key={index} className="flex justify-between">
              <span>{t(surcharge.description) || surcharge.description}:</span>
              <span className="text-orange-600 dark:text-orange-400">
                + {formatCurrency(surcharge.amount, t("common.currency"), locale)}
              </span>
            </div>
          ))}
          {priceDetails.appliedGiftVoucherId &&
            priceDetails.voucherAppliedAmount > 0 &&
            !priceDetails.isBaseTreatmentCoveredByTreatmentVoucher && (
              <div className="flex justify-between items-center font-medium text-green-600 dark:text-green-400">
                <span className="flex items-center">
                  <GiftIcon className="mr-2 h-4 w-4" />
                  {t("bookings.confirmation.monetaryVoucherApplied")}
                </span>
                <span>- {formatCurrency(priceDetails.voucherAppliedAmount, t("common.currency"), locale)}</span>
              </div>
            )}
          {priceDetails.discountAmount > 0 && (
            <div className="flex justify-between items-center font-medium text-green-600 dark:text-green-400">
              <span className="flex items-center">
                <Tag className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.couponDiscount")}:
              </span>
              <span>- {formatCurrency(priceDetails.discountAmount, t("common.currency"), locale)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>{t("bookings.confirmation.totalAmount")}:</span>
            <span className="text-primary">
              {priceDetails.isFullyCoveredByVoucherOrSubscription
                ? t("bookings.confirmation.gift")
                : formatCurrency(priceDetails.finalAmount, t("common.currency"), locale)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Section */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-md flex items-center text-primary">
            <CreditCard className="mr-2 h-5 w-5" />
            {t("bookings.confirmation.paymentDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bookings.confirmation.paymentStatus")}:</span>
            <span className="font-semibold">{getPaymentStatusText(paymentDetails.paymentStatus)}</span>
          </div>
          {paymentDetails.paymentMethodId && priceDetails.finalAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("bookings.confirmation.paymentMethod")}:</span>
              <span className="font-semibold">{paymentMethodDisplayName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voucher Usage History if applicable and populated */}
      {priceDetails.appliedGiftVoucherId &&
        typeof priceDetails.appliedGiftVoucherId === "object" &&
        priceDetails.appliedGiftVoucherId.usageHistory &&
        priceDetails.appliedGiftVoucherId.usageHistory.length > 0 && (
          <Card className="shadow-md">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-md flex items-center text-primary">
                <Info className="mr-2 h-5 w-5" />
                {t("bookings.confirmation.voucherUsageTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm space-y-2">
              <p>{t("bookings.confirmation.voucherCodeUsed", { code: priceDetails.appliedGiftVoucherId.code })}</p>
              <p>
                {t("bookings.confirmation.voucherRemainingBalance", {
                  balance: priceDetails.appliedGiftVoucherId.remainingAmount?.toFixed(2) || "0.00",
                  currency: t("common.currency"),
                })}
              </p>
              {priceDetails.appliedGiftVoucherId.usageHistory.map((entry: IGiftVoucherUsageHistory, index: number) => (
                <div key={index} className="text-xs text-muted-foreground">
                  <span>{format(new Date(entry.date), "PPP HH:mm", { locale })}: </span>
                  <span>
                    {t(entry.description) || entry.description} - {entry.amountUsed.toFixed(2)} {t("common.currency")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
    </div>
  )
}
