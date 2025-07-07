"use client"

import React from "react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { 
  Clock, 
  CreditCard, 
  Calendar, 
  User, 
  Navigation, 
  CheckCircle, 
  Star,
  AlertCircle,
  XCircle,
  RefreshCw,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PopulatedBooking } from "@/types/booking"

interface BookingStatusTimelineProps {
  booking: PopulatedBooking
  className?: string
}

interface TimelineStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  status: "completed" | "current" | "pending" | "skipped"
  timestamp?: Date
  details?: string
}

/**
 * רכיב טיים-ליין מפורט לסטטוס הזמנה
 * מציג את מחזור החיים המלא של ההזמנה עם אינדיקטורים ברורים
 */
export default function BookingStatusTimeline({ booking, className }: BookingStatusTimelineProps) {
  
  const getTimelineSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = []
    
    // שלב 1: יצירת הזמנה
    steps.push({
      id: "created",
      title: "הזמנה נוצרה",
      description: "ההזמנה נוצרה במערכת",
      icon: Calendar,
      status: "completed",
      timestamp: booking.createdAt ? new Date(booking.createdAt) : new Date(booking.bookingDateTime),
      details: `הזמנה #${booking.bookingNumber}`
    })

    // שלב 2: תשלום (אם נדרש)
    if (booking.status !== "pending_payment") {
      steps.push({
        id: "payment",
        title: "תשלום אושר",
        description: "התשלום עבור הטיפול אושר",
        icon: CreditCard,
        status: "completed",
        timestamp: booking.paymentCompletedAt ? new Date(booking.paymentCompletedAt) : undefined,
        details: `סכום: ₪${booking.priceDetails?.finalAmount?.toLocaleString() || "לא זמין"}`
      })
    } else {
      steps.push({
        id: "payment",
        title: "ממתין לתשלום",
        description: "יש צורך להשלים את התשלום",
        icon: CreditCard,
        status: "current",
        details: `סכום: ₪${booking.priceDetails?.finalAmount?.toLocaleString() || "לא זמין"}`
      })
    }

    // שלב 3: חיפוש מטפל
    if (booking.status === "pending_professional") {
      steps.push({
        id: "professional_search",
        title: "מחפשים מטפל",
        description: "מחפשים מטפל מתאים עבורך",
        icon: Users,
        status: "current",
        timestamp: booking.professionalSearchStartedAt ? new Date(booking.professionalSearchStartedAt) : undefined,
        details: "אנו מחפשים מטפל מתאים לפי הקריטריונים שלך"
      })
    } else if (booking.status === "no_professionals_available") {
      steps.push({
        id: "professional_search",
        title: "לא נמצא מטפל",
        description: "לא נמצא מטפל זמין",
        icon: AlertCircle,
        status: "current",
        timestamp: booking.noResponseFromProfessionalsAt ? new Date(booking.noResponseFromProfessionalsAt) : undefined,
        details: "אנו עדיין מחפשים מטפל מתאים עבורך"
      })
    } else if (booking.professionalId) {
      steps.push({
        id: "professional_search",
        title: "מטפל נמצא",
        description: "מטפל מתאים אישר את ההזמנה",
        icon: Users,
        status: "completed",
        timestamp: booking.professionalAssignedAt ? new Date(booking.professionalAssignedAt) : undefined,
        details: `מטפל: ${booking.professionalId.name || "לא זמין"}`
      })
    }

    // שלב 4: אישור הזמנה
    if (booking.status === "confirmed" || booking.status === "on_way" || booking.status === "completed" || booking.status === "pending_review" || booking.status === "reviewed") {
      steps.push({
        id: "confirmed",
        title: "הזמנה אושרה",
        description: "הטיפול אושר ומתוכנן",
        icon: CheckCircle,
        status: "completed",
        timestamp: booking.confirmedAt ? new Date(booking.confirmedAt) : undefined,
        details: `מתוכנן ל-${format(new Date(booking.bookingDateTime), "PPP בשעה HH:mm", { locale: he })}`
      })
    } else if (booking.status !== "pending_payment" && booking.status !== "pending_professional" && booking.status !== "no_professionals_available") {
      steps.push({
        id: "confirmed",
        title: "הזמנה אושרה",
        description: "הטיפול אושר ומתוכנן",
        icon: CheckCircle,
        status: "pending",
        details: `מתוכנן ל-${format(new Date(booking.bookingDateTime), "PPP בשעה HH:mm", { locale: he })}`
      })
    }

    // שלב 5: המטפל בדרך
    if (booking.status === "on_way") {
      steps.push({
        id: "on_way",
        title: "המטפל בדרך",
        description: "המטפל יצא לטיפול",
        icon: Navigation,
        status: "current",
        timestamp: booking.professionalArrivedAt ? new Date(booking.professionalArrivedAt) : undefined,
        details: booking.estimatedArrivalTime ? 
          `זמן הגעה משוער: ${format(new Date(booking.estimatedArrivalTime), "HH:mm", { locale: he })}` :
          "המטפל בדרך אליך"
      })
    } else if (booking.status === "completed" || booking.status === "pending_review" || booking.status === "reviewed") {
      steps.push({
        id: "on_way",
        title: "המטפל הגיע",
        description: "המטפל הגיע למקום הטיפול",
        icon: Navigation,
        status: "completed",
        timestamp: booking.professionalArrivedAt ? new Date(booking.professionalArrivedAt) : undefined,
        details: "המטפל הגיע בזמן"
      })
    }

    // שלב 6: טיפול הושלם
    if (booking.status === "completed" || booking.status === "pending_review" || booking.status === "reviewed") {
      steps.push({
        id: "completed",
        title: "הטיפול הושלם",
        description: "הטיפול בוצע בהצלחה",
        icon: CheckCircle,
        status: "completed",
        timestamp: booking.treatmentCompletedAt ? new Date(booking.treatmentCompletedAt) : undefined,
        details: "הטיפול בוצע בהצלחה"
      })
    }

    // שלב 7: חוות דעת
    if (booking.status === "pending_review") {
      steps.push({
        id: "review",
        title: "ממתין לחוות דעת",
        description: "נשמח לשמוע על חוויית הטיפול",
        icon: Star,
        status: "current",
        timestamp: booking.reviewRequestSentAt ? new Date(booking.reviewRequestSentAt) : undefined,
        details: "כתיבת חוות דעת תעזור לשיפור השירות"
      })
    } else if (booking.status === "reviewed") {
      steps.push({
        id: "review",
        title: "חוות דעת נשלחה",
        description: "תודה על חוות הדעת!",
        icon: Star,
        status: "completed",
        timestamp: booking.reviewCompletedAt ? new Date(booking.reviewCompletedAt) : undefined,
        details: booking.clientReview?.rating ? 
          `דירוג: ${booking.clientReview.rating}/5` :
          "תודה על המשוב"
      })
    }

    // שלב ביטול (אם רלוונטי)
    if (booking.status === "cancelled") {
      steps.push({
        id: "cancelled",
        title: "הזמנה בוטלה",
        description: "ההזמנה בוטלה",
        icon: XCircle,
        status: "completed",
        timestamp: booking.cancelledAt ? new Date(booking.cancelledAt) : undefined,
        details: booking.cancellationReason || "ההזמנה בוטלה"
      })
    }

    return steps
  }

  const getStatusColor = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "current":
        return "text-blue-600"
      case "pending":
        return "text-gray-400"
      case "skipped":
        return "text-gray-300"
      default:
        return "text-gray-400"
    }
  }

  const getStatusBgColor = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 border-green-200"
      case "current":
        return "bg-blue-100 border-blue-200"
      case "pending":
        return "bg-gray-100 border-gray-200"
      case "skipped":
        return "bg-gray-50 border-gray-200"
      default:
        return "bg-gray-100 border-gray-200"
    }
  }

  const getOverallStatus = () => {
    switch (booking.status) {
      case "pending_payment":
        return { text: "ממתין לתשלום", color: "bg-yellow-100 text-yellow-800", icon: CreditCard }
      case "pending_professional":
        return { text: "מחפשים מטפל", color: "bg-blue-100 text-blue-800", icon: Users }
      case "confirmed":
        return { text: "הזמנה אושרה", color: "bg-green-100 text-green-800", icon: CheckCircle }
      case "on_way":
        return { text: "המטפל בדרך", color: "bg-blue-100 text-blue-800", icon: Navigation }
      case "completed":
        return { text: "הטיפול הושלם", color: "bg-green-100 text-green-800", icon: CheckCircle }
      case "pending_review":
        return { text: "ממתין לחוות דעת", color: "bg-purple-100 text-purple-800", icon: Star }
      case "reviewed":
        return { text: "הושלם", color: "bg-green-100 text-green-800", icon: CheckCircle }
      case "cancelled":
        return { text: "הזמנה בוטלה", color: "bg-red-100 text-red-800", icon: XCircle }
      case "no_professionals_available":
        return { text: "מחפשים מטפל", color: "bg-orange-100 text-orange-800", icon: RefreshCw }
      default:
        return { text: "לא ידוע", color: "bg-gray-100 text-gray-800", icon: AlertCircle }
    }
  }

  const timelineSteps = getTimelineSteps()
  const overallStatus = getOverallStatus()
  const StatusIcon = overallStatus.icon

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">סטטוס הזמנה</CardTitle>
            <CardDescription>
              הזמנה #{booking.bookingNumber} • {format(new Date(booking.bookingDateTime), "PPP", { locale: he })}
            </CardDescription>
          </div>
          <Badge className={cn("flex items-center gap-1", overallStatus.color)}>
            <StatusIcon className="h-4 w-4" />
            {overallStatus.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineSteps.map((step, index) => {
            const Icon = step.icon
            const isLast = index === timelineSteps.length - 1
            
            return (
              <div key={step.id} className="flex items-start space-x-4 rtl:space-x-reverse">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2",
                    getStatusBgColor(step.status)
                  )}>
                    <Icon className={cn("h-5 w-5", getStatusColor(step.status))} />
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-12 mt-2",
                      step.status === "completed" ? "bg-green-200" : 
                      step.status === "current" ? "bg-blue-200" : "bg-gray-200"
                    )} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={cn(
                      "font-medium",
                      step.status === "completed" ? "text-green-900" :
                      step.status === "current" ? "text-blue-900" : "text-gray-500"
                    )}>
                      {step.title}
                    </h3>
                    {step.timestamp && (
                      <span className="text-sm text-gray-500">
                        {format(step.timestamp, "HH:mm", { locale: he })}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm mt-1",
                    step.status === "completed" ? "text-green-700" :
                    step.status === "current" ? "text-blue-700" : "text-gray-500"
                  )}>
                    {step.description}
                  </p>
                  {step.details && (
                    <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                      {step.details}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
} 