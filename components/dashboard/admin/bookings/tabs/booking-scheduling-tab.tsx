"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { 
  Calendar,
  Clock,
  User,
  MapPin,
  Edit,
  CheckCircle,
  AlertCircle,
  Users
} from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"

interface BookingSchedulingTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingSchedulingTab({ booking, onUpdate }: BookingSchedulingTabProps) {
  const { t } = useTranslation()

  const formatDateTime = (date?: Date | string) => {
    if (!date) return "לא צוין"
    return format(new Date(date), "dd/MM/yyyy בשעה HH:mm", { locale: he })
  }

  const formatTime = (date?: Date | string) => {
    if (!date) return "לא צוין"
    return format(new Date(date), "HH:mm", { locale: he })
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return "לא צוין"
    return format(new Date(date), "dd/MM/yyyy", { locale: he })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default" className="bg-green-100 text-green-800">מאושר</Badge>
      case "pending":
        return <Badge variant="secondary">ממתין לאישור</Badge>
      case "cancelled":
        return <Badge variant="destructive">מבוטל</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">הושלם</Badge>
      case "in_progress":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">בביצוע</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDuration = () => {
    // Use treatment duration info since startTime/endTime don't exist
    if (booking.treatmentId?.defaultDurationMinutes) {
      const minutes = booking.treatmentId.defaultDurationMinutes
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      

      return `${minutes} דקות`
    }
    return "לא צוין"
  }

  return (
    <div className="space-y-6">
      {/* Booking Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            סטטוס הזמנה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">סטטוס נוכחי</Label>
            {getStatusBadge(booking.status)}
          </div>

        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            תאריך ושעה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">תאריך הטיפול</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(booking.bookingDateTime)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">שעת התחלה</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatTime(booking.bookingDateTime)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">משך הטיפול</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{getDuration()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">משך הטיפול</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{getDuration()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            שיוך מטפל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {booking.professionalId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">מטפל משויך</Label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-green-600" />
                    <span className="font-medium">
                      {typeof booking.professionalId === 'object' 
                        ? booking.professionalId.name 
                        : 'מטפל לא זמין'}
                    </span>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  משויך
                </Badge>
              </div>


            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className="text-sm font-medium">סטטוס שיוך</Label>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-600">לא שויך מטפל</span>
                </div>
              </div>
              <Badge variant="secondary">
                ממתין לשיוך
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            מיקום הטיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {booking.bookingAddressSnapshot ? (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {booking.bookingAddressSnapshot.street} {booking.bookingAddressSnapshot.streetNumber}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.bookingAddressSnapshot.city}
                  </p>
                  {booking.bookingAddressSnapshot.floor && (
                    <p className="text-sm">
                      קומה {booking.bookingAddressSnapshot.floor}
                      {booking.bookingAddressSnapshot.apartment && `, דירה ${booking.bookingAddressSnapshot.apartment}`}
                    </p>
                  )}
                </div>
              </div>

              {booking.bookingAddressSnapshot.notes && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Label className="text-sm font-medium text-blue-800">הערות כתובת</Label>
                  <p className="text-sm text-blue-700 mt-1">
                    {booking.bookingAddressSnapshot.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>כתובת לא זמינה</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            תאריכי מערכת
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">תאריך יצירה</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatDateTime(booking.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">עדכון אחרון</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatDateTime(booking.updatedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
