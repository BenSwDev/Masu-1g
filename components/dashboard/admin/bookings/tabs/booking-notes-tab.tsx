"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FileText, Edit, Save, X } from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"

interface BookingNotesTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingNotesTab({ booking, onUpdate }: BookingNotesTabProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [tempNotes, setTempNotes] = useState(booking.notes || "")

  const handleSave = () => {
    onUpdate({ notes: tempNotes })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempNotes(booking.notes || "")
    setIsEditing(false)
  }

  const hasNotes = booking.notes && booking.notes.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Customer Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            הערות לקוח
          </CardTitle>
          <div className="flex gap-2">
            {!hasNotes && (
              <Badge variant="secondary" className="text-xs">
                אין הערות
              </Badge>
            )}
            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  ביטול
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  שמירה
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                עריכה
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">הערות הלקוח</Label>
              <Textarea
                value={tempNotes}
                onChange={e => setTempNotes(e.target.value)}
                placeholder="הזן הערות הלקוח כאן..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">תווים: {tempNotes.length}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">הערות הלקוח</Label>
              {hasNotes ? (
                <div className="p-4 border rounded-lg bg-gray-50 min-h-[120px]">
                  <p className="whitespace-pre-wrap text-sm">{booking.notes}</p>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-gray-50 min-h-[120px] flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">לא הוזנו הערות עבור הזמנה זו</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Notes */}
      {booking.bookingAddressSnapshot?.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              הערות כתובת
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm font-medium">הערות נוספות לכתובת</Label>
              <div className="p-4 border rounded-lg bg-blue-50">
                <p className="whitespace-pre-wrap text-sm">
                  {booking.bookingAddressSnapshot.notes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Instructions */}
      {booking.bookingAddressSnapshot?.otherInstructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              הוראות נוספות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm font-medium">הוראות מיוחדות</Label>
              <div className="p-4 border rounded-lg bg-amber-50">
                <p className="whitespace-pre-wrap text-sm">
                  {booking.bookingAddressSnapshot.otherInstructions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gift Greeting (if it's a gift) */}
      {booking.isGift && booking.giftGreeting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              ברכת מתנה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm font-medium">הודעת ברכה למתנה</Label>
              <div className="p-4 border rounded-lg bg-pink-50">
                <p className="whitespace-pre-wrap text-sm">{booking.giftGreeting}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">הנחיות לעריכת הערות</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-1 list-disc list-inside">
            <li>הערות הלקוח מכילות מידע שהלקוח סיפק בעת ההזמנה</li>
            <li>ניתן לערוך הערות אלו במידת הצורך</li>
            <li>הערות אלו יעברו למטפל המשויך</li>
            <li>הקפד על דיסקרציה ופרטיות</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
