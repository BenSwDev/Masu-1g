"use client"

import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar, User, Phone, Mail, MapPin, CreditCard, FileText, Star, AlertTriangle, Stethoscope, DollarSign } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Badge } from "@/components/common/ui/badge"
import { Label } from "@/components/common/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { Separator } from "@/components/common/ui/separator"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { toast } from "sonner"
import type { PopulatedBooking } from "@/types/booking"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getAvailableProfessionals, assignProfessionalToBooking, updateBookingByAdmin } from "@/actions/booking-actions"
import { PhoneInput } from "@/components/common/phone-input"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"

type TFunction = (key: string, options?: any) => string

interface ComprehensiveBookingEditModalProps {
  booking: PopulatedBooking | null
  isOpen: boolean
  onClose: () => void
  t: TFunction
}

export default function ComprehensiveBookingEditModal({
  booking,
  isOpen,
  onClose,
  t
}: ComprehensiveBookingEditModalProps) {
  const [editedBooking, setEditedBooking] = useState<Partial<PopulatedBooking>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const queryClient = useQueryClient()

  const { data: professionalsData } = useQuery({
    queryKey: ["availableProfessionals"],
    queryFn: getAvailableProfessionals,
    enabled: isOpen,
  })

  useEffect(() => {
    if (booking) {
      setEditedBooking({ ...booking })
    }
  }, [booking])

  if (!booking) return null

  const formatDateTime = (date: string | Date) => {
    if (!date) return { date: "", time: "" }
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return { date: "", time: "" }
      return {
        date: format(d, "dd/MM/yyyy"),
        time: format(d, "HH:mm")
      }
    } catch (error) {
      return { date: "", time: "" }
    }
  }

  const safeFormatDate = (date: string | Date | null | undefined, formatStr: string = "dd/MM/yyyy") => {
    if (!date) return t("adminBookings.notSpecified")
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return t("adminBookings.notSpecified")
      return format(d, formatStr)
    } catch (error) {
      return t("adminBookings.notSpecified")
    }
  }

  const getStatusBadgeColor = (status: string) => {
    const statusColors = {
      pending_payment: "bg-yellow-100 text-yellow-800",
      in_process: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-purple-100 text-purple-800",
    }
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Prepare updates object
      const updates: any = {}
      
      if (editedBooking.status !== booking.status) {
        updates.status = editedBooking.status
      }
      
      if (editedBooking.bookingDateTime !== booking.bookingDateTime) {
        updates.bookingDateTime = editedBooking.bookingDateTime ? new Date(editedBooking.bookingDateTime) : undefined
      }
      
      if (editedBooking.recipientName !== booking.recipientName) {
        updates.recipientName = editedBooking.recipientName
      }
      
      if (editedBooking.recipientPhone !== booking.recipientPhone) {
        updates.recipientPhone = editedBooking.recipientPhone
      }
      
      if (editedBooking.recipientEmail !== booking.recipientEmail) {
        updates.recipientEmail = editedBooking.recipientEmail
      }
      
      if (editedBooking.notes !== booking.notes) {
        updates.notes = editedBooking.notes
      }
      
      // Check if payment status changed
      if (editedBooking.paymentDetails?.paymentStatus !== booking.paymentDetails?.paymentStatus) {
        updates.paymentStatus = editedBooking.paymentDetails?.paymentStatus
      }

      // Only update if there are actual changes
      if (Object.keys(updates).length > 0) {
        const result = await updateBookingByAdmin(booking._id, updates)
        if (result.success) {
          toast.success(t("adminBookings.saveSuccess"))
          queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
          onClose()
        } else {
          const errorMessage = result.error && result.error.startsWith("bookings.errors.") 
            ? t(result.error) 
            : t("adminBookings.saveError")
          toast.error(errorMessage)
        }
      } else {
        toast.success(t("adminBookings.saveSuccess"))
        onClose()
      }
    } catch (error) {
      console.error("Error saving booking:", error)
      toast.error(t("adminBookings.saveError"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAssignProfessional = async (professionalId: string) => {
    try {
      const result = await assignProfessionalToBooking(booking._id, professionalId)
      if (result.success) {
        toast.success(t("adminBookings.assignSuccess"))
        setEditedBooking(prev => ({ ...prev, professionalId: { _id: professionalId, name: "" } as any }))
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
      } else {
        const errorMessage = result.error && result.error.startsWith("bookings.errors.") 
          ? t(result.error) 
          : t("adminBookings.assignError")
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error(t("adminBookings.assignError"))
    }
  }

  
  // Client data - directly from booking fields or populated userId
  const client = booking.userId as any || {}
  const bookedByInfo = {
    name: booking.bookedByUserName || client?.name || t("common.unknown"),
    email: booking.bookedByUserEmail || client?.email || "",
    phone: booking.bookedByUserPhone || client?.phone || ""
  }
  
  // Treatment data - populated treatmentId
  const treatment = booking.treatmentId as any
  
  // Professional data - populated professionalId
  const professional = booking.professionalId as any
  
  // Price details populated references
  const appliedCoupon = booking.priceDetails?.appliedCouponId as any
  const appliedGiftVoucher = booking.priceDetails?.appliedGiftVoucherId as any
  const redeemedSubscription = booking.priceDetails?.redeemedUserSubscriptionId as any
  
  // Address data
  const addressSnapshot = booking.bookingAddressSnapshot || booking.customAddressDetails
  
  // Payment data
  const paymentMethod = booking.paymentDetails?.paymentMethodId as any

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-right">
            {t("adminBookings.editBooking")} #{booking.bookingNumber}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className={`grid w-full ${booking.recipientName || booking.recipientPhone ? 'grid-cols-8' : 'grid-cols-7'}`}>
            <TabsTrigger value="details">{t("adminBookings.tabs.details")}</TabsTrigger>
            <TabsTrigger value="treatment">{t("adminBookings.tabs.treatment")}</TabsTrigger>
            <TabsTrigger value="client">{t("adminBookings.tabs.client")}</TabsTrigger>
            {(booking.recipientName || booking.recipientPhone) && (
              <TabsTrigger value="recipient">{t("adminBookings.tabs.recipient")}</TabsTrigger>
            )}
            <TabsTrigger value="professional">{t("adminBookings.tabs.professional")}</TabsTrigger>
            <TabsTrigger value="payment">{t("adminBookings.tabs.payment")}</TabsTrigger>
            <TabsTrigger value="financial">{t("adminBookings.tabs.financial")}</TabsTrigger>
            <TabsTrigger value="address">{t("adminBookings.tabs.address")}</TabsTrigger>
            <TabsTrigger value="notes">{t("adminBookings.tabs.notes")}</TabsTrigger>
          </TabsList>

          {/* Booking Details */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("adminBookings.bookingDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.bookingNumber")}</Label>
                    <Input value={booking.bookingNumber} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.status")}</Label>
                    <Select 
                      value={editedBooking.status || booking.status}
                      onValueChange={(value) => setEditedBooking((prev: any) => ({ ...prev, status: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
                        <SelectItem value="in_process">בטיפול</SelectItem>
                        <SelectItem value="confirmed">מאושר</SelectItem>
                        <SelectItem value="completed">הושלם</SelectItem>
                        <SelectItem value="cancelled">בוטל</SelectItem>
                        <SelectItem value="refunded">הוחזר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                      <Label>{t("adminBookings.date")}</Label>
                      <Input 
                        type="date"
                        value={safeFormatDate(booking.bookingDateTime, "yyyy-MM-dd") !== t("adminBookings.notSpecified") ? safeFormatDate(booking.bookingDateTime, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          if (e.target.value && booking.bookingDateTime) {
                            const newDate = new Date(e.target.value)
                            const currentTime = new Date(booking.bookingDateTime)
                            newDate.setHours(currentTime.getHours(), currentTime.getMinutes())
                            setEditedBooking((prev: any) => ({ ...prev, bookingDateTime: newDate.toISOString() }))
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("adminBookings.time")}</Label>
                      <Input 
                        type="time"
                        value={safeFormatDate(booking.bookingDateTime, "HH:mm") !== t("adminBookings.notSpecified") ? safeFormatDate(booking.bookingDateTime, "HH:mm") : ""}
                        onChange={(e) => {
                          if (e.target.value && booking.bookingDateTime) {
                            const currentDate = new Date(booking.bookingDateTime)
                            const [hours, minutes] = e.target.value.split(':')
                            currentDate.setHours(parseInt(hours), parseInt(minutes))
                            setEditedBooking((prev: any) => ({ ...prev, bookingDateTime: currentDate.toISOString() }))
                          }
                        }}
                      />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.source")}</Label>
                    <Input value={booking.source} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.therapistGenderPreference")}</Label>
                    <Input value={booking.therapistGenderPreference} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.isFlexibleTime")}</Label>
                    <Input value={booking.isFlexibleTime ? t("common.yes") : t("common.no")} disabled />
                  </div>
                  {booking.flexibilityRangeHours && (
                    <div className="space-y-2">
                      <Label>{t("adminBookings.flexibilityRangeHours")}</Label>
                      <Input value={`${booking.flexibilityRangeHours} ${t("adminBookings.hours")}`} disabled />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatment Details */}
          <TabsContent value="treatment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  {t("adminBookings.treatmentFullDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.treatmentName")}</Label>
                    <Input value={treatment?.name || t("common.unknown")} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.treatmentId")}</Label>
                    <Input value={treatment?._id?.toString() || booking.treatmentId?.toString()} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.category")}</Label>
                    <Input value={treatment?.category || t("adminBookings.notSpecified")} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.pricingType")}</Label>
                    <Input value={treatment?.pricingType || t("adminBookings.notSpecified")} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.duration")}</Label>
                    <Input value={`${treatment?.defaultDurationMinutes || 60} ${t("adminBookings.minutes")}`} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.basePrice")}</Label>
                    <Input value={`₪${booking.priceDetails?.basePrice || treatment?.fixedPrice || 0}`} disabled />
                  </div>
                </div>

                {treatment?.description && (
                  <div className="space-y-2">
                    <Label>{t("adminBookings.description")}</Label>
                    <textarea
                      className="w-full p-2 border rounded-md bg-gray-50"
                      value={treatment.description}
                      disabled
                      rows={3}
                    />
                  </div>
                )}

                {treatment?.durations && treatment.durations.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t("adminBookings.availableDurations")}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {treatment.durations.map((duration: any, index: number) => (
                        <div key={index} className="p-2 bg-gray-50 rounded border">
                          <div className="text-sm font-medium">{duration.minutes} {t("adminBookings.minutes")}</div>
                          <div className="text-xs text-gray-600">₪{duration.price}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.finalPrice")}</Label>
                    <Input value={`₪${booking.priceDetails?.finalAmount || 0}`} disabled className="font-semibold" />
                  </div>
                  {booking.selectedDurationId && (
                    <div className="space-y-2">
                      <Label>{t("adminBookings.selectedDuration")}</Label>
                      <Input value={booking.selectedDurationId.toString()} disabled />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Information */}
          <TabsContent value="client" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("adminBookings.clientFullInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Guest badge if no userId */}
                {!client?._id && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-blue-700 border-blue-200">{t("common.guest")}</Badge>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("adminBookings.clientName")}
                    </Label>
                    <Input 
                      value={editedBooking.bookedByUserName || bookedByInfo.name}
                      onChange={(e) => setEditedBooking((prev: any) => ({ ...prev, bookedByUserName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("adminBookings.clientEmail")}
                    </Label>
                    <Input 
                      type="email"
                      value={editedBooking.bookedByUserEmail || bookedByInfo.email}
                      onChange={(e) => setEditedBooking((prev: any) => ({ ...prev, bookedByUserEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t("adminBookings.clientPhone")}
                    </Label>
                    <PhoneInput
                      fullNumberValue={editedBooking.bookedByUserPhone || bookedByInfo.phone}
                      onPhoneChange={(value) => setEditedBooking((prev: any) => ({ ...prev, bookedByUserPhone: value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.userId")}</Label>
                    <Input value={client?._id?.toString() || booking.userId?.toString() || t("common.guest")}
                      disabled />
                  </div>
                </div>

                {client && client._id && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("adminBookings.gender")}</Label>
                        <Input value={client.gender || t("adminBookings.notSpecified")} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("adminBookings.birthDate")}</Label>
                        <Input value={safeFormatDate(client.dateOfBirth)} disabled />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("adminBookings.accountCreated")}</Label>
                        <Input value={safeFormatDate(client.createdAt, "dd/MM/yyyy HH:mm")} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("adminBookings.lastUpdate")}</Label>
                        <Input value={safeFormatDate(client.updatedAt, "dd/MM/yyyy HH:mm")} disabled />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("adminBookings.roles")}</Label>
                        <Input value={client.roles?.join(", ") || t("adminBookings.notSpecified")} disabled />
                      </div>
                      {client.activeRole && (
                        <div className="space-y-2">
                          <Label>{t("adminBookings.activeRole")}</Label>
                          <Input value={client.activeRole} disabled />
                        </div>
                      )}
                    </div>

                    {client.treatmentPreferences && (
                      <div className="space-y-2">
                        <Label>{t("adminBookings.treatmentPreferences")}</Label>
                        <div className="p-3 bg-gray-50 rounded border">
                          <div className="text-sm">
                            <strong>{t("adminBookings.preferredTherapistGender")}:</strong> {client.treatmentPreferences.therapistGender || t("adminBookings.notSpecified")}
                          </div>
                        </div>
                      </div>
                    )}

                    {client.notificationPreferences && (
                      <div className="space-y-2">
                        <Label>{t("adminBookings.notificationPreferences")}</Label>
                        <div className="p-3 bg-gray-50 rounded border">
                          <div className="text-sm space-y-1">
                            <div><strong>{t("adminBookings.methods")}:</strong> {client.notificationPreferences.methods?.join(", ") || t("adminBookings.notSpecified")}</div>
                            <div><strong>{t("adminBookings.language")}:</strong> {client.notificationPreferences.language || t("adminBookings.notSpecified")}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recipient Information - Only show if booked for someone else */}
          {(booking.recipientName || booking.recipientPhone) && (
            <TabsContent value="recipient" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t("adminBookings.recipientInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 mb-4">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{t("adminBookings.bookedForSomeoneElse")}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("adminBookings.recipientName")}</Label>
                        <Input 
                          value={editedBooking.recipientName || booking.recipientName || ""}
                          onChange={(e) => setEditedBooking((prev: any) => ({ ...prev, recipientName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("adminBookings.recipientPhone")}</Label>
                        <PhoneInput
                          fullNumberValue={editedBooking.recipientPhone || booking.recipientPhone || ""}
                          onPhoneChange={(value: string) => setEditedBooking((prev: any) => ({ ...prev, recipientPhone: value }))}
                        />
                      </div>
                    </div>

                    {booking.recipientEmail && (
                      <div className="space-y-2 mt-4">
                        <Label>{t("adminBookings.recipientEmail")}</Label>
                        <Input 
                          type="email"
                          value={editedBooking.recipientEmail || booking.recipientEmail || ""}
                          onChange={(e) => setEditedBooking((prev: any) => ({ ...prev, recipientEmail: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Professional Information */}
          <TabsContent value="professional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  {t("adminBookings.professionalInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!booking.professionalId ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{t("adminBookings.noProfessionalAssigned")}</span>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("adminBookings.assignProfessional")}</Label>
                      <Select onValueChange={handleAssignProfessional}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("adminBookings.chooseProfessional")} />
                        </SelectTrigger>
                        <SelectContent>
                          {professionalsData?.professionals?.map((prof) => (
                            <SelectItem key={prof._id} value={prof._id}>
                              <div className="flex items-center gap-2">
                                <span>{prof.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({prof.gender === "male" ? t("common.male") : t("common.female")})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                                      <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 mb-2">
                        <Star className="h-4 w-4" />
                        <span className="font-medium">{t("adminBookings.assignedProfessional")}</span>
                      </div>
                      <div className="text-lg font-semibold text-green-900">
                        {professional?.name || t("common.unknown")}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        {professional?.phone && (
                          <div className="flex items-center gap-2 text-green-700">
                            <Phone className="h-3 w-3" />
                            <span>{formatPhoneForDisplay(professional.phone || "")}</span>
                          </div>
                        )}
                        {professional?.email && (
                          <div className="flex items-center gap-2 text-green-700">
                            <Mail className="h-3 w-3" />
                            <span>{professional.email}</span>
                          </div>
                        )}
                        {professional?.gender && (
                          <div className="text-green-700">
                            {t("adminBookings.gender")}: {professional.gender === "male" ? t("common.male") : t("common.female")}
                          </div>
                        )}
                        {professional?.roles && (
                          <div className="text-green-700">
                            {t("adminBookings.roles")}: {professional.roles.join(", ")}
                          </div>
                        )}
                        {professional?._id && (
                          <div className="col-span-2 text-xs text-green-600 font-mono">
                            ID: {professional._id.toString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("adminBookings.changeProfessional")}</Label>
                      <Select onValueChange={handleAssignProfessional}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("adminBookings.chooseDifferentProfessional")} />
                        </SelectTrigger>
                        <SelectContent>
                          {professionalsData?.professionals?.map((prof) => (
                            <SelectItem key={prof._id} value={prof._id}>
                              <div className="flex items-center gap-2">
                                <span>{prof.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({prof.gender === "male" ? t("common.male") : t("common.female")})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Information */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("adminBookings.paymentInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Breakdown */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">{t("adminBookings.priceBreakdown")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("adminBookings.basePrice")}</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={booking.priceDetails?.basePrice || 0}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("adminBookings.treatmentPriceAfterSubscription")}</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={booking.priceDetails?.treatmentPriceAfterSubscriptionOrTreatmentVoucher || 0}
                        disabled
                      />
                    </div>
                  </div>

                  {booking.priceDetails?.surcharges && booking.priceDetails.surcharges.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t("adminBookings.surcharges")}</Label>
                      <div className="space-y-2">
                        {booking.priceDetails.surcharges.map((surcharge, index) => (
                          <div key={index} className="p-2 bg-yellow-50 rounded border border-yellow-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{surcharge.description}</span>
                              <span className="font-medium">₪{surcharge.amount}</span>
                            </div>
                            {surcharge.professionalShare && (
                              <div className="text-xs text-gray-600 mt-1">
                                {t("adminBookings.professionalShare")}: {surcharge.professionalShare.amount}
                                {surcharge.professionalShare.type === "percentage" ? "%" : "₪"}
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="flex justify-between items-center p-2 bg-yellow-100 rounded font-medium">
                          <span>{t("adminBookings.totalSurcharges")}</span>
                          <span>₪{booking.priceDetails.totalSurchargesAmount}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("adminBookings.discountAmount")}</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={booking.priceDetails?.discountAmount || 0}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("adminBookings.voucherAppliedAmount")}</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={booking.priceDetails?.voucherAppliedAmount || 0}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-800">{t("adminBookings.finalAmount")}</span>
                      <span className="text-xl font-bold text-green-900">₪{booking.priceDetails?.finalAmount || 0}</span>
                    </div>
                  </div>


                </div>

                {/* Applied Discounts & Vouchers - Only show if they exist */}
                {(appliedCoupon || appliedGiftVoucher || redeemedSubscription) && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">{t("adminBookings.appliedDiscountsAndVouchers")}</h4>
                    
                    {appliedCoupon && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2 text-purple-800 mb-2">
                          <span className="font-medium">{t("adminBookings.appliedCoupon")}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><strong>{t("adminBookings.couponCode")}:</strong> {appliedCoupon.code}</div>
                          <div><strong>{t("adminBookings.couponName")}:</strong> {appliedCoupon.name}</div>
                          <div><strong>{t("adminBookings.discountType")}:</strong> {appliedCoupon.discountType}</div>
                          <div><strong>{t("adminBookings.discountValue")}:</strong> {appliedCoupon.discountValue}</div>
                        </div>
                      </div>
                    )}

                    {appliedGiftVoucher && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-800 mb-2">
                          <span className="font-medium">{t("adminBookings.appliedGiftVoucher")}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><strong>{t("adminBookings.voucherCode")}:</strong> {appliedGiftVoucher.code}</div>
                          <div><strong>{t("adminBookings.originalAmount")}:</strong> ₪{appliedGiftVoucher.originalAmount}</div>
                          <div><strong>{t("adminBookings.remainingAmount")}:</strong> ₪{appliedGiftVoucher.remainingAmount}</div>
                        </div>
                      </div>
                    )}

                    {redeemedSubscription && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800 mb-2">
                          <span className="font-medium">{t("adminBookings.redeemedSubscription")}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><strong>{t("adminBookings.subscriptionName")}:</strong> {redeemedSubscription.subscriptionId?.name}</div>
                          <div><strong>{t("adminBookings.treatmentName")}:</strong> {redeemedSubscription.treatmentId?.name}</div>
                          <div><strong>{t("adminBookings.usedQuantity")}:</strong> {redeemedSubscription.usedQuantity}</div>
                          <div><strong>{t("adminBookings.remainingQuantity")}:</strong> {redeemedSubscription.remainingQuantity}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">{t("adminBookings.paymentDetails")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("adminBookings.paymentStatus")}</Label>
                      <Select 
                        value={editedBooking.paymentDetails?.paymentStatus || booking.paymentDetails?.paymentStatus || "pending"}
                        onValueChange={(value) => setEditedBooking(prev => ({ 
                          ...prev, 
                          paymentDetails: { 
                            ...prev.paymentDetails, 
                            paymentStatus: value as any 
                          } 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t("adminBookings.paymentStatuses.pending")}</SelectItem>
                          <SelectItem value="paid">{t("adminBookings.paymentStatuses.paid")}</SelectItem>
                          <SelectItem value="failed">{t("adminBookings.paymentStatuses.failed")}</SelectItem>
                          <SelectItem value="not_required">{t("adminBookings.paymentStatuses.notRequired")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {booking.paymentDetails?.transactionId && (
                      <div className="space-y-2">
                        <Label>{t("adminBookings.transactionId")}</Label>
                        <Input value={booking.paymentDetails.transactionId} disabled />
                      </div>
                    )}
                  </div>

                  {paymentMethod && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-800 mb-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-medium">{t("adminBookings.paymentMethod")}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div><strong>{t("adminBookings.paymentType")}:</strong> {paymentMethod.type}</div>
                        {paymentMethod.brand && <div><strong>{t("adminBookings.cardBrand")}:</strong> {paymentMethod.brand}</div>}
                        {paymentMethod.last4 && <div><strong>{t("adminBookings.last4Digits")}:</strong> **** {paymentMethod.last4}</div>}
                        <div><strong>{t("adminBookings.displayName")}:</strong> {paymentMethod.displayName}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Information */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t("adminBookings.financialBreakdown")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Professional Payment Breakdown */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">{t("adminBookings.professionalPaymentBreakdown")}</h4>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    {(booking.priceDetails?.baseProfessionalPayment || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{t("adminBookings.baseProfessionalPayment")}:</span>
                        <span className="font-medium">₪{booking.priceDetails.baseProfessionalPayment || 0}</span>
                      </div>
                    )}
                    
                    {(booking.priceDetails?.surchargesProfessionalPayment || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{t("adminBookings.surchargesProfessionalPayment")}:</span>
                        <span className="font-medium">₪{booking.priceDetails.surchargesProfessionalPayment || 0}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center font-bold border-t pt-2 text-lg">
                      <span>{t("adminBookings.totalProfessionalPayment")}:</span>
                      <span className="text-blue-700">₪{booking.priceDetails?.totalProfessionalPayment || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Office Commission */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">{t("adminBookings.officeCommission")}</h4>
                  
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t("adminBookings.totalOfficeCommission")}:</span>
                      <div className="text-right">
                        <span className={`font-bold text-lg ${
                          (booking.priceDetails?.totalOfficeCommission || 0) >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {(booking.priceDetails?.totalOfficeCommission || 0) >= 0 ? '₪' : '-₪'}
                          {Math.abs(booking.priceDetails?.totalOfficeCommission || 0)}
                        </span>
                        {(booking.priceDetails?.totalOfficeCommission || 0) < 0 && (
                          <div className="text-xs text-red-500 mt-1">המשרד משלם מהכיס</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Explanation */}
                    <div className="mt-3 pt-3 border-t border-gray-300 text-sm text-gray-600">
                      <div className="space-y-1">
                        <div>חישוב: מה שהלקוח משלם (₪{booking.priceDetails?.finalAmount || 0}) - מה שהמטפל מקבל (₪{booking.priceDetails?.totalProfessionalPayment || 0})</div>
                        {(booking.priceDetails?.totalOfficeCommission || 0) < 0 && (
                          <div className="text-red-600 font-medium">
                            הטיפול מכוסה על ידי מנוי/שובר, המשרד משלם למטפל מהכיס
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Status for Professional */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">{t("adminBookings.professionalPaymentStatus")}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div className="space-y-2">
                       <Label>{t("adminBookings.professionalPaid")}</Label>
                       <Select 
                         value="pending"
                         onValueChange={(value) => {
                           // TODO: Add professional payment status to booking model and update logic
                         }}
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="pending">{t("adminBookings.paymentStatuses.pending")}</SelectItem>
                           <SelectItem value="paid">{t("adminBookings.paymentStatuses.paid")}</SelectItem>
                           <SelectItem value="failed">{t("adminBookings.paymentStatuses.failed")}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     
                     <div className="space-y-2">
                       <Label>{t("adminBookings.professionalPaymentDate")}</Label>
                       <Input value={t("adminBookings.notSpecified")} disabled />
                     </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">{t("adminBookings.financialSummary")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-white rounded border">
                      <div className="text-xs text-gray-500">{t("adminBookings.customerPaid")}</div>
                      <div className="text-lg font-bold text-blue-600">₪{booking.priceDetails?.finalAmount || 0}</div>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <div className="text-xs text-gray-500">{t("adminBookings.professionalReceives")}</div>
                      <div className="text-lg font-bold text-green-600">₪{booking.priceDetails?.totalProfessionalPayment || 0}</div>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <div className="text-xs text-gray-500">{t("adminBookings.officeProfit")}</div>
                      <div className={`text-lg font-bold ${
                        (booking.priceDetails?.totalOfficeCommission || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(booking.priceDetails?.totalOfficeCommission || 0) >= 0 ? '₪' : '-₪'}
                        {Math.abs(booking.priceDetails?.totalOfficeCommission || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Information */}
          <TabsContent value="address" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t("adminBookings.addressInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {addressSnapshot ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-3">{t("adminBookings.bookingAddress")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-blue-600">{t("adminBookings.fullAddress")}</Label>
                          <div className="font-medium">{addressSnapshot.fullAddress}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-blue-600">{t("adminBookings.city")}</Label>
                          <div>{addressSnapshot.city}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-blue-600">{t("adminBookings.street")}</Label>
                          <div>{addressSnapshot.street} {addressSnapshot.streetNumber}</div>
                        </div>
                        {addressSnapshot.apartment && (
                          <div>
                            <Label className="text-xs text-blue-600">{t("adminBookings.apartment")}</Label>
                            <div>{addressSnapshot.apartment}</div>
                          </div>
                        )}
                        {addressSnapshot.entrance && (
                          <div>
                            <Label className="text-xs text-blue-600">{t("adminBookings.entrance")}</Label>
                            <div>{addressSnapshot.entrance}</div>
                          </div>
                        )}
                        {addressSnapshot.floor && (
                          <div>
                            <Label className="text-xs text-blue-600">{t("adminBookings.floor")}</Label>
                            <div>{addressSnapshot.floor}</div>
                          </div>
                        )}
                        {addressSnapshot.hotelName && (
                          <div>
                            <Label className="text-xs text-blue-600">{t("adminBookings.hotelName")}</Label>
                            <div>{addressSnapshot.hotelName}</div>
                          </div>
                        )}
                        {addressSnapshot.roomNumber && (
                          <div>
                            <Label className="text-xs text-blue-600">{t("adminBookings.roomNumber")}</Label>
                            <div>{addressSnapshot.roomNumber}</div>
                          </div>
                        )}
                        {addressSnapshot.notes && (
                          <div className="col-span-2">
                            <Label className="text-xs text-blue-600">{t("adminBookings.addressNotes")}</Label>
                            <div>{addressSnapshot.notes}</div>
                          </div>
                        )}
                        {addressSnapshot.otherInstructions && (
                          <div className="col-span-2">
                            <Label className="text-xs text-blue-600">{t("adminBookings.otherInstructions")}</Label>
                            <div>{addressSnapshot.otherInstructions}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-gray-600">{t("adminBookings.noAddressInfo")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("adminBookings.notesAndComments")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("adminBookings.clientNotes")}</Label>
                  <Textarea 
                    value={editedBooking.notes || booking.notes || ""}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    placeholder={t("adminBookings.clientNotesPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("adminBookings.adminNotes")}</Label>
                  <Textarea 
                    value={(editedBooking as any).adminNotes || (booking as any).adminNotes || ""}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, adminNotes: e.target.value } as any))}
                    rows={4}
                    placeholder={t("adminBookings.adminNotesPlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 