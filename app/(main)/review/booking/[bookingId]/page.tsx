"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Textarea } from "@/components/common/ui/textarea"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { Star, Heart, User, Clock, MapPin, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface BookingData {
  _id: string
  bookingNumber: string
  treatmentName: string
  professionalName: string
  bookingDateTime: Date
  address: string
  status: string
  canReview: boolean
  existingReview?: {
    rating: number
    comment: string
    createdAt: Date
  }
}

export default function ReviewBookingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const bookingId = params.bookingId as string
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (bookingId) {
      fetchBookingData()
    }
  }, [bookingId])

  const fetchBookingData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reviews/booking/${bookingId}`)
      const data = await response.json()
      
      if (data.success) {
        setBooking(data.booking)
        // If there's an existing review, populate the form
        if (data.booking.existingReview) {
          setRating(data.booking.existingReview.rating)
          setComment(data.booking.existingReview.comment || "")
          setSubmitted(true)
        }
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: data.error || "לא ניתן לטעון את פרטי ההזמנה"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בחיבור לשרת"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נא לבחור דירוג"
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/reviews/booking/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim()
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSubmitted(true)
        toast({
          title: "תודה!",
          description: "חוות הדעת נשמרה בהצלחה"
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: data.error || "שגיאה בשליחת חוות הדעת"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בחיבור לשרת"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-8 h-8 cursor-pointer transition-colors ${
              star <= (hoverRating || rating) 
                ? "text-yellow-400 fill-yellow-400" 
                : "text-gray-300"
            }`}
            onMouseEnter={() => !submitted && setHoverRating(star)}
            onMouseLeave={() => !submitted && setHoverRating(0)}
            onClick={() => !submitted && setRating(star)}
          />
        ))}
      </div>
    )
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

  const formatDate = (date: Date) => {
    return format(new Date(date), "EEEE, dd/MM/yyyy בשעה HH:mm", { locale: he })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">הזמנה לא נמצאה</h2>
                <p className="text-gray-600 mb-4">ההזמנה שחיפשת לא נמצאה במערכת</p>
                <Button onClick={() => router.push('/')}>
                  חזור לעמוד הבית
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!booking.canReview) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">לא ניתן לכתוב חוות דעת</h2>
                <p className="text-gray-600 mb-4">
                  {booking.status === 'completed' 
                    ? "כבר נכתבה חוות דעת עבור הזמנה זו"
                    : "ניתן לכתוב חוות דעת רק עבור הזמנות שהושלמו"
                  }
                </p>
                <Button onClick={() => router.push('/')}>
                  חזור לעמוד הבית
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Heart className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">תודה רבה!</h2>
                <p className="text-gray-600 mb-6">
                  חוות הדעת שלך נשמרה בהצלחה וחשובה לנו מאוד
                </p>
                
                {/* Show the submitted review */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-center mb-2">
                    {renderStars()}
                    <span className="mr-2 text-gray-600">({getRatingText(rating)})</span>
                  </div>
                  {comment && (
                    <p className="text-gray-700 italic">"{comment}"</p>
                  )}
                </div>
                
                <Button onClick={() => router.push('/')}>
                  חזור לעמוד הבית
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">חוות דעת</h1>
          <p className="text-gray-600">נשמח לשמוע על החוויה שלך</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              פרטי הטיפול
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">טיפול:</span>
                <span>{booking.treatmentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">מטפל:</span>
                <span>{booking.professionalName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="font-medium">תאריך:</span>
                <span>{formatDate(booking.bookingDateTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">כתובת:</span>
                <span>{booking.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">מספר הזמנה:</span>
                <span className="text-blue-600">#{booking.bookingNumber}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>איך היה הטיפול?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Label className="text-lg font-medium mb-4 block">
                דירוג הטיפול
              </Label>
              {renderStars()}
              {(hoverRating || rating) > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {getRatingText(hoverRating || rating)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="comment" className="block mb-2">
                תגובה (אופציונלי)
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="שתף אותנו בחוויה שלך..."
                rows={4}
                maxLength={1000}
              />
              <p className="text-sm text-gray-500 mt-1">
                {comment.length}/1000 תווים
              </p>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  שולח...
                </>
              ) : (
                "שלח חוות דעת"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 