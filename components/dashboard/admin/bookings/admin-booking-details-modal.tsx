"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import type { AdminPopulatedBooking } from "@/types/booking"
import type { BookingStatus } from "@/lib/db/models/booking"
import type { IUser } from "@/lib/db/models/user"
import { updateBookingByAdmin, getAdminBookingById } from "@/actions/booking-actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { DatePicker } from "@/components/common/ui/date-picker" // Assuming you have a DatePicker component
import { format } from "date-fns"
import { toast } from "@/components/common/ui/use-toast"
import { Separator } from "@/components/common/ui/separator"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import {
  AlertCircle,
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  Edit3,
  Save,
  XCircle,
  Info,
  DollarSign,
  Tag,
  Users,
  StickyNote,
  MessageSquare,
} from "lucide-react"

interface AdminBookingDetailsModalProps {
  isOpen: boolean
  onClose: (refresh?: boolean) => void
  booking: AdminPopulatedBooking
  professionals: IUser[]
}

export default function AdminBookingDetailsModal({
  isOpen,
  onClose,
  booking: initialBooking,
  professionals,
}: AdminBookingDetailsModalProps) {
  const { t, language, dir } = useTranslation()
  const [booking, setBooking] = useState<AdminPopulatedBooking>(initialBooking)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    bookingDateTime: new Date(initialBooking.bookingDateTime),
    status: initialBooking.status,
    professionalId: initialBooking.professionalId?._id.toString() || "",
    notes: initialBooking.notes || "",
    adminNotes: initialBooking.adminNotes || "",
    cancellationReason: initialBooking.cancellationReason || "",
  })

  useEffect(() => {
    setBooking(initialBooking)
    setFormData({
      bookingDateTime: new Date(initialBooking.bookingDateTime),
      status: initialBooking.status,
      professionalId: initialBooking.professionalId?._id.toString() || "",
      notes: initialBooking.notes || "",
      adminNotes: initialBooking.adminNotes || "",
      cancellationReason: initialBooking.cancellationReason || "",
    })
  }, [initialBooking])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, bookingDateTime: date }))
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const payload: any = {
        bookingDateTime: formData.bookingDateTime,
        status: formData.status as BookingStatus,
        professionalId: formData.professionalId || null, // Send null if empty to unassign
        notes: formData.notes,
        adminNotes: formData.adminNotes,
      }
      if (formData.status.startsWith("cancelled_")) {
        payload.cancellationReason = formData.cancellationReason
      }

      const result = await updateBookingByAdmin(booking._id.toString(), payload)
      if (result.success && result.booking) {
        toast({
          title: t("common.success"),
          description: t("adminBookingsPage.modal.updateSuccess"),
        })
        // Fetch the updated booking to get all populated fields correctly
        const updatedBookingResult = await getAdminBookingById(booking._id.toString())
        if (updatedBookingResult.success && updatedBookingResult.booking) {
          setBooking(updatedBookingResult.booking) // Update local state with fully populated booking
        }
        setIsEditing(false)
        onClose(true) // Refresh list
      } else {
        throw new Error(result.error || "updateFailed")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknownError"
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t(`bookings.errors.${errorMessage}`, errorMessage),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const DetailItem = ({
    icon,
    label,
    value,
  }: { icon: React.ReactNode; label: string; value: string | React.ReactNode }) => (
    <div className="flex items-start space-x-3 rtl:space-x-reverse py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {typeof value === "string" ? <p className="text-sm">{value || t("common.notAvailable")}</p> : value}
      </div>
    </div>
  )

  const editableLocale = language === "he" ? require("date-fns/locale/he") : require("date-fns/locale/en-US")

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {t("adminBookingsPage.modal.title")} - {booking._id.toString()}
          </DialogTitle>
          <DialogDescription>{t("adminBookingsPage.modal.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(80vh-150px)] pr-6">
          {" "}
          {/* Adjust max-h as needed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
            {/* Column 1: Booking & Client Info */}
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" />
                {t("adminBookingsPage.modal.bookingInfo")}
              </h3>
              <DetailItem
                icon={<CalendarIcon size={16} />}
                label={t("adminBookingsPage.modal.bookingDateTime")}
                value={
                  isEditing ? (
                    <DatePicker date={formData.bookingDateTime} setDate={handleDateChange} />
                  ) : (
                    format(new Date(booking.bookingDateTime), "PPpp", { locale: editableLocale })
                  )
                }
              />

              <DetailItem
                icon={<AlertCircle size={16} />}
                label={t("adminBookingsPage.modal.status")}
                value={
                  isEditing ? (
                    <Select
                      name="status"
                      value={formData.status}
                      onValueChange={(value) => handleSelectChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "pending_professional_assignment",
                          "confirmed",
                          "professional_en_route",
                          "completed",
                          "cancelled_by_user",
                          "cancelled_by_admin",
                          "no_show",
                        ].map((s) => (
                          <SelectItem key={s} value={s || "pending_professional_assignment"}>
                            {t(`bookingStatuses.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={booking.status.startsWith("cancelled") ? "destructive" : "default"}>
                      {t(`bookingStatuses.${booking.status}`)}
                    </Badge>
                  )
                }
              />

              {(isEditing && formData.status.startsWith("cancelled_")) ||
              (!isEditing && booking.status.startsWith("cancelled_")) ? (
                <DetailItem
                  icon={<XCircle size={16} />}
                  label={t("adminBookingsPage.modal.cancellationReason")}
                  value={
                    isEditing ? (
                      <Input
                        name="cancellationReason"
                        value={formData.cancellationReason}
                        onChange={handleInputChange}
                      />
                    ) : (
                      booking.cancellationReason
                    )
                  }
                />
              ) : null}

              <Separator className="my-3" />
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <UserIcon className="mr-2 h-5 w-5 text-primary" />
                {t("adminBookingsPage.modal.clientInfo")}
              </h3>
              <DetailItem
                icon={<UserIcon size={16} />}
                label={t("adminBookingsPage.modal.clientName")}
                value={booking.userId?.name}
              />
              <DetailItem
                icon={<UserIcon size={16} />}
                label={t("adminBookingsPage.modal.clientEmail")}
                value={booking.userId?.email}
              />
              <DetailItem
                icon={<UserIcon size={16} />}
                label={t("adminBookingsPage.modal.clientPhone")}
                value={booking.userId?.phone}
              />

              <Separator className="my-3" />
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <MapPinIcon className="mr-2 h-5 w-5 text-primary" />
                {t("adminBookingsPage.modal.addressInfo")}
              </h3>
              <DetailItem
                icon={<MapPinIcon size={16} />}
                label={t("adminBookingsPage.modal.fullAddress")}
                value={booking.customAddressDetails?.fullAddress || booking.addressId?.fullAddress}
              />
              <DetailItem
                icon={<MapPinIcon size={16} />}
                label={t("adminBookingsPage.modal.addressNotes")}
                value={booking.customAddressDetails?.notes || booking.addressId?.notes}
              />
            </div>

            {/* Column 2: Treatment, Professional & Financial Info */}
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <Tag className="mr-2 h-5 w-5 text-primary" />
                {t("adminBookingsPage.modal.treatmentInfo")}
              </h3>
              <DetailItem
                icon={<Tag size={16} />}
                label={t("adminBookingsPage.modal.treatmentName")}
                value={booking.treatmentId?.name}
              />
              {booking.treatmentId?.selectedDuration && (
                <DetailItem
                  icon={<CalendarIcon size={16} />}
                  label={t("adminBookingsPage.modal.treatmentDuration")}
                  value={`${booking.treatmentId.selectedDuration.minutes} ${t("common.minutes")}`}
                />
              )}

              <Separator className="my-3" />
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                {t("adminBookingsPage.modal.professionalInfo")}
              </h3>
              <DetailItem
                icon={<UserIcon size={16} />}
                label={t("adminBookingsPage.modal.assignedProfessional")}
                value={
                  isEditing ? (
                    <Select
                      name="professionalId"
                      value={formData.professionalId}
                      onValueChange={(value) => handleSelectChange("professionalId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("adminBookingsPage.modal.selectProfessional")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t("common.unassign")}</SelectItem>
                        {professionals.map((p) => (
                          <SelectItem key={p._id.toString()} value={p._id.toString()}>
                            {p.name} ({p.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    booking.professionalId?.name || t("common.unassigned")
                  )
                }
              />
              {!isEditing && booking.professionalId && (
                <>
                  <DetailItem
                    icon={<UserIcon size={16} />}
                    label={t("adminBookingsPage.modal.professionalEmail")}
                    value={booking.professionalId?.email}
                  />
                  <DetailItem
                    icon={<UserIcon size={16} />}
                    label={t("adminBookingsPage.modal.professionalPhone")}
                    value={booking.professionalId?.phone}
                  />
                </>
              )}

              <Separator className="my-3" />
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-primary" />
                {t("adminBookingsPage.modal.financialInfo")}
              </h3>
              <DetailItem
                icon={<DollarSign size={16} />}
                label={t("adminBookingsPage.modal.basePrice")}
                value={`${booking.priceDetails.basePrice.toFixed(2)} ${t("common.currencySymbol")}`}
              />
              {booking.priceDetails.surcharges.map((surcharge, index) => (
                <DetailItem
                  key={index}
                  icon={<DollarSign size={16} />}
                  label={surcharge.description}
                  value={`${surcharge.amount.toFixed(2)} ${t("common.currencySymbol")}`}
                />
              ))}
              <DetailItem
                icon={<DollarSign size={16} />}
                label={t("adminBookingsPage.modal.totalSurcharges")}
                value={`${booking.priceDetails.totalSurchargesAmount.toFixed(2)} ${t("common.currencySymbol")}`}
              />
              <DetailItem
                icon={<DollarSign size={16} />}
                label={t("adminBookingsPage.modal.couponDiscount")}
                value={`${booking.priceDetails.discountAmount.toFixed(2)} ${t("common.currencySymbol")}`}
              />
              {booking.priceDetails.appliedCouponId && (
                <DetailItem
                  icon={<Tag size={16} />}
                  label={t("adminBookingsPage.modal.couponCode")}
                  value={booking.priceDetails.appliedCouponId.code}
                />
              )}
              <DetailItem
                icon={<DollarSign size={16} />}
                label={t("adminBookingsPage.modal.voucherApplied")}
                value={`${booking.priceDetails.voucherAppliedAmount.toFixed(2)} ${t("common.currencySymbol")}`}
              />
              {booking.priceDetails.appliedGiftVoucherId && (
                <DetailItem
                  icon={<Tag size={16} />}
                  label={t("adminBookingsPage.modal.voucherCode")}
                  value={booking.priceDetails.appliedGiftVoucherId.code}
                />
              )}
              {booking.priceDetails.redeemedUserSubscriptionId && (
                <DetailItem
                  icon={<Tag size={16} />}
                  label={t("adminBookingsPage.modal.usedSubscription")}
                  value={
                    booking.priceDetails.redeemedUserSubscriptionId.subscriptionId?.name || t("common.subscription")
                  }
                />
              )}
              <DetailItem
                icon={<DollarSign size={16} />}
                label={t("adminBookingsPage.modal.finalAmount")}
                value={`${booking.priceDetails.finalAmount.toFixed(2)} ${t("common.currencySymbol")}`}
              />
              <DetailItem
                icon={<DollarSign size={16} />}
                label={t("adminBookingsPage.modal.paymentStatus")}
                value={t(`paymentStatuses.${booking.paymentDetails.paymentStatus}`)}
              />
              {booking.paymentDetails.paymentMethodId && (
                <DetailItem
                  icon={<DollarSign size={16} />}
                  label={t("adminBookingsPage.modal.paymentMethod")}
                  value={`${booking.paymentDetails.paymentMethodId.type} ${booking.paymentDetails.paymentMethodId.brand || ""} ****${booking.paymentDetails.paymentMethodId.last4 || ""}`}
                />
              )}
            </div>
          </div>
          {/* Notes Section */}
          <Separator className="my-4" />
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-primary" />
              {t("adminBookingsPage.modal.userNotes")}
            </h3>
            {isEditing ? (
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder={t("adminBookingsPage.modal.userNotesPlaceholder")}
              />
            ) : (
              <p className="text-sm p-2 bg-muted rounded-md min-h-[50px]">{booking.notes || t("common.noNotes")}</p>
            )}
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <StickyNote className="mr-2 h-5 w-5 text-primary" />
              {t("adminBookingsPage.modal.adminNotes")}
            </h3>
            {isEditing ? (
              <Textarea
                name="adminNotes"
                value={formData.adminNotes}
                onChange={handleInputChange}
                placeholder={t("adminBookingsPage.modal.adminNotesPlaceholder")}
              />
            ) : (
              <p className="text-sm p-2 bg-muted rounded-md min-h-[50px]">
                {booking.adminNotes || t("common.noNotes")}
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit3 className="mr-2 h-4 w-4" /> {t("common.edit")}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setIsEditing(false) /* Reset formData if needed */
                }}
                variant="ghost"
                disabled={isLoading}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" /> {isLoading ? t("common.saving") : t("common.saveChanges")}
              </Button>
            </>
          )}
          <DialogClose asChild>
            <Button variant="outline" onClick={() => onClose()}>
              {t("common.close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
