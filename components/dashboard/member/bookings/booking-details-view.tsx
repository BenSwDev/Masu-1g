"use client"

import type React from "react"
import { useMemo } from "react"
import { format, type Locale } from "date-fns"
import { enUS, he, ru } from "date-fns/locale"
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
  UserCheck,
  UserX,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Badge } from "@/components/common/ui/badge"
import { useTranslation } from "@/lib/translations/i18n"
import type { PopulatedBooking, ITreatmentDuration, IGiftVoucherUsageHistory } from "@/types/booking"
import type { IBookingAddressSnapshot } from "@/lib/db/models/booking"
import { cn, formatCurrency } from "@/lib/utils/utils"
import type { IAddress } from "@/types/address"

interface BookingDetailsViewProps {
  booking: PopulatedBooking
}

export default function BookingDetailsView({ booking }: BookingDetailsViewProps) {
  const { t, language } = useTranslation()

  const {
    bookingNumber,
    status,
    recipientName,
    recipientPhone,
    bookedByUserName,
    bookedByUserEmail,
    bookedByUserPhone,
    treatmentId: populatedTreatment,
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
        (d: ITreatmentDuration) => d._id?.toString() === selectedDurationId.toString(),
      )
    }
    return null
  }, [populatedTreatment, selectedDurationId])

  const getBookingStatusInfo = (statusKey: PopulatedBooking["status"]) => {
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
      // Add professional_en_route case
      case "professional_en_route":
        return {
          label: t("memberBookings.status.professional_en_route"),
          icon: <UserCheck className="mr-1.5 h-4 w-4 text-blue-600" />,
          badgeClass: "bg-blue-100 text-blue-700 border-blue-300",
          textColor: "text-blue-700",
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
          icon: <UserX className="mr-1.5 h-4 w-4 text-orange-600" />, // Changed icon to UserX
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
    return t(key, statusKey) // Provide fallback
  }

  const getGenderPreferenceText = (preferenceKey?: string) => {
    if (!preferenceKey) return t("preferences.treatment.genderAny")
    const key = `preferences.treatment.gender${preferenceKey.charAt(0).toUpperCase()}${preferenceKey.slice(1)}`
    return t(key, preferenceKey) // Provide fallback
  }

  const bookingSourceText = useMemo(() => {
    if (source === "subscription_redemption") return t("bookings.confirmation.sourceSubscription")
    if (source === "gift_voucher_redemption") return t("bookings.confirmation.sourceGiftVoucher")
    return t("bookings.confirmation.sourceNewPurchase")
  }, [source, t])

  const redeemedSubscriptionName = useMemo(() => {
    if (priceDetails.redeemedUserSubscriptionId?.subscriptionId) {
      return priceDetails.redeemedUserSubscriptionId.subscriptionId.name || t("bookings.unknownSubscription")
    }
    return null
  }, [priceDetails.redeemedUserSubscriptionId, t])

  const redeemedGiftVoucherInfo = useMemo(() => {
    if (priceDetails.appliedGiftVoucherId) {
      const voucher = priceDetails.appliedGiftVoucherId
      // Ensure populatedTreatment is available for treatment voucher details
      const treatmentForVoucher = voucher.voucherType === "treatment" ? populatedTreatment : null

      const treatmentNameForVoucher =
        voucher.treatmentName || (treatmentForVoucher ? treatmentForVoucher.name : selectedTreatmentName)

      let durationNameForVoucher = voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""
      if (
        !durationNameForVoucher &&
        voucher.voucherType === "treatment" &&
        treatmentForVoucher?.pricingType === "duration_based" &&
        voucher.selectedDurationId &&
        treatmentForVoucher.durations
      ) {
        const durationDetail = treatmentForVoucher.durations.find(
          (d) => d._id?.toString() === voucher.selectedDurationId?.toString(),
        )
        if (durationDetail) {
          durationNameForVoucher = ` - ${durationDetail.minutes} ${t("common.minutes_short", "min")}`
        }
      }

      return voucher.voucherType === "treatment"
        ? `${voucher.code} (${treatmentNameForVoucher}${durationNameForVoucher})`
        : `${voucher.code} (${t("bookings.monetaryVoucher")} - ${t("bookings.balance")}: ${voucher.remainingAmount?.toFixed(2)} ${t("common.currency")})`
    }
    return null
  }, [priceDetails.appliedGiftVoucherId, selectedTreatmentName, populatedTreatment, t])

  const professionalName = professionalId?.name || t("bookings.confirmation.professionalToBeAssigned")

  const renderDetailItem = (
    labelKey: string,
    value?: string | number | null,
    icon?: React.ReactNode,
    valueClassName?: string,
  ) =>
    value || value === 0 ? (
      <div className="flex items-start py-1">
        {icon && <span className="mr-2 mt-1 flex-shrink-0 text-muted-foreground">{icon}</span>}
        <p className="text-sm">
          <span className="text-muted-foreground">{labelKey.includes(".") ? t(labelKey) : labelKey}:</span>{" "}
          <span className={cn("font-medium text-foreground", valueClassName)}>{value}</span>
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
    if (priceDetails.isFullyCoveredByVoucherOrSubscription || priceDetails.finalAmount === 0)
      return t("common.notApplicable")
    if (paymentDetails.paymentMethodId) {
      return (
        paymentDetails.paymentMethodId.displayName ||
        (paymentDetails.paymentMethodId.type && paymentDetails.paymentMethodId.last4
          ? `${t(`paymentMethods.type.${paymentDetails.paymentMethodId.type}`, paymentDetails.paymentMethodId.type)} **** ${paymentDetails.paymentMethodId.last4}`
          : t("common.unknown"))
      )
    }
    return t("common.notSpecified")
  }, [paymentDetails.paymentMethodId, priceDetails.finalAmount, priceDetails.isFullyCoveredByVoucherOrSubscription, t])

  const dateFnsLocaleMap: Record<string, Locale> = {
    en: enUS,
    he: he,
    ru: ru,
  }
  const currentDateFnsLocale = dateFnsLocaleMap[language] || he // Fallback to 'he'

  // Address details from bookingAddressSnapshot
  const addressDisplay = bookingAddressSnapshot || booking.addressId // Use snapshot first, then fallback to populated addressId if snapshot is missing

  return (
    <div className="space-y-4 bg-background text-foreground">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-primary">
          {t("bookingDetails.drawerTitle")} #{bookingNumber}
        </h2>
        <Badge variant="outline" className={cn("mt-1 text-sm font-medium", statusInfo.badgeClass)}>
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
      </div>

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
              {renderDetailItem(t("bookings.confirmation.recipientName"), recipientName)}
              {recipientPhone &&
                renderDetailItem(
                  t("bookings.confirmation.recipientPhone"),
                  recipientPhone,
                  <Phone className="h-4 w-4" />,
                )}
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground pt-1">{t("bookings.confirmation.bookedBy")}:</p>
              {renderDetailItem(bookedByUserName || "", "", <User className="h-4 w-4" />)}
            </>
          ) : (
            <>
              {renderDetailItem(bookedByUserName || "", "", <User className="h-4 w-4" />)}
              {bookedByUserEmail && renderDetailItem(bookedByUserEmail, "", <Mail className="h-4 w-4" />)}
              {bookedByUserPhone && renderDetailItem(bookedByUserPhone, "", <Phone className="h-4 w-4" />)}
            </>
          )}
        </CardContent>
      </Card>

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
              {bookingDateTime
                ? format(new Date(bookingDateTime), "PPPp", { locale: currentDateFnsLocale }) // Using PPPp for date and time
                : t("common.notAvailable")}
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

      <Card className="shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-md flex items-center text-primary">
            <User className="mr-2 h-5 w-5" /> {/* Icon for professional */}
            {t("bookings.confirmation.professionalDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {renderDetailItem(t("bookings.confirmation.professionalName"), professionalName)}
        </CardContent>
      </Card>

      {addressDisplay && (
        <Card className="shadow-md">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-md flex items-center text-primary">
              {getAddressIcon((addressDisplay as IBookingAddressSnapshot & { addressType?: string }).addressType)}
              <span className="ml-2">{t("bookings.confirmation.addressDetails")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-0.5">
            <p className="text-sm font-semibold">{addressDisplay.fullAddress || t("common.notAvailable")}</p>
            {renderDetailItem(t("addresses.fields.city"), addressDisplay.city)}
            {renderDetailItem(t("addresses.fields.street"), addressDisplay.street)}
            {renderDetailItem(t("addresses.fields.streetNumber"), addressDisplay.streetNumber)}
            {renderDetailItem(
              t("addresses.fields.apartment"),
              (addressDisplay as IBookingAddressSnapshot).apartment ||
                (addressDisplay as IAddress).apartmentDetails?.apartmentNumber,
            )}
            {renderDetailItem(
              t("addresses.fields.entrance"),
              (addressDisplay as IBookingAddressSnapshot).entrance /* Add more specific fallbacks if needed */,
            )}
            {renderDetailItem(
              t("addresses.fields.floor"),
              (addressDisplay as IBookingAddressSnapshot).floor /* Add more specific fallbacks if needed */,
            )}

            {/* Displaying new address fields from IBookingAddressSnapshot if they exist */}
            {(addressDisplay as IBookingAddressSnapshot & IAddress).doorName &&
              renderDetailItem(
                t("addresses.fields.doorName"),
                (addressDisplay as IBookingAddressSnapshot & IAddress).doorName,
              )}
            {(addressDisplay as IBookingAddressSnapshot & IAddress).buildingName &&
              renderDetailItem(
                t("addresses.fields.buildingName"),
                (addressDisplay as IBookingAddressSnapshot & IAddress).buildingName,
              )}
            {(addressDisplay as IBookingAddressSnapshot & IAddress).hotelName &&
              renderDetailItem(
                t("addresses.fields.hotelName"),
                (addressDisplay as IBookingAddressSnapshot & IAddress).hotelName,
              )}
            {(addressDisplay as IBookingAddressSnapshot & IAddress).roomNumber &&
              renderDetailItem(
                t("addresses.fields.roomNumber"),
                (addressDisplay as IBookingAddressSnapshot & IAddress).roomNumber,
              )}
            {(addressDisplay as IBookingAddressSnapshot & IAddress).otherInstructions &&
              renderDetailItem(
                t("addresses.fields.otherInstructions"),
                (addressDisplay as IBookingAddressSnapshot & IAddress).otherInstructions,
              )}

            {addressDisplay.notes && ( // This notes is from IBookingAddressSnapshot
              <>
                <Separator className="my-2" />
                <p className="text-xs">
                  <span className="text-muted-foreground">{t("bookings.confirmation.addressNotes")}:</span>{" "}
                  {addressDisplay.notes}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

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
              <span className="font-medium text-right">{redeemedGiftVoucherInfo}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span>{t("bookings.confirmation.basePrice")}:</span>
            <span>{formatCurrency(priceDetails.basePrice, t("common.currency"), language)}</span>
          </div>
          {priceDetails.isBaseTreatmentCoveredBySubscription && (
            <div className="flex justify-between items-center font-medium text-green-600 dark:text-green-400">
              <span className="flex items-center">
                <Ticket className="mr-2 h-4 w-4" />
                {t("bookings.confirmation.treatmentCoveredBySubscription")}
              </span>
              <span className="line-through text-muted-foreground">
                (-{formatCurrency(priceDetails.basePrice, t("common.currency"), language)})
              </span>
            </div>
          )}
          {priceDetails.isBaseTreatmentCoveredByTreatmentVoucher &&
            !priceDetails.isBaseTreatmentCoveredBySubscription && ( // Only show if not already covered by sub
              <div className="flex justify-between items-center font-medium text-green-600 dark:text-green-400">
                <span className="flex items-center">
                  <GiftIcon className="mr-2 h-4 w-4" />
                  {t("bookings.confirmation.treatmentCoveredByVoucher")}
                </span>
                <span className="line-through text-muted-foreground">
                  (-{formatCurrency(priceDetails.basePrice, t("common.currency"), language)})
                </span>
              </div>
            )}
          {priceDetails.surcharges?.map((surcharge, index) => (
            <div key={index} className="flex justify-between">
              <span>{t(surcharge.description, surcharge.description)}:</span>
              <span className="text-orange-600 dark:text-orange-400">
                + {formatCurrency(surcharge.amount, t("common.currency"), language)}
              </span>
            </div>
          ))}
          {priceDetails.appliedGiftVoucherId &&
            priceDetails.appliedGiftVoucherId.voucherType === "monetary" &&
            priceDetails.voucherAppliedAmount > 0 &&
            !priceDetails.isBaseTreatmentCoveredByTreatmentVoucher && ( // Ensure not double counting if treatment voucher was monetary and covered base
              <div className="flex justify-between items-center font-medium text-green-600 dark:text-green-400">
                <span className="flex items-center">
                  <GiftIcon className="mr-2 h-4 w-4" />
                  {t("bookings.confirmation.monetaryVoucherApplied")}
                </span>
                <span>- {formatCurrency(priceDetails.voucherAppliedAmount, t("common.currency"), language)}</span>
              </div>
            )}
          {priceDetails.discountAmount > 0 && priceDetails.appliedCouponId && (
            <div className="flex justify-between items-center font-medium text-green-600 dark:text-green-400">
              <span className="flex items-center">
                <Tag className="mr-2 h-4 w-4" />
                {priceDetails.appliedCouponId.code
                  ? t("bookings.confirmation.couponDiscountWithCode", { code: priceDetails.appliedCouponId.code })
                  : t("bookings.confirmation.couponDiscount")}
                :
              </span>
              <span>- {formatCurrency(priceDetails.discountAmount, t("common.currency"), language)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>{t("bookings.confirmation.totalAmount")}:</span>
            <span className="text-primary">
              {priceDetails.isFullyCoveredByVoucherOrSubscription
                ? t("bookings.confirmation.gift")
                : formatCurrency(priceDetails.finalAmount, t("common.currency"), language)}
            </span>
          </div>
        </CardContent>
      </Card>

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
          {paymentDetails.paymentMethodId &&
            (priceDetails.finalAmount > 0 || !priceDetails.isFullyCoveredByVoucherOrSubscription) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.confirmation.paymentMethod")}:</span>
                <span className="font-semibold">{paymentMethodDisplayName}</span>
              </div>
            )}
          {paymentDetails.transactionId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("bookings.confirmation.transactionId")}:</span>
              <span className="font-semibold truncate max-w-[150px] text-right">{paymentDetails.transactionId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {priceDetails.appliedGiftVoucherId &&
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
                  <span>{format(new Date(entry.date), "PPPp", { locale: currentDateFnsLocale })}: </span>
                  <span>
                    {t(entry.description, entry.description)} - {entry.amountUsed.toFixed(2)} {t("common.currency")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
    </div>
  )
}
