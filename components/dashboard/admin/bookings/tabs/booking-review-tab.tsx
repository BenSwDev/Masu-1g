"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import {
  Star,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  User,
  Stethoscope,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Flag,
} from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"

interface BookingReviewTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingReviewTab({ booking, onUpdate }: BookingReviewTabProps) {
  const { t } = useTranslation()
  const [adminNotes, setAdminNotes] = useState("")

  const formatDate = (date?: Date | string) => {
    if (!date) return "לא צוין"
    return format(new Date(date), "dd/MM/yyyy בשעה HH:mm", { locale: he })
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ))
  }

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            מאושר
          </Badge>
        )
      case "pending":
        return <Badge variant="secondary">ממתין לאישור</Badge>
      case "rejected":
        return <Badge variant="destructive">נדחה</Badge>
      case "flagged":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            מדווח
          </Badge>
        )
      default:
        return <Badge variant="secondary">לא ידוע</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Review Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            סטטוס ביקורות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Label className="text-sm font-medium text-blue-800">ביקורת לקוח</Label>
              <p className="text-lg font-semibold mt-1">
                {booking.customerReview ? "קיימת" : "לא קיימת"}
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Label className="text-sm font-medium text-green-800">ביקורת מטפל</Label>
              <p className="text-lg font-semibold mt-1">
                {booking.professionalReview ? "קיימת" : "לא קיימת"}
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Label className="text-sm font-medium text-purple-800">דירוג כללי</Label>
              <div className="flex justify-center mt-1">
                {booking.customerReview?.rating ? (
                  <div className="flex items-center gap-1">
                    {renderStars(booking.customerReview.rating)}
                    <span className="text-sm font-semibold ml-1">
                      ({booking.customerReview.rating}/5)
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-semibold">לא דורג</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Review */}
      {booking.customerReview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              ביקורת הלקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Rating */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">דירוג</Label>
                  <div className="flex items-center gap-2">
                    {renderStars(booking.customerReview.rating)}
                    <span className="text-lg font-semibold">{booking.customerReview.rating}/5</span>
                  </div>
                </div>
                {getReviewStatusBadge(booking.customerReview.status || "pending")}
              </div>

              {/* Review Text */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">טקסט הביקורת</Label>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap">
                    {booking.customerReview.comment || "לא נכתבה ביקורת טקסטואלית"}
                  </p>
                </div>
              </div>

              {/* Review Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תאריך ביקורת</Label>
                  <p>{formatDate(booking.customerReview.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">שם הלקוח</Label>
                  <p>{booking.customerReview.reviewerName || "אנונימי"}</p>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  אשר ביקורת
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  סמן כבעייתי
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Review */}
      {booking.professionalReview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              ביקורת המטפל
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Rating */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">דירוג הלקוח</Label>
                  <div className="flex items-center gap-2">
                    {renderStars(booking.professionalReview.customerRating)}
                    <span className="text-lg font-semibold">
                      {booking.professionalReview.customerRating}/5
                    </span>
                  </div>
                </div>
                {getReviewStatusBadge(booking.professionalReview.status || "pending")}
              </div>

              {/* Review Text */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">הערות המטפל</Label>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap">
                    {booking.professionalReview.comment || "לא נכתבו הערות"}
                  </p>
                </div>
              </div>

              {/* Professional Experience */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">איכות החוויה</Label>
                <div className="flex items-center gap-2">
                  {booking.professionalReview.experienceRating === "positive" && (
                    <div className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">חיובית</span>
                    </div>
                  )}
                  {booking.professionalReview.experienceRating === "negative" && (
                    <div className="flex items-center gap-1 text-red-600">
                      <ThumbsDown className="w-4 h-4" />
                      <span className="text-sm">שלילית</span>
                    </div>
                  )}
                  {booking.professionalReview.experienceRating === "neutral" && (
                    <span className="text-sm text-gray-600">נייטרלית</span>
                  )}
                </div>
              </div>

              {/* Review Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תאריך ביקורת</Label>
                  <p>{formatDate(booking.professionalReview.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">שם המטפל</Label>
                  <p>
                    {typeof booking.professionalId === "object"
                      ? booking.professionalId.name
                      : "לא זמין"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Reviews */}
      {!booking.customerReview && !booking.professionalReview && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין ביקורות עדיין</h3>
            <p className="text-sm text-gray-500">ביקורות יופיעו כאן לאחר השלמת הטיפול</p>
          </CardContent>
        </Card>
      )}

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            הערות מנהל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">הערות פנימיות</Label>
            <Textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="הוסף הערות פנימיות על ההזמנה, הביקורות או נושאים אחרים..."
              rows={4}
              className="resize-none"
            />
          </div>
          <Button
            onClick={() => {
              /* Save admin notes */
            }}
          >
            שמור הערות
          </Button>
        </CardContent>
      </Card>

      {/* Review Statistics */}
      {(booking.customerReview || booking.professionalReview) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              סטטיסטיקות ביקורות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {booking.customerReview && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">זמן מסיום טיפול לביקורת לקוח</Label>
                  <p className="text-sm">
                    {booking.endTime && booking.customerReview.createdAt
                      ? `${Math.round(
                          (new Date(booking.customerReview.createdAt).getTime() -
                            new Date(booking.endTime).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )} ימים`
                      : "לא זמין"}
                  </p>
                </div>
              )}

              {booking.professionalReview && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">זמן מסיום טיפול לביקורת מטפל</Label>
                  <p className="text-sm">
                    {booking.endTime && booking.professionalReview.createdAt
                      ? `${Math.round(
                          (new Date(booking.professionalReview.createdAt).getTime() -
                            new Date(booking.endTime).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )} ימים`
                      : "לא זמין"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">הנחיות לניהול ביקורות</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-1 list-disc list-inside">
            <li>בדוק ביקורות חדשות באופן קבוע ואשר אותן במהירות</li>
            <li>סמן ביקורות בעייתיות או לא הולמות לבדיקה נוספת</li>
            <li>השתמש בהערות המנהל לתיעוד בעיות או החלטות</li>
            <li>עקוב אחר זמני תגובה של לקוחות ומטפלים</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
