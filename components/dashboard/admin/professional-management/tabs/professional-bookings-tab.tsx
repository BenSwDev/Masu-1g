"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Separator } from "@/components/common/ui/separator"
import { Calendar, Clock, MapPin, User, Phone, Mail, CreditCard, UserCheck, UserX, CheckCircle, XCircle, AlertCircle, DollarSign } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import type { Professional } from "@/lib/types/professional"
import type { PopulatedBooking } from "@/types/booking"

interface ProfessionalBookingsTabProps {
  professional: Professional
  onUpdate?: (data: Partial<Professional>) => void
}

interface BookingCardProps {
  booking: PopulatedBooking
  type: "assigned" | "potential"
  onAssign?: (bookingId: string) => void
  onUnassign?: (bookingId: string) => void
  assigningBooking?: string | null
  unassigningBooking?: string | null
  professional: Professional
}

interface ProfessionalMatchInfoProps {
  booking: PopulatedBooking
  professional: Professional
}

export default function ProfessionalBookingsTab({ 
  professional, 
  onUpdate 
}: ProfessionalBookingsTabProps) {
  const { toast } = useToast()
  const [assignedBookings, setAssignedBookings] = useState<PopulatedBooking[]>([])
  const [potentialBookings, setPotentialBookings] = useState<PopulatedBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningBooking, setAssigningBooking] = useState<string | null>(null)
  const [unassigningBooking, setUnassigningBooking] = useState<string | null>(null)

  // Fetch bookings
  useEffect(() => {
    fetchBookings()
  }, [professional._id])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      
      // Fetch assigned bookings
      const assignedResponse = await fetch(`/api/admin/bookings?professional=${professional._id}`)
      const assignedData = await assignedResponse.json()
      
      // Fetch potential bookings (unassigned bookings that match professional criteria)
      const potentialResponse = await fetch(`/api/admin/bookings/potential?professionalId=${professional._id}`)
      const potentialData = await potentialResponse.json()
      
      if (assignedData.success) {
        setAssignedBookings(assignedData.bookings || [])
      } else {
        console.error("Failed to fetch assigned bookings:", assignedData.error)
      }
      
      if (potentialData.success) {
        setPotentialBookings(potentialData.bookings || [])
      } else {
        console.error("Failed to fetch potential bookings:", potentialData.error)
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת ההזמנות"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssignBooking = async (bookingId: string) => {
    try {
      setAssigningBooking(bookingId)
      
      const response = await fetch(`/api/admin/bookings/${bookingId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalId: professional._id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "הצלחה",
          description: "ההזמנה שוייכה למטפל בהצלחה"
        })
        await fetchBookings() // Refresh bookings
      } else {
        throw new Error(data.error || "שגיאה בשיוך ההזמנה")
      }
    } catch (error) {
      console.error("Error assigning booking:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error instanceof Error ? error.message : "אירעה שגיאה בשיוך ההזמנה"
      })
    } finally {
      setAssigningBooking(null)
    }
  }

  const handleUnassignBooking = async (bookingId: string) => {
    try {
      setUnassigningBooking(bookingId)
      
      const response = await fetch(`/api/admin/bookings/${bookingId}/unassign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "הצלחה",
          description: "ההזמנה בוטלה מהמטפל בהצלחה"
        })
        await fetchBookings() // Refresh bookings
      } else {
        throw new Error(data.error || "שגיאה בביטול שיוך ההזמנה")
      }
    } catch (error) {
      console.error("Error unassigning booking:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error instanceof Error ? error.message : "אירעה שגיאה בביטול שיוך ההזמנה"
      })
    } finally {
      setUnassigningBooking(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">הזמנות המטפל</h3>
        <p className="text-sm text-muted-foreground">
          ניהול הזמנות משוייכות והזמנות פוטנציאליות למטפל
        </p>
      </div>

      <Tabs defaultValue="assigned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            הזמנות משוייכות ({assignedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="potential" className="flex items-center gap-2">
            <UserX className="w-4 h-4" />
            הזמנות פוטנציאליות ({potentialBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                הזמנות משוייכות למטפל
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>אין הזמנות משוייכות למטפל</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedBookings.map((booking) => (
                                         <BookingCard
                       key={booking._id}
                       booking={booking}
                       type="assigned"
                       onUnassign={handleUnassignBooking}
                       assigningBooking={assigningBooking}
                       unassigningBooking={unassigningBooking}
                       professional={professional}
                     />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="potential" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5" />
                הזמנות פוטנציאליות
              </CardTitle>
            </CardHeader>
            <CardContent>
              {potentialBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>אין הזמנות פוטנציאליות למטפל</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {potentialBookings.map((booking) => (
                                         <BookingCard
                       key={booking._id}
                       booking={booking}
                       type="potential"
                       onAssign={handleAssignBooking}
                       assigningBooking={assigningBooking}
                       unassigningBooking={unassigningBooking}
                       professional={professional}
                     />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BookingCard({ booking, type, onAssign, onUnassign, assigningBooking, unassigningBooking, professional }: BookingCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_payment: { variant: "secondary" as const, text: "ממתין לתשלום", color: "bg-yellow-100 text-yellow-800" },
      pending_professional: { variant: "default" as const, text: "ממתין לשיוך מטפל", color: "bg-orange-100 text-orange-800" },
      confirmed: { variant: "default" as const, text: "מאושר", color: "bg-green-100 text-green-800" },
      completed: { variant: "default" as const, text: "הושלם", color: "bg-green-100 text-green-800" },
      cancelled: { variant: "destructive" as const, text: "בוטל", color: "bg-red-100 text-red-800" },
      refunded: { variant: "destructive" as const, text: "הוחזר", color: "bg-red-100 text-red-800" }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    return (
      <Badge variant={config.variant} className={config.color}>
        {config.text}
      </Badge>
    )
  }

  const formatDate = (date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      const day = dateObj.getDate().toString().padStart(2, '0')
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
      const year = dateObj.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return "-"
    }
  }

  const formatTime = (date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      const hours = dateObj.getHours().toString().padStart(2, '0')
      const minutes = dateObj.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch {
      return "-"
    }
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-lg font-bold text-blue-900">
                #{booking.bookingNumber}
              </div>
              <div className="text-xs text-blue-600">
                מספר הזמנה
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getStatusBadge(booking.status)}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(booking.bookingDateTime)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(booking.bookingDateTime)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {type === "potential" && onAssign && (
              <Button
                size="sm"
                onClick={() => onAssign(booking._id)}
                disabled={assigningBooking === booking._id}
                className="flex items-center gap-1"
              >
                <UserCheck className="w-4 h-4" />
                {assigningBooking === booking._id ? "משייך..." : "שיוך למטפל"}
              </Button>
            )}
            {type === "assigned" && onUnassign && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUnassign(booking._id)}
                disabled={unassigningBooking === booking._id}
                className="flex items-center gap-1"
              >
                <UserX className="w-4 h-4" />
                {unassigningBooking === booking._id ? "מבטל..." : "בטל שיוך"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Info */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">פרטי לקוח</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{booking.recipientName || booking.bookedByUserName || "-"}</span>
              </div>
              {(booking.recipientPhone || booking.bookedByUserPhone) && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{formatPhoneForDisplay(booking.recipientPhone || booking.bookedByUserPhone || "")}</span>
                </div>
              )}
              {(booking.recipientEmail || booking.bookedByUserEmail) && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.recipientEmail || booking.bookedByUserEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Treatment & Location Info */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">פרטי טיפול וכתובת</h4>
            <div className="space-y-1 text-sm">
              <div className="font-medium text-base">
                {booking.treatmentId && typeof booking.treatmentId === 'object' ? booking.treatmentId.name : 'טיפול לא ידוע'}
              </div>
              {booking.bookingAddressSnapshot && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">{booking.bookingAddressSnapshot.city}</div>
                    <div className="text-xs text-muted-foreground">
                      {booking.bookingAddressSnapshot.fullAddress}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Professional Match Info */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">התאמה למטפל</h4>
            <div className="space-y-1 text-sm">
              <ProfessionalMatchInfo booking={booking} professional={professional} />
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <Separator className="my-3" />
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium text-sm mb-2">סיכום כספי</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>עלות טיפול:</span>
              <span className="font-medium">₪{booking.priceDetails.finalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span>תשלום למטפל:</span>
              <span className="font-medium text-green-600">
                ₪{booking.priceDetails.totalProfessionalPayment || 
                  professional.treatments.find(t => {
                    if (!booking.treatmentId) return false
                    const bookingTreatmentId = typeof booking.treatmentId === 'object' && booking.treatmentId._id
                      ? booking.treatmentId._id.toString() 
                      : typeof booking.treatmentId === 'string' ? booking.treatmentId : null
                    return bookingTreatmentId && t.treatmentId.toString() === bookingTreatmentId
                  })?.professionalPrice || 0}
              </span>
            </div>
          </div>
        </div>

        {booking.notes && (
          <>
            <Separator className="my-3" />
            <div>
              <h4 className="font-medium text-sm mb-1">הערות</h4>
              <p className="text-sm text-muted-foreground">{booking.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ProfessionalMatchInfo({ booking, professional }: ProfessionalMatchInfoProps) {
  // Get professional user data
  const professionalUser = typeof professional.userId === 'object' ? professional.userId : null

  // Check gender match
  const genderMatch = !booking.therapistGenderPreference || 
    booking.therapistGenderPreference === "any" || 
    (professionalUser && professionalUser.gender === booking.therapistGenderPreference)

  // Check treatment match
  const treatmentId = (() => {
    if (!booking.treatmentId) return null
    if (typeof booking.treatmentId === 'object' && booking.treatmentId._id) {
      return booking.treatmentId._id.toString()
    }
    if (typeof booking.treatmentId === 'string') {
      return booking.treatmentId
    }
    return null
  })()

  const treatmentMatch = treatmentId ? professional.treatments.some(treatment => 
    treatment.treatmentId.toString() === treatmentId
  ) : false

  // Get professional payment for this treatment
  const professionalTreatment = treatmentId ? professional.treatments.find(treatment => 
    treatment.treatmentId.toString() === treatmentId
  ) : null

  // Check city coverage
  const bookingCity = booking.bookingAddressSnapshot?.city
  const cityMatch = !bookingCity || professional.workAreas.some(workArea => {
    return workArea.coveredCities.some(city => 
      city.toLowerCase() === bookingCity.toLowerCase()
    )
  })

  // Calculate professional payment
  const professionalPayment = booking.priceDetails.totalProfessionalPayment || 
    professionalTreatment?.professionalPrice || 0

  return (
    <div className="space-y-2">
      {/* Gender Match */}
      <div className="flex items-center gap-2">
        {genderMatch ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
        <span className={genderMatch ? "text-green-700" : "text-red-700"}>
          מגדר: {booking.therapistGenderPreference === "any" ? "ללא העדפה" : 
            booking.therapistGenderPreference === "male" ? "זכר" : "נקבה"}
        </span>
      </div>

      {/* Treatment Match */}
      <div className="flex items-center gap-2">
        {treatmentMatch ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
        <span className={treatmentMatch ? "text-green-700" : "text-red-700"}>
          טיפול: {booking.treatmentId && typeof booking.treatmentId === 'object' ? booking.treatmentId.name : 'לא ידוע'}
        </span>
      </div>

      {/* City Coverage */}
      <div className="flex items-center gap-2">
        {cityMatch ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
        <span className={cityMatch ? "text-green-700" : "text-red-700"}>
          עיר: {bookingCity || "לא צוין"}
        </span>
      </div>

      {/* Professional Payment */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-blue-600" />
        <span className="text-blue-700 font-medium">
          תשלום למטפל: ₪{professionalPayment}
        </span>
      </div>

      {/* Treatment Cost */}
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-purple-600" />
        <span className="text-purple-700 font-medium">
          עלות טיפול: ₪{booking.priceDetails.finalAmount}
        </span>
      </div>

      {/* Match Summary */}
      <div className="mt-3 pt-2 border-t">
        {genderMatch && treatmentMatch && cityMatch ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-700 font-medium text-sm">התאמה מושלמת</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-orange-700 font-medium text-sm">התאמה חלקית</span>
          </div>
        )}
      </div>
    </div>
  )
} 