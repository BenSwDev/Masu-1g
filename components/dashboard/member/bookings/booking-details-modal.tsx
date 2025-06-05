"use client"

import type React from "react"

import type { PopulatedBooking } from "@/types/booking"
import { useTranslation } from "@/lib/translations/i18n"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { cn, formatCurrency, formatDate } from "@/lib/utils/utils"
import { format, parseISO } from "date-fns"
import {
  CalendarDays,
  Clock,
  MapPin,
  UserCircle,
  CreditCard,
  Tag,
  Sparkles,
  Info,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hourglass,
  Users,
  Edit3,
} from "lucide-react"
import { cancelBooking } from "@/actions/booking-actions"
import { useToast } from "@/components/common/ui/use-toast"
import { useState } from "react"
import { AlertModal } from "@/components/common/modals/alert-modal"

interface BookingDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  booking: PopulatedBooking | null
}

export default function BookingDetailsModal({ isOpen, onClose, booking }: BookingDetailsModalProps) {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false)

  if (!booking) return null

  const getStatusInfo = (
    status: PopulatedBooking["status"],
  ): { labelKey: string; colorClass: string; icon: React.ElementType } => {
    switch (status) {
      case "pending_professional_assignment":
        return {
          labelKey: "memberBookings.status.pending_professional_assignment",
          colorClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300",
          icon: Hourglass,
        }
      case "confirmed":
        return {
          labelKey: "memberBookings.status.confirmed",
          colorClass: "bg-sky-100 text-sky-800 dark:bg-sky-800/30 dark:text-sky-300",
          icon: CheckCircle2,
        }
      case "completed":
        return {
          labelKey: "memberBookings.status.completed",
          colorClass: "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300",
          icon: CheckCircle2,
        }
      case "cancelled_by_user":
        return {
          labelKey: "memberBookings.status.cancelled_by_user",
          colorClass: "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300",
          icon: XCircle,
        }
      case "cancelled_by_admin":
        return {
          labelKey: "memberBookings.status.cancelled_by_admin",
          colorClass: "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300",
          icon: XCircle,
        }
      case "no_show":
        return {
          labelKey: "memberBookings.status.no_show",
          colorClass: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
          icon: AlertCircle,
        }
      default:
        return { labelKey: "common.unknown", colorClass: "bg-gray-100 text-gray-800", icon: Info }
    }
  }
  const statusInfo = getStatusInfo(booking.status)
  const StatusIcon = statusInfo.icon

  const bookingDate = parseISO(booking.bookingDateTime)
  const formattedDate = formatDate(bookingDate)
  const formattedTime = format(bookingDate, "HH:mm")

  const treatmentName = booking.treatmentId?.name || t("common.unknown")
  const durationMinutes = booking.selectedDuration?.minutes

  const addressLine = booking.addressId
    ? `${booking.addressId.street || ""} ${booking.addressId.streetNumber || ""}, ${booking.addressId.city || ""}`
        .trim()
        .replace(/^,|,$/, "")
    : booking.customAddressDetails
      ? `${booking.customAddressDetails.street || ""} ${booking.customAddressDetails.streetNumber || ""}, ${booking.customAddressDetails.city || ""}`
          .trim()
          .replace(/^,|,$/, "")
      : t("memberBookings.addressNotSet")

  const addressInstructions = booking.addressId?.instructions || booking.customAddressDetails?.notes

  const canCancel = booking.status === "pending_professional_assignment" || booking.status === "confirmed"
  // Add logic for time-based cancellation policy if needed

  const handleCancelBooking = async () => {
    if (!booking.userId?._id) {
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" })
      return
    }
    setIsCancelling(true)
    const result = await cancelBooking(
      booking._id,
      booking.userId._id,
      "user",
      "Cancelled by user from My Bookings page",
    )
    if (result.success) {
      toast({ title: t("common.success"), description: t("memberBookings.cancelSuccess"), variant: "default" })
      onClose() // Close modal
      // TODO: Trigger a refresh of the bookings list on the parent page
      // This might involve passing a callback or using a global state/event
      // For now, router.refresh() might work if the page is dynamic
      // router.refresh(); // This might be too broad, ideally re-fetch specific data
    } else {
      toast({
        title: t("common.error"),
        description: t(result.error || "memberBookings.cancelError"),
        variant: "destructive",
      })
    }
    setIsCancelling(false)
    setIsCancelAlertOpen(false)
  }

  const DetailItem = ({
    icon: Icon,
    labelKey,
    value,
    valueClassName,
    children,
  }: {
    icon: React.ElementType
    labelKey: string
    value?: string | number | null
    valueClassName?: string
    children?: React.ReactNode
  }) => (
    <div className="flex items-start py-2">
      <Icon className="h-5 w-5 text-turquoise-600 dark:text-turquoise-500 me-3 rtl:ms-3 rtl:me-0 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t(labelKey)}</p>
        {value && <p className={cn("text-sm text-gray-800 dark:text-gray-100 font-medium", valueClassName)}>{value}</p>}
        {children}
      </div>
    </div>
  )

  const priceDetails = booking.priceDetails

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg p-0">
          <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-50">
              {t("memberBookings.detailsModal.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              {t("memberBookings.detailsModal.bookingId")}: {booking._id}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(100vh-200px)]">
            <div className="p-6 space-y-4">
              <Badge
                variant="outline"
                className={cn("text-sm px-3 py-1.5 w-full justify-center", statusInfo.colorClass)}
              >
                <StatusIcon className="h-4 w-4 me-2 rtl:ms-2 rtl:me-0" />
                {t(statusInfo.labelKey)}
              </Badge>

              <section>
                <h3 className="text-md font-semibold text-turquoise-700 dark:text-turquoise-400 mb-2">
                  {t("memberBookings.detailsModal.treatmentInfo")}
                </h3>
                <DetailItem icon={Edit3} labelKey="memberBookings.treatment" value={treatmentName} />
                {durationMinutes && (
                  <DetailItem
                    icon={Clock}
                    labelKey="memberBookings.duration"
                    value={`${durationMinutes} ${t("common.minutes")}`}
                  />
                )}
              </section>
              <Separator className="dark:bg-gray-700" />
              <section>
                <h3 className="text-md font-semibold text-turquoise-700 dark:text-turquoise-400 mb-2">
                  {t("memberBookings.detailsModal.scheduleInfo")}
                </h3>
                <DetailItem icon={CalendarDays} labelKey="memberBookings.date" value={formattedDate} />
                <DetailItem
                  icon={Clock}
                  labelKey="memberBookings.time"
                  value={`${formattedTime} ${booking.isFlexibleTime ? `(${t("memberBookings.flexibleTime")})` : ""}`}
                />
                <DetailItem icon={MapPin} labelKey="memberBookings.address" value={addressLine} />
                {addressInstructions && (
                  <DetailItem icon={Info} labelKey="memberBookings.addressInstructions" value={addressInstructions} />
                )}
                {booking.professionalId?.name && (
                  <DetailItem
                    icon={UserCircle}
                    labelKey="memberBookings.professional"
                    value={booking.professionalId.name}
                  />
                )}
                {booking.therapistGenderPreference !== "any" && (
                  <DetailItem
                    icon={Users}
                    labelKey="memberBookings.therapistPreference"
                    value={t(`gender.${booking.therapistGenderPreference}`)}
                  />
                )}
              </section>
              <Separator className="dark:bg-gray-700" />
              <section>
                <h3 className="text-md font-semibold text-turquoise-700 dark:text-turquoise-400 mb-2">
                  {t("memberBookings.detailsModal.priceInfo")}
                </h3>
                <DetailItem
                  icon={CreditCard}
                  labelKey="memberBookings.basePrice"
                  value={formatCurrency(priceDetails.basePrice, t("common.currency"), language)}
                />
                {priceDetails.surcharges.map((surcharge, index) => (
                  <DetailItem
                    key={index}
                    icon={Info}
                    labelKey={
                      surcharge.description.startsWith("bookings.surcharges.")
                        ? t(surcharge.description)
                        : surcharge.description
                    }
                    value={`+ ${formatCurrency(surcharge.amount, t("common.currency"), language)}`}
                  />
                ))}
                {priceDetails.isBaseTreatmentCoveredBySubscription && (
                  <DetailItem
                    icon={Tag}
                    labelKey="memberBookings.coveredBySubscriptionFull"
                    valueClassName="text-green-600 dark:text-green-400"
                  >
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      -{formatCurrency(priceDetails.basePrice, t("common.currency"), language)}
                    </p>
                  </DetailItem>
                )}
                {priceDetails.isBaseTreatmentCoveredByTreatmentVoucher && (
                  <DetailItem
                    icon={Sparkles}
                    labelKey="memberBookings.coveredByTreatmentVoucherFull"
                    valueClassName="text-purple-600 dark:text-purple-400"
                  >
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      -{formatCurrency(priceDetails.basePrice, t("common.currency"), language)}
                    </p>
                  </DetailItem>
                )}
                {priceDetails.voucherAppliedAmount > 0 &&
                  !priceDetails.isBaseTreatmentCoveredByTreatmentVoucher && ( // Show monetary voucher if not already shown as treatment voucher
                    <DetailItem
                      icon={Sparkles}
                      labelKey="memberBookings.voucherApplied"
                      valueClassName="text-purple-600 dark:text-purple-400"
                    >
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                        -{formatCurrency(priceDetails.voucherAppliedAmount, t("common.currency"), language)}
                      </p>
                    </DetailItem>
                  )}
                {priceDetails.discountAmount > 0 && (
                  <DetailItem
                    icon={Tag}
                    labelKey="memberBookings.couponDiscount"
                    valueClassName="text-orange-600 dark:text-orange-400"
                  >
                    <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                      -{formatCurrency(priceDetails.discountAmount, t("common.currency"), language)}
                    </p>
                  </DetailItem>
                )}
                <Separator className="my-2 dark:bg-gray-700" />
                <DetailItem
                  icon={CreditCard}
                  labelKey="memberBookings.finalAmount"
                  value={formatCurrency(priceDetails.finalAmount, t("common.currency"), language)}
                  valueClassName="text-lg font-bold text-gray-900 dark:text-gray-50"
                />
              </section>

              {booking.notes && (
                <>
                  <Separator className="dark:bg-gray-700" />
                  <section>
                    <h3 className="text-md font-semibold text-turquoise-700 dark:text-turquoise-400 mb-2">
                      {t("memberBookings.notes")}
                    </h3>
                    <DetailItem icon={MessageSquare} labelKey="" value={booking.notes} />
                  </section>
                </>
              )}

              {(booking.status === "cancelled_by_user" || booking.status === "cancelled_by_admin") &&
                booking.cancellationReason && (
                  <>
                    <Separator className="dark:bg-gray-700" />
                    <section>
                      <h3 className="text-md font-semibold text-red-600 dark:text-red-500 mb-2">
                        {t("memberBookings.cancellationReason")}
                      </h3>
                      <DetailItem icon={Info} labelKey="" value={booking.cancellationReason} />
                    </section>
                  </>
                )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-end gap-2">
            {canCancel && (
              <Button
                variant="destructive"
                onClick={() => setIsCancelAlertOpen(true)}
                disabled={isCancelling}
                className="w-full sm:w-auto"
              >
                {isCancelling ? t("common.cancelling") : t("memberBookings.cancelBooking")}
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertModal
        isOpen={isCancelAlertOpen}
        onClose={() => setIsCancelAlertOpen(false)}
        onConfirm={handleCancelBooking}
        loading={isCancelling}
        title={t("memberBookings.cancelConfirmTitle")}
        description={t("memberBookings.cancelConfirmMessage")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
      />
    </>
  )
}
