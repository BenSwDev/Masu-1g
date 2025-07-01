"use client"

import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Star,
  AlertTriangle,
  Stethoscope,
  CheckCircle,
  XCircle,
  DollarSign,
  UserCheck,
  Building,
  Truck,
  Gift,
  Ticket,
  Target,
  Eye,
  Edit3,
  BadgeCheck,
  Shield,
  Activity,
  TrendingUp,
  Calculator,
  Home,
  Hotel,
  Car,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import {
  getAvailableProfessionals,
  assignProfessionalToBooking,
  updateBookingByAdmin,
} from "@/actions/booking-actions"
import { formatPhoneForDisplay } from "@/lib/phone-utils"

type TFunction = (key: string, options?: any) => string

interface EnhancedBookingModalProps {
  booking: PopulatedBooking | null
  isOpen: boolean
  onClose: () => void
  t: TFunction
}

export default function EnhancedBookingModal({
  booking,
  isOpen,
  onClose,
  t,
}: EnhancedBookingModalProps) {
  const [editedBooking, setEditedBooking] = useState<Partial<PopulatedBooking>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
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

  // Helper functions
  const formatDateTime = (date: string | Date) => {
    if (!date) return { date: "", time: "" }
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return { date: "", time: "" }
      return {
        date: format(d, "dd/MM/yyyy"),
        time: format(d, "HH:mm"),
      }
    } catch (error) {
      return { date: "", time: "" }
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending_payment: "bg-yellow-500",
      in_process: "bg-blue-500",
      confirmed: "bg-green-500",
      completed: "bg-gray-500",
      cancelled: "bg-red-500",
      refunded: "bg-purple-500",
    }
    return colors[status as keyof typeof colors] || "bg-gray-500"
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      pending_payment: Clock,
      in_process: Activity,
      confirmed: CheckCircle,
      completed: BadgeCheck,
      cancelled: XCircle,
      refunded: TrendingUp,
    }
    const Icon = icons[status as keyof typeof icons] || Clock
    return <Icon className="h-4 w-4" />
  }

  // Data preparation
  const dateTime = formatDateTime(booking.bookingDateTime)
  const client = (booking.userId as any) || {}
  const bookedByInfo = {
    name: booking.bookedByUserName || client?.name || t("common.unknown"),
    email: booking.bookedByUserEmail || client?.email || "",
    phone: booking.bookedByUserPhone || client?.phone || "",
  }
  const treatment = booking.treatmentId as any
  const professional = booking.professionalId as any
  const addressSnapshot = booking.bookingAddressSnapshot || booking.customAddressDetails

  // Price calculations (snapshot from booking, not dynamic!)
  const priceDetails = booking.priceDetails
  const basePrice = priceDetails.basePrice || 0
  const surcharges = priceDetails.totalSurchargesAmount || 0
  const discounts = (priceDetails.discountAmount || 0) + (priceDetails.voucherAppliedAmount || 0)
  const finalAmount = priceDetails.finalAmount || 0

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates: any = {}

      if (editedBooking.status !== booking.status) {
        updates.status = editedBooking.status
      }

      if (editedBooking.bookingDateTime !== booking.bookingDateTime) {
        updates.bookingDateTime = editedBooking.bookingDateTime
          ? new Date(editedBooking.bookingDateTime)
          : undefined
      }

      if (editedBooking.notes !== booking.notes) {
        updates.notes = editedBooking.notes
      }

      if (Object.keys(updates).length > 0) {
        const result = await updateBookingByAdmin(booking._id.toString?.() || '', updates)
        if (result.success) {
          toast.success(t("adminBookings.saveSuccess"))
          queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
          onClose()
        } else {
          toast.error(result.error || t("adminBookings.saveError"))
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <DialogTitle className="text-xl">הזמנה #{booking.bookingNumber}</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(booking.status)}`} />
                {getStatusIcon(booking.status)}
                <Badge variant="outline" className="text-sm">
                  {t(`bookingStatus.${booking.status}`) || booking.status}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              נוצר: {format(new Date(booking.createdAt), "dd/MM/yyyy HH:mm")}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              סקירה כללית
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              פרטים ועריכה
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              פרטים כספיים
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              ניהול מטפל
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Read-only beautiful display */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client & Booking Info */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <User className="h-5 w-5" />
                    פרטי לקוח והזמנה
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold">{bookedByInfo.name}</div>
                      <div className="text-sm text-muted-foreground">מזמין</div>
                    </div>
                  </div>

                  {bookedByInfo.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{formatPhoneForDisplay(bookedByInfo.phone || "")}</span>
                    </div>
                  )}

                  {bookedByInfo.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{bookedByInfo.email}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{dateTime.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{dateTime.time}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Treatment Info */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Stethoscope className="h-5 w-5" />
                    פרטי טיפול
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="font-semibold text-lg">{treatment?.name || "לא צוין"}</div>
                    <div className="text-sm text-muted-foreground">
                      {treatment?.category ? treatment.category : ""}
                    </div>
                  </div>

                  {booking.selectedDurationId && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span>משך טיפול מותאם</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span>
                      מטפל מועדף:{" "}
                      {booking.therapistGenderPreference === "any"
                        ? "לא משנה"
                        : booking.therapistGenderPreference === "male"
                          ? "זכר"
                          : "נקבה"}
                    </span>
                  </div>

                  {booking.recipientName && booking.recipientName !== bookedByInfo.name && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 text-orange-700 font-medium">
                        <Gift className="h-4 w-4" />
                        הטיפול עבור: {booking.recipientName}
                      </div>
                      {booking.recipientPhone && (
                        <div className="text-sm text-orange-600 mt-1">
                          טלפון: {formatPhoneForDisplay(booking.recipientPhone || "")}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Price Summary */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <DollarSign className="h-5 w-5" />
                    סיכום כספי
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>מחיר בסיס:</span>
                    <span className="font-medium">₪{basePrice}</span>
                  </div>

                  {surcharges > 0 && (
                    <div className="flex justify-between items-center text-orange-600">
                      <span>תוספות:</span>
                      <span>+₪{surcharges}</span>
                    </div>
                  )}

                  {discounts > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>הנחות/מימושים:</span>
                      <span>-₪{discounts}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>סה"כ לתשלום:</span>
                    <span className="text-purple-600">₪{finalAmount}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        booking.paymentDetails?.paymentStatus === "paid"
                          ? "bg-green-500"
                          : booking.paymentDetails?.paymentStatus === "pending"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm">
                      {booking.paymentDetails?.paymentStatus === "paid"
                        ? "שולם"
                        : booking.paymentDetails?.paymentStatus === "pending"
                          ? "ממתין לתשלום"
                          : "לא שולם"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            {booking.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    הערות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm">{booking.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Details & Edit Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>עריכת פרטי הזמנה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>סטטוס הזמנה</Label>
                    <Select
                      value={editedBooking.status || booking.status}
                      onValueChange={value =>
                        setEditedBooking(prev => ({ ...prev, status: value as any }))
                      }
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

                  <div className="space-y-2">
                    <Label>תאריך ושעת הטיפול</Label>
                    <Input
                      type="datetime-local"
                      value={
                        editedBooking.bookingDateTime
                          ? format(new Date(editedBooking.bookingDateTime), "yyyy-MM-dd'T'HH:mm")
                          : format(new Date(booking.bookingDateTime), "yyyy-MM-dd'T'HH:mm")
                      }
                      onChange={e =>
                        setEditedBooking(prev => ({
                          ...prev,
                          bookingDateTime: new Date(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>הערות לקוח</Label>
                    <Textarea
                      value={editedBooking.notes || booking.notes || ""}
                      onChange={e => setEditedBooking(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      placeholder="הערות מהלקוח..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>פרטי תשלום</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>סטטוס תשלום</Label>
                    <Select
                      value={
                        editedBooking.paymentDetails?.paymentStatus ||
                        booking.paymentDetails?.paymentStatus ||
                        "pending"
                      }
                      onValueChange={value =>
                        setEditedBooking(prev => ({
                          ...prev,
                          paymentDetails: {
                            ...prev.paymentDetails,
                            paymentStatus: value as any,
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">ממתין</SelectItem>
                        <SelectItem value="paid">שולם</SelectItem>
                        <SelectItem value="failed">נכשל</SelectItem>
                        <SelectItem value="not_required">לא נדרש</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {booking.paymentDetails?.transactionId && (
                    <div className="space-y-2">
                      <Label>מזהה עסקה</Label>
                      <Input value={booking.paymentDetails.transactionId} disabled />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  פירוט כספי מלא (Snapshot)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    חשוב לדעת
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    המחירים כאן הם snapshot מרגע ההזמנה ולא ישתנו גם אם מחירי הטיפולים יתעדכנו
                    במערכת
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">פירוט מחירים</h4>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>מחיר בסיס טיפול:</span>
                        <span className="font-medium">₪{basePrice}</span>
                      </div>

                      {priceDetails.surcharges && priceDetails.surcharges.length > 0 && (
                        <>
                          <Separator />
                          <div className="text-sm text-gray-600">תוספות:</div>
                          {priceDetails.surcharges.map((surcharge, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm text-orange-600"
                            >
                              <span>{surcharge.description}:</span>
                              <span>+₪{surcharge.amount}</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-medium text-orange-600">
                            <span>סה"כ תוספות:</span>
                            <span>+₪{surcharges}</span>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="flex justify-between font-medium">
                        <span>סכום לפני הנחות:</span>
                        <span>₪{basePrice + surcharges}</span>
                      </div>

                      {discounts > 0 && (
                        <>
                          <div className="flex justify-between text-green-600">
                            <span>הנחות ומימושים:</span>
                            <span>-₪{discounts}</span>
                          </div>
                        </>
                      )}

                      <Separator className="border-2" />

                      <div className="flex justify-between text-lg font-bold">
                        <span>סה"כ לתשלום:</span>
                        <span className="text-purple-600">₪{finalAmount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">פירוט רווחים</h4>

                    <div className="space-y-3">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-green-800">שולם בפועל</div>
                        <div className="text-lg font-bold text-green-600">₪{finalAmount}</div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-blue-800">תשלום למטפל (אומדן)</div>
                        <div className="text-lg font-bold text-blue-600">
                          ₪{(finalAmount * 0.7).toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-600">70% מהסכום הסופי</div>
                      </div>

                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-purple-800">עמלת משרד (אומדן)</div>
                        <div className="text-lg font-bold text-purple-600">
                          ₪{(finalAmount * 0.3).toFixed(2)}
                        </div>
                        <div className="text-xs text-purple-600">30% מהסכום הסופי</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Professional Management Tab */}
          <TabsContent value="professional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  ניהול מטפל
                </CardTitle>
              </CardHeader>
              <CardContent>
                {professional ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-green-800">{professional.name}</div>
                          <div className="text-sm text-green-600">
                            מטפל משויך • {professional.gender === "male" ? "זכר" : "נקבה"}
                          </div>
                        </div>
                      </div>

                      {professional.phone && (
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <Phone className="h-4 w-4" />
                          <span>{formatPhoneForDisplay(professional.phone || "")}</span>
                        </div>
                      )}
                    </div>

                    <Button variant="outline" className="w-full">
                      החלף מטפל
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserCheck className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">טרם שויך מטפל</h3>
                      <p className="text-sm text-gray-500 mb-4">יש לשייך מטפל מתאים להזמנה זו</p>
                    </div>

                    <div className="space-y-2">
                      <Label>בחר מטפל מהרשימה</Label>
                      <Select
                        onValueChange={async value => {
                          try {
                            const result = await assignProfessionalToBooking(
                              booking._id.toString?.() || '',
                              value
                            )
                            if (result.success) {
                              toast.success("המטפל שויך בהצלחה")
                              queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
                              // Refresh page
                              window.location.reload()
                            } else {
                              toast.error(result.error || "שגיאה בשיוך המטפל")
                            }
                          } catch (error) {
                            toast.error("שגיאה בשיוך המטפל")
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מטפל..." />
                        </SelectTrigger>
                        <SelectContent>
                          {professionalsData?.professionals?.map((prof: any) => (
                            <SelectItem key={prof._id} value={prof._id}>
                              <div className="flex items-center gap-2">
                                <span>{prof.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({prof.gender === "male" ? "זכר" : "נקבה"})
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
        </Tabs>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            סגור
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "שומר..." : "שמור שינויים"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
