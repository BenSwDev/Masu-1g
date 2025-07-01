"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import { PhoneInput } from "@/components/common/phone-input"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  UserCheck,
  Edit,
  Users
} from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"

interface BookingCustomerTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingCustomerTab({ booking, onUpdate }: BookingCustomerTabProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)

  const formatDate = (date?: Date | string) => {
    if (!date) return "לא צוין"
    return format(new Date(date), "dd/MM/yyyy", { locale: he })
  }

  const isGuestBooking = !booking.userId

  return (
    <div className="space-y-6">
      {/* Customer Type Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            סוג לקוח
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={isGuestBooking ? "secondary" : "default"} className="text-sm">
            {isGuestBooking ? "לקוח אורח" : "משתמש רשום"}
          </Badge>
        </CardContent>
      </Card>

      {/* Booking Customer (המזמין) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            פרטי המזמין
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? "ביטול" : "עריכה"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">שם מלא</Label>
              {isEditing ? (
                <Input
                  value={booking.bookedByUserName || ""}
                  onChange={(e) => onUpdate({ bookedByUserName: e.target.value })}
                  placeholder="שם מלא"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.bookedByUserName || (typeof booking.userId === 'object' ? (booking.userId as any)?.name : '') || "לא צוין"}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">אימייל</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={booking.bookedByUserEmail || ""}
                  onChange={(e) => onUpdate({ bookedByUserEmail: e.target.value })}
                  placeholder="כתובת אימייל"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.bookedByUserEmail || (typeof booking.userId === 'object' ? (booking.userId as any)?.email : '') || "לא צוין"}</span>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">טלפון</Label>
              {isEditing ? (
                <PhoneInput
                  fullNumberValue={booking.bookedByUserPhone || ""}
                  onPhoneChange={(value) => onUpdate({ bookedByUserPhone: value })}
                  placeholder="מספר טלפון"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{formatPhoneForDisplay(booking.bookedByUserPhone || (typeof booking.userId === 'object' ? (booking.userId as any)?.phone : '') || "")}</span>
                </div>
              )}
            </div>

            {/* User ID for registered users */}
            {booking.userId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">מזהה משתמש</Label>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="font-mono">{booking.userId._id.toString()}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recipient Info (מקבל הטיפול) */}
      {booking.isBookingForSomeoneElse && (
        <>
          <Separator />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                מקבל הטיפול
              </CardTitle>
              <Badge variant="outline">
                הזמנה עבור אדם אחר
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recipient Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">שם מלא</Label>
                  {isEditing ? (
                    <Input
                      value={booking.recipientName || ""}
                      onChange={(e) => onUpdate({ recipientName: e.target.value })}
                      placeholder="שם מקבל הטיפול"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{booking.recipientName || "לא צוין"}</span>
                    </div>
                  )}
                </div>

                {/* Recipient Email */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">אימייל</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={booking.recipientEmail || ""}
                      onChange={(e) => onUpdate({ recipientEmail: e.target.value })}
                      placeholder="כתובת אימייל"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{booking.recipientEmail || "לא צוין"}</span>
                    </div>
                  )}
                </div>

                {/* Recipient Phone */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">טלפון</Label>
                  {isEditing ? (
                    <PhoneInput
                      fullNumberValue={booking.recipientPhone || ""}
                      onPhoneChange={(value) => onUpdate({ recipientPhone: value })}
                      placeholder="מספר טלפון"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{formatPhoneForDisplay(booking.recipientPhone || "")}</span>
                    </div>
                  )}
                </div>

                {/* Recipient Birth Date */}
                {booking.recipientBirthDate && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">תאריך לידה</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(booking.recipientBirthDate)}</span>
                    </div>
                  </div>
                )}

                {/* Recipient Gender */}
                {booking.recipientGender && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">מין</Label>
                    <Badge variant="outline">
                      {booking.recipientGender === "male" && "גבר"}
                      {booking.recipientGender === "female" && "אישה"}
                      {booking.recipientGender === "other" && "אחר"}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Consent Information */}
      {booking.consents && (
        <Card>
          <CardHeader>
            <CardTitle>הסכמות והתראות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">התראות לקוח</Label>
                <Badge variant="outline">
                  {booking.consents.customerAlerts === "email" && "אימייל"}
                  {booking.consents.customerAlerts === "sms" && "SMS"}
                  {booking.consents.customerAlerts === "none" && "ללא התראות"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">התראות מטופל</Label>
                <Badge variant="outline">
                  {booking.consents.patientAlerts === "email" && "אימייל"}
                  {booking.consents.patientAlerts === "sms" && "SMS"}
                  {booking.consents.patientAlerts === "none" && "ללא התראות"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">הסכמה לשיווק</Label>
                <Badge variant={booking.consents.marketingOptIn ? "default" : "secondary"}>
                  {booking.consents.marketingOptIn ? "הסכים" : "לא הסכים"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">הסכמה לתנאים</Label>
                <Badge variant={booking.consents.termsAccepted ? "default" : "destructive"}>
                  {booking.consents.termsAccepted ? "הסכים" : "לא הסכים"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 