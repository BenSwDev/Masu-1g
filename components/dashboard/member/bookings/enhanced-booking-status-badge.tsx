"use client"

import React from "react"
import { Badge } from "@/components/common/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
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
  Users,
  Timer
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PopulatedBooking } from "@/types/booking"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface EnhancedBookingStatusBadgeProps {
  booking: PopulatedBooking
  showTooltip?: boolean
  variant?: "compact" | "detailed"
  className?: string
}

/**
 * תג סטטוס הזמנה משופר עם מידע מפורט וטיפים לכלים
 * מציג מידע רלוונטי ופעולות אפשריות בהתאם לסטטוס
 */
export default function EnhancedBookingStatusBadge({
  booking,
  showTooltip = true,
  variant = "compact",
  className
}: EnhancedBookingStatusBadgeProps) {

  const getStatusInfo = () => {
    switch (booking.status) {
      case "pending_payment":
        return {
          label: "ממתין לתשלום",
          description: "יש להשלים את התשלום כדי לאשר את ההזמנה",
          icon: CreditCard,
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          urgent: true,
          nextStep: "השלם תשלום",
          estimatedTime: "מיידי"
        }
      
      case "pending_professional":
        return {
          label: "מחפשים מטפל",
          description: "אנו מחפשים מטפל מתאים עבורך באזור שלך",
          icon: Users,
          color: "bg-blue-100 text-blue-800 border-blue-200",
          urgent: false,
          nextStep: "ממתין למטפל",
          estimatedTime: "עד 30 דקות"
        }
      
      case "confirmed":
        return {
          label: "הזמנה מאושרת",
          description: "המטפל אישר את ההזמנה והטיפול מתוכנן",
          icon: CheckCircle,
          color: "bg-green-100 text-green-800 border-green-200",
          urgent: false,
          nextStep: "ממתין לטיפול",
          estimatedTime: getTimeUntilBooking()
        }
      
      case "on_way":
        return {
          label: "המטפל בדרך",
          description: "המטפל יצא לטיפול ובדרך אליך",
          icon: Navigation,
          color: "bg-blue-100 text-blue-800 border-blue-200",
          urgent: false,
          nextStep: "ממתין להגעה",
          estimatedTime: booking.estimatedArrivalTime ? 
            `הגעה ב-${format(new Date(booking.estimatedArrivalTime), "HH:mm", { locale: he })}` :
            "בקרוב"
        }
      
      case "completed":
        return {
          label: "הטיפול הושלם",
          description: "הטיפול בוצע בהצלחה",
          icon: CheckCircle,
          color: "bg-green-100 text-green-800 border-green-200",
          urgent: false,
          nextStep: "כתוב חוות דעת",
          estimatedTime: "מיידי"
        }
      
      case "pending_review":
        return {
          label: "ממתין לחוות דעת",
          description: "הטיפול הושלם, נשמח לשמוע על החוויה שלך",
          icon: Star,
          color: "bg-purple-100 text-purple-800 border-purple-200",
          urgent: false,
          nextStep: "כתוב חוות דעת",
          estimatedTime: "מיידי"
        }
      
      case "reviewed":
        return {
          label: "הושלם",
          description: "הטיפול הושלם וחוות הדעת נשלחה",
          icon: CheckCircle,
          color: "bg-green-100 text-green-800 border-green-200",
          urgent: false,
          nextStep: "הושלם",
          estimatedTime: "הושלם"
        }
      
      case "cancelled":
        return {
          label: "הזמנה בוטלה",
          description: "ההזמנה בוטלה",
          icon: XCircle,
          color: "bg-red-100 text-red-800 border-red-200",
          urgent: false,
          nextStep: "בוטל",
          estimatedTime: "בוטל"
        }
      
      case "no_professionals_available":
        return {
          label: "מחפשים מטפל",
          description: "אנו עדיין מחפשים מטפל מתאים עבורך",
          icon: RefreshCw,
          color: "bg-orange-100 text-orange-800 border-orange-200",
          urgent: false,
          nextStep: "ממתין למטפל",
          estimatedTime: "עד שעה"
        }
      
      case "refunded":
        return {
          label: "הוחזר כסף",
          description: "התשלום הוחזר",
          icon: CreditCard,
          color: "bg-purple-100 text-purple-800 border-purple-200",
          urgent: false,
          nextStep: "הוחזר",
          estimatedTime: "הושלם"
        }
      
      default:
        return {
          label: "לא ידוע",
          description: "סטטוס לא ידוע",
          icon: AlertCircle,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          urgent: false,
          nextStep: "בדיקה נדרשת",
          estimatedTime: "לא ידוע"
        }
    }
  }

  const getTimeUntilBooking = () => {
    const bookingDate = new Date(booking.bookingDateTime)
    const now = new Date()
    const diffMs = bookingDate.getTime() - now.getTime()
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      return "תוך שעה"
    } else if (diffHours < 24) {
      return `עוד ${diffHours} שעות`
    } else {
      const diffDays = Math.ceil(diffHours / 24)
      return `עוד ${diffDays} ימים`
    }
  }

  const statusInfo = getStatusInfo()
  const Icon = statusInfo.icon

  const BadgeContent = () => (
    <Badge 
      variant="outline" 
      className={cn("flex items-center gap-1", statusInfo.color, className)}
    >
      <Icon className="h-3 w-3" />
      {statusInfo.label}
      {statusInfo.urgent && (
        <AlertCircle className="h-3 w-3 text-amber-600" />
      )}
    </Badge>
  )

  const DetailedContent = () => (
    <div className={cn("p-3 rounded-lg border", statusInfo.color, className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{statusInfo.label}</span>
          {statusInfo.urgent && (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          )}
        </div>
        <div className="text-sm">
          {statusInfo.estimatedTime}
        </div>
      </div>
      <p className="text-sm mt-1 opacity-80">
        {statusInfo.description}
      </p>
      {statusInfo.nextStep !== statusInfo.label && (
        <p className="text-xs mt-2 font-medium">
          הצעד הבא: {statusInfo.nextStep}
        </p>
      )}
    </div>
  )

  const renderTooltipContent = () => (
    <div className="max-w-sm">
      <div className="font-medium flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        {statusInfo.label}
        {statusInfo.urgent && (
          <AlertCircle className="h-4 w-4 text-amber-600" />
        )}
      </div>
      <p className="text-sm mb-2">{statusInfo.description}</p>
      <div className="text-xs space-y-1">
        <p><strong>הצעד הבא:</strong> {statusInfo.nextStep}</p>
        <p><strong>זמן משוער:</strong> {statusInfo.estimatedTime}</p>
        {booking.professionalId && (
          <p><strong>מטפל:</strong> {booking.professionalId.name}</p>
        )}
      </div>
    </div>
  )

  if (variant === "detailed") {
    return <DetailedContent />
  }

  if (!showTooltip) {
    return <BadgeContent />
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <BadgeContent />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          {renderTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 