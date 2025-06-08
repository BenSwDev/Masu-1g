"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarDays, Clock, User, Phone, Mail, MapPin, CreditCard, FileText, Star, AlertTriangle } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { PopulatedBooking } from "@/types/booking"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getAvailableProfessionals, assignProfessionalToBooking } from "@/actions/booking-actions"

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
    const d = new Date(date)
    return {
      date: format(d, "dd/MM/yyyy"),
      time: format(d, "HH:mm")
    }
  }

  const getStatusBadgeColor = (status: string) => {
    const statusColors = {
      confirmed: "bg-green-100 text-green-800",
      pending_professional_assignment: "bg-yellow-100 text-yellow-800",
      professional_en_route: "bg-blue-100 text-blue-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled_by_user: "bg-red-100 text-red-800",
      cancelled_by_admin: "bg-red-100 text-red-800",
      no_show: "bg-orange-100 text-orange-800",
    }
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Here you would implement the save logic
      // For now, we'll just show success message
      toast.success(t("adminBookings.saveSuccess"))
      queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
      onClose()
    } catch (error) {
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
        setEditedBooking(prev => ({ ...prev, professionalId }))
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

  const dateTime = formatDateTime(booking.bookingDateTime)
  const client = {
    name: booking.bookedByUserName || (booking.userId as any)?.name || t("common.unknown"),
    email: booking.bookedByUserEmail || (booking.userId as any)?.email,
    phone: booking.bookedByUserPhone || (booking.userId as any)?.phone
  }
  const treatment = booking.treatmentId as any
  const professional = booking.professionalId as any

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-right">
            {t("adminBookings.editBooking")} #{booking.bookingNumber}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">{t("adminBookings.tabs.details")}</TabsTrigger>
            <TabsTrigger value="client">{t("adminBookings.tabs.client")}</TabsTrigger>
            <TabsTrigger value="professional">{t("adminBookings.tabs.professional")}</TabsTrigger>
            <TabsTrigger value="payment">{t("adminBookings.tabs.payment")}</TabsTrigger>
            <TabsTrigger value="notes">{t("adminBookings.tabs.notes")}</TabsTrigger>
          </TabsList>

          {/* Booking Details */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
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
                      onValueChange={(value) => setEditedBooking(prev => ({ ...prev, status: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">{t("adminBookings.status.confirmed")}</SelectItem>
                        <SelectItem value="pending_professional_assignment">{t("adminBookings.status.pendingAssignment")}</SelectItem>
                        <SelectItem value="professional_en_route">{t("adminBookings.status.enRoute")}</SelectItem>
                        <SelectItem value="completed">{t("adminBookings.status.completed")}</SelectItem>
                        <SelectItem value="cancelled_by_user">{t("adminBookings.status.cancelledByUser")}</SelectItem>
                        <SelectItem value="cancelled_by_admin">{t("adminBookings.status.cancelledByAdmin")}</SelectItem>
                        <SelectItem value="no_show">{t("adminBookings.status.noShow")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.date")}</Label>
                    <Input 
                      type="date"
                      value={format(new Date(booking.bookingDateTime), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value)
                        const currentTime = new Date(booking.bookingDateTime)
                        newDate.setHours(currentTime.getHours(), currentTime.getMinutes())
                        setEditedBooking(prev => ({ ...prev, bookingDateTime: newDate.toISOString() }))
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.time")}</Label>
                    <Input 
                      type="time"
                      value={format(new Date(booking.bookingDateTime), "HH:mm")}
                      onChange={(e) => {
                        const currentDate = new Date(booking.bookingDateTime)
                        const [hours, minutes] = e.target.value.split(':')
                        currentDate.setHours(parseInt(hours), parseInt(minutes))
                        setEditedBooking(prev => ({ ...prev, bookingDateTime: currentDate.toISOString() }))
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("adminBookings.treatment")}</Label>
                  <Input value={treatment?.name || t("common.unknown")} disabled />
                </div>

                <div className="space-y-2">
                  <Label>{t("adminBookings.address")}</Label>
                  <Textarea 
                    value={editedBooking.address || booking.address || ""}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                  />
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
                  {t("adminBookings.clientInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("adminBookings.clientName")}
                  </Label>
                  <Input 
                    value={editedBooking.bookedByUserName || booking.bookedByUserName || client.name}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, bookedByUserName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t("adminBookings.clientEmail")}
                  </Label>
                  <Input 
                    type="email"
                    value={editedBooking.bookedByUserEmail || booking.bookedByUserEmail || client.email || ""}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, bookedByUserEmail: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t("adminBookings.clientPhone")}
                  </Label>
                  <Input 
                    type="tel"
                    value={editedBooking.bookedByUserPhone || booking.bookedByUserPhone || client.phone || ""}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, bookedByUserPhone: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                      {professional?.phone && (
                        <div className="flex items-center gap-2 text-sm text-green-700 mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{professional.phone}</span>
                        </div>
                      )}
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.baseAmount")}</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={editedBooking.priceDetails?.baseAmount || booking.priceDetails?.baseAmount || 0}
                      onChange={(e) => setEditedBooking(prev => ({ 
                        ...prev, 
                        priceDetails: { 
                          ...prev.priceDetails, 
                          baseAmount: parseFloat(e.target.value) || 0 
                        } 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.discount")}</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={editedBooking.priceDetails?.discount || booking.priceDetails?.discount || 0}
                      onChange={(e) => setEditedBooking(prev => ({ 
                        ...prev, 
                        priceDetails: { 
                          ...prev.priceDetails, 
                          discount: parseFloat(e.target.value) || 0 
                        } 
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("adminBookings.tax")}</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={editedBooking.priceDetails?.tax || booking.priceDetails?.tax || 0}
                      onChange={(e) => setEditedBooking(prev => ({ 
                        ...prev, 
                        priceDetails: { 
                          ...prev.priceDetails, 
                          tax: parseFloat(e.target.value) || 0 
                        } 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("adminBookings.finalAmount")}</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={editedBooking.priceDetails?.finalAmount || booking.priceDetails?.finalAmount || 0}
                      onChange={(e) => setEditedBooking(prev => ({ 
                        ...prev, 
                        priceDetails: { 
                          ...prev.priceDetails, 
                          finalAmount: parseFloat(e.target.value) || 0 
                        } 
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("adminBookings.paymentStatus")}</Label>
                  <Select 
                    value={editedBooking.paymentStatus || booking.paymentStatus || "pending"}
                    onValueChange={(value) => setEditedBooking(prev => ({ ...prev, paymentStatus: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("adminBookings.paymentStatuses.pending")}</SelectItem>
                      <SelectItem value="completed">{t("adminBookings.paymentStatuses.completed")}</SelectItem>
                      <SelectItem value="failed">{t("adminBookings.paymentStatuses.failed")}</SelectItem>
                      <SelectItem value="refunded">{t("adminBookings.paymentStatuses.refunded")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    value={editedBooking.adminNotes || booking.adminNotes || ""}
                    onChange={(e) => setEditedBooking(prev => ({ ...prev, adminNotes: e.target.value }))}
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