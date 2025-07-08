"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Label } from "@/components/common/ui/label"
import { Textarea } from "@/components/common/ui/textarea"
import { useToast } from "@/components/common/ui/use-toast"
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
  Send,
  Loader2
} from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"
import type { PopulatedReview } from "@/types/review"

interface BookingReviewTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingReviewTab({ booking, onUpdate }: BookingReviewTabProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [review, setReview] = useState<PopulatedReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [professionalResponse, setProfessionalResponse] = useState("")
  const [savingResponse, setSavingResponse] = useState(false)

  useEffect(() => {
    fetchReview()
  }, [booking._id])

  const fetchReview = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reviews/booking/${booking._id}`)
      const data = await response.json()
      
      if (data.success && data.booking.existingReview) {
        setReview(data.booking.existingReview)
        setProfessionalResponse(data.booking.existingReview.professionalResponse || "")
      } else {
        setReview(null)
      }
    } catch (error) {
      console.error("Error fetching review:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בטעינת חוות הדעת"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendReviewRequest = async () => {
    try {
      setSendingRequest(true)
      const response = await fetch(`/api/admin/bookings/${booking._id}/send-review-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sms: true,
          email: true
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "נשלח בהצלחה!",
          description: "בקשה לחוות דעת נשלחה ללקוח"
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בשליחת בקשה לחוות דעת"
        })
      }
    } catch (error) {
      console.error("Error sending review request:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בשליחת בקשה לחוות דעת"
      })
    } finally {
      setSendingRequest(false)
    }
  }

  const handleSaveProfessionalResponse = async () => {
    if (!review || !professionalResponse.trim()) return

    try {
      setSavingResponse(true)
      // This would need to be implemented in review-actions.ts
      const response = await fetch(`/api/reviews/${review._id}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professionalResponse: professionalResponse.trim()
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "נשמר בהצלחה!",
          description: "תגובת המטפל נשמרה"
        })
        await fetchReview() // Refresh review data
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: data.error || "שגיאה בשמירת התגובה"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בשמירת התגובה"
      })
    } finally {
      setSavingResponse(false)
    }
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return "לא צוין"
    return format(new Date(date), "dd/MM/yyyy בשעה HH:mm", { locale: he })
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ))
  }

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return "גרוע"
      case 2: return "לא טוב"
      case 3: return "בסדר"
      case 4: return "טוב"
      case 5: return "מעולה"
      default: return ""
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Review Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            סטטוס חוות דעת
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Label className="text-sm font-medium text-blue-800">חוות דעת לקוח</Label>
              <p className="text-lg font-semibold mt-1">
                {review ? "קיימת" : "לא קיימת"}
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Label className="text-sm font-medium text-green-800">תגובת מטפל</Label>
              <p className="text-lg font-semibold mt-1">
                {review?.professionalResponse ? "קיימת" : "לא קיימת"}
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Label className="text-sm font-medium text-purple-800">דירוג כללי</Label>
              <div className="flex justify-center mt-1">
                {review?.rating ? (
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                    <span className="text-sm font-semibold ml-1">
                      ({review.rating}/5)
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-semibold">לא דורג</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            {booking.status === 'completed' && !review && (
              <Button 
                onClick={handleSendReviewRequest}
                disabled={sendingRequest}
                size="sm"
              >
                {sendingRequest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    שלח בקשה לחוות דעת
                  </>
                )}
              </Button>
            )}

            {booking.status !== 'completed' && (
              <div className="text-sm text-muted-foreground">
                ניתן לשלוח בקשה לחוות דעת רק עבור הזמנות שהושלמו
              </div>
            )}

            {review && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                חוות דעת התקבלה
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Review */}
      {review && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              חוות דעת הלקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Rating */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">דירוג</Label>
                  <div className="flex items-center gap-2">
                    {renderStars(review.rating)}
                    <span className="text-lg font-semibold">
                      {review.rating}/5
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({getRatingText(review.rating)})
                    </span>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  פעיל
                </Badge>
              </div>

              {/* Review Text */}
              {review.comment && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">תוכן חוות הדעת</Label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  </div>
                </div>
              )}

              {/* Review Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תאריך חוות דעת</Label>
                  <p>{formatDate(review.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">שם הלקוח</Label>
                  <p>{booking.recipientName || booking.userId?.name || "לא צוין"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Response */}
      {review && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              תגובת המטפל
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {review.professionalResponse ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">תגובה קיימת</Label>
                  <div className="p-4 bg-blue-50 rounded-lg border">
                    <p className="text-sm whitespace-pre-wrap">
                      {review.professionalResponse}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">עריכת תגובה</Label>
                  <Textarea
                    value={professionalResponse}
                    onChange={(e) => setProfessionalResponse(e.target.value)}
                    placeholder="כתוב תגובה חדשה או ערוך את הקיימת..."
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {professionalResponse.length}/1000 תווים
                    </p>
                    <Button 
                      onClick={handleSaveProfessionalResponse}
                      disabled={savingResponse || !professionalResponse.trim() || professionalResponse === review.professionalResponse}
                      size="sm"
                    >
                      {savingResponse ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          שומר...
                        </>
                      ) : (
                        "שמור תגובה"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed">
                  <MessageSquare className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    המטפל עדיין לא הגיב לחוות הדעת
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">הוסף תגובה מטעם המטפל</Label>
                  <Textarea
                    value={professionalResponse}
                    onChange={(e) => setProfessionalResponse(e.target.value)}
                    placeholder="כתוב תגובה מטעם המטפל..."
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {professionalResponse.length}/1000 תווים
                    </p>
                    <Button 
                      onClick={handleSaveProfessionalResponse}
                      disabled={savingResponse || !professionalResponse.trim()}
                      size="sm"
                    >
                      {savingResponse ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          שומר...
                        </>
                      ) : (
                        "שמור תגובה"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Review State */}
      {!review && booking.status === 'completed' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">אין חוות דעת עדיין</h3>
              <p className="text-sm text-muted-foreground mb-4">
                הטיפול הושלם אך הלקוח עדיין לא השאיר חוות דעת
              </p>
              <Button 
                onClick={handleSendReviewRequest}
                disabled={sendingRequest}
                variant="outline"
              >
                {sendingRequest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    שלח תזכורת לחוות דעת
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!review && booking.status !== 'completed' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed">
              <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">הטיפול עדיין לא הושלם</h3>
              <p className="text-sm text-muted-foreground">
                חוות דעת תהיה זמינה לאחר השלמת הטיפול
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 