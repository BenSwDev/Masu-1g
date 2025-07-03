"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Label } from "@/components/common/ui/label"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Textarea } from "@/components/common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { 
  Edit3, 
  Save, 
  X, 
  Calendar, 
  User, 
  FileText, 
  Clock,
  MapPin
} from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"
import type { BookingStatus } from "@/lib/db/models/booking"

interface BookingDetailsTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingDetailsTab({ booking, onUpdate }: BookingDetailsTabProps) {
  const [isEditing, setIsEditing] = useState(false)

  const formatDate = (date?: Date | string) => {
    if (!date) return "לא צוין"
    const d = new Date(date)
    return d.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusText = (status: BookingStatus) => {
    const statusMap = {
      "pending_payment": "ממתין לתשלום",
      "pending_professional": "ממתין לשיוך מטפל", 
      "confirmed": "מאושר",
      "completed": "הושלם",
      "cancelled": "בוטל",
      "refunded": "הוחזר"
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const getStatusVariant = (status: BookingStatus) => {
    const variantMap = {
      "pending_payment": "secondary" as const,
      "pending_professional": "default" as const,
      "confirmed": "default" as const, 
      "completed": "default" as const,
      "cancelled": "destructive" as const,
      "refunded": "destructive" as const
    }
    return variantMap[status as keyof typeof variantMap] || "secondary" as const
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">פרטי הזמנה</h3>
        <Button
          variant={isEditing ? "destructive" : "outline"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <>
              <X className="w-4 h-4 mr-2" />
              ביטול
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4 mr-2" />
              עריכה
            </>
          )}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            מידע בסיסי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Booking Number */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">מספר הזמנה</Label>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono">
                  {booking.bookingNumber ? `#${booking.bookingNumber}` : "ללא מספר"}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">סטטוס</Label>
              {isEditing ? (
                <Select
                  value={booking.status}
                  onValueChange={(value: BookingStatus) => onUpdate({ status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
                    <SelectItem value="pending_professional">ממתין לשיוך מטפל</SelectItem>
                    <SelectItem value="confirmed">מאושר</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                    <SelectItem value="refunded">הוחזר</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={getStatusVariant(booking.status)}>
                  {getStatusText(booking.status)}
                </Badge>
              )}
            </div>

            {/* Created At */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">תאריך יצירה</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(booking.createdAt)}</span>
              </div>
            </div>

            {/* Updated At */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">עדכון אחרון</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(booking.updatedAt)}</span>
              </div>
            </div>

            {/* Treatment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">טיפול</Label>
              <div className="flex items-center gap-2">
                <span>{booking.treatmentId?.name || "לא צוין"}</span>
              </div>
            </div>

            {/* Professional */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">מטפל</Label>
              {booking.professionalId ? (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span>
                    {typeof booking.professionalId === 'object' 
                      ? booking.professionalId.name 
                      : "מטפל שויך"}
                  </span>
                </div>
              ) : (
                <Badge variant="secondary">ללא מטפל</Badge>
              )}
            </div>

            {/* Booking Time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">זמן הטיפול</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(booking.bookingDateTime)}</span>
              </div>
            </div>

            {/* Location */}
            {booking.bookingAddressSnapshot && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">מיקום</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {[
                      booking.bookingAddressSnapshot.street,
                      booking.bookingAddressSnapshot.streetNumber,
                      booking.bookingAddressSnapshot.city
                    ].filter(Boolean).join(" ")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(booking.notes || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle>הערות נוספות</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={booking.notes || ""}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="הערות נוספות על ההזמנה..."
                rows={4}
                className="w-full"
              />
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {booking.notes || "אין הערות נוספות"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gift Details */}
      {booking.isGift && (
        <Card>
          <CardHeader>
            <CardTitle>פרטי מתנה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>ברכת מתנה</Label>
              <p className="text-muted-foreground">
                {booking.giftGreeting || "ללא ברכה"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 