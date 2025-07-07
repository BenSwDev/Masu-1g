"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Textarea } from "@/components/common/ui/textarea"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { AlertTriangle, Check, X, Navigation, CheckCircle, MapPin, Calendar, Clock, User, Phone, CreditCard, Star } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { 
  professionalAcceptBooking, 
  professionalMarkEnRoute, 
  professionalMarkCompleted 
} from "@/actions/booking-actions"
import type { PopulatedBooking } from "@/types/booking"

interface BookingResponseCardProps {
  booking: PopulatedBooking
  professionalId: string
  onResponseSubmitted?: () => void
  mode: "notification" | "assigned" | "completed"
}

/**
 * קומפוננטה לטיפול במענה מטפל להזמנה
 * תומכת בכל סוגי המענה: קבלה, דחייה, בדרך, השלמה
 */
export default function BookingResponseCard({
  booking,
  professionalId,
  onResponseSubmitted,
  mode
}: BookingResponseCardProps) {
  const [isResponding, setIsResponding] = useState(false)
  const [responseType, setResponseType] = useState<"accept" | "decline" | "on_way" | "complete" | null>(null)
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")
  const [treatmentRating, setTreatmentRating] = useState<number>(5)
  const [clientBehaviorNotes, setClientBehaviorNotes] = useState("")
  const [showResponseDialog, setShowResponseDialog] = useState(false)

  const handleResponse = async (action: "accept" | "decline" | "on_way" | "complete") => {
    setIsResponding(true)
    setResponseType(action)

    try {
      let result: { success: boolean; error?: string; message?: string } = { success: false }

      const bookingId = booking._id.toString()

      switch (action) {
        case "accept":
          result = await professionalAcceptBooking(bookingId)
          break
        case "decline":
          // For decline, we would need a separate action - for now, show error
          result = { success: false, error: "דחיית הזמנה אינה זמינה כעת" }
          break
        case "on_way":
          result = await professionalMarkEnRoute(bookingId)
          break
        case "complete":
          result = await professionalMarkCompleted(bookingId)
          break
        default:
          result = { success: false, error: "פעולה לא מוכרת" }
      }

      if (result.success) {
        setShowResponseDialog(false)
        onResponseSubmitted?.()
      } else {
        alert(`שגיאה: ${result.error || result.message || "שגיאה לא ידועה"}`)
      }
    } catch (error) {
      alert("שגיאה בשליחת התגובה")
    } finally {
      setIsResponding(false)
      setResponseType(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "pending_professional": { variant: "secondary" as const, text: "ממתין למטפל", icon: Clock },
      "confirmed": { variant: "default" as const, text: "מאושר", icon: Check },
      "on_way": { variant: "destructive" as const, text: "בדרך", icon: Navigation },
      "completed": { variant: "default" as const, text: "הושלם", icon: CheckCircle },
      "pending_review": { variant: "secondary" as const, text: "ממתין לחוות דעת", icon: Star },
      "cancelled": { variant: "destructive" as const, text: "בוטל", icon: X },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      variant: "secondary" as const, 
      text: status, 
      icon: AlertTriangle 
    }

    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getAvailableActions = () => {
    switch (mode) {
      case "notification":
        return booking.status === "pending_professional" ? ["accept", "decline"] : []
      case "assigned":
        return booking.status === "confirmed" ? ["on_way"] : 
               booking.status === "on_way" ? ["complete"] : []
      case "completed":
        return []
      default:
        return []
    }
  }

  const getActionButton = (action: string) => {
    const actionConfig = {
      accept: { 
        label: "קבל הזמנה", 
        icon: Check, 
        variant: "default" as const,
        description: "אישור קבלת ההזמנה"
      },
      decline: { 
        label: "דחה הזמנה", 
        icon: X, 
        variant: "destructive" as const,
        description: "דחיית ההזמנה עם סיבה"
      },
      on_way: { 
        label: "יצאתי לטיפול", 
        icon: Navigation, 
        variant: "secondary" as const,
        description: "עדכון שיצאת לטיפול"
      },
      complete: { 
        label: "השלמתי טיפול", 
        icon: CheckCircle, 
        variant: "default" as const,
        description: "סיום הטיפול"
      }
    }

    const config = actionConfig[action as keyof typeof actionConfig]
    if (!config) return null

    const Icon = config.icon

    return (
      <Dialog key={action} open={showResponseDialog && responseType === action} onOpenChange={(open) => {
        setShowResponseDialog(open)
        if (open) setResponseType(action as any)
      }}>
        <DialogTrigger asChild>
          <Button 
            variant={config.variant}
            className="flex items-center gap-2"
            disabled={isResponding}
          >
            <Icon className="w-4 h-4" />
            {config.label}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {config.label}
            </DialogTitle>
            <DialogDescription>
              {config.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {action === "decline" && (
              <div>
                <Label htmlFor="reason">סיבת הדחייה (חובה)</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סיבה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_available">לא זמין בזמן הנדרש</SelectItem>
                    <SelectItem value="too_far">המיקום רחוק מדי</SelectItem>
                    <SelectItem value="not_qualified">לא מתמחה בטיפול זה</SelectItem>
                    <SelectItem value="personal_reason">סיבה אישית</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {action === "on_way" && (
              <div>
                <Label htmlFor="arrival">זמן הגעה משוער</Label>
                <Input
                  id="arrival"
                  type="datetime-local"
                  value={estimatedArrivalTime}
                  onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                />
              </div>
            )}

            {action === "complete" && (
              <>
                <div>
                  <Label htmlFor="completion-notes">פרטי הטיפול</Label>
                  <Textarea
                    id="completion-notes"
                    placeholder="תאר את הטיפול שבוצע..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="treatment-rating">דירוג איכות הטיפול</Label>
                  <Select value={treatmentRating.toString()} onValueChange={(value) => setTreatmentRating(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">מעולה (5/5)</SelectItem>
                      <SelectItem value="4">טוב מאוד (4/5)</SelectItem>
                      <SelectItem value="3">טוב (3/5)</SelectItem>
                      <SelectItem value="2">בסדר (2/5)</SelectItem>
                      <SelectItem value="1">לא מספק (1/5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="client-behavior">הערות על הלקוח (אופציונלי)</Label>
                  <Textarea
                    id="client-behavior"
                    placeholder="הערות על התנהגות הלקוח, שיתוף פעולה וכו'"
                    value={clientBehaviorNotes}
                    onChange={(e) => setClientBehaviorNotes(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="notes">הערות נוספות (אופציונלי)</Label>
              <Textarea
                id="notes"
                placeholder="הערות נוספות..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowResponseDialog(false)}
              disabled={isResponding}
            >
              ביטול
            </Button>
            <Button 
              onClick={() => handleResponse(action as any)}
              disabled={isResponding || (action === "decline" && !reason)}
              variant={config.variant}
            >
              {isResponding ? "שולח..." : config.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const availableActions = getAvailableActions()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {booking.treatmentId?.name || "טיפול לא מוגדר"}
          </CardTitle>
          {getStatusBadge(booking.status)}
        </div>
        <div className="text-sm text-muted-foreground">
          הזמנה #{booking.bookingNumber}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* פרטי הזמנה */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {booking.bookingDateTime ? 
                format(new Date(booking.bookingDateTime), "PPP 'בשעה' HH:mm", { locale: he }) :
                "תאריך לא מוגדר"
              }
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {booking.bookingAddressSnapshot?.fullAddress || "כתובת לא מוגדרת"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {(booking.userId as any)?.name || "לקוח לא מוגדר"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {(booking.userId as any)?.phone || "טלפון לא מוגדר"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              ₪{booking.priceDetails?.finalAmount?.toLocaleString() || "0"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              תשלום למטפל: ₪{booking.priceDetails?.totalProfessionalPayment?.toLocaleString() || "0"}
            </span>
          </div>
        </div>

        {/* הערות קיימות */}
        {booking.notes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>הערות:</strong> {booking.notes}
            </p>
          </div>
        )}

        {/* כפתורי פעולה */}
        {availableActions.length > 0 && (
          <div className="flex gap-2 pt-4 border-t">
            {availableActions.map(action => getActionButton(action))}
          </div>
        )}

        {/* הודעת מידע כשאין פעולות זמינות */}
        {availableActions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground border-t">
            {mode === "completed" ? 
              "הטיפול הושלם" : 
              "אין פעולות זמינות כעת"
            }
          </div>
        )}
      </CardContent>
    </Card>
  )
} 