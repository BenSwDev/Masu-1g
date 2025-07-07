"use client"

import React from "react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { 
  Calendar,
  MapPin,
  Clock,
  User,
  Eye,
  Star,
  AlertTriangle,
  CreditCard,
  Navigation,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import EnhancedBookingStatusBadge from "./enhanced-booking-status-badge"
import type { PopulatedBooking } from "@/types/booking"

interface BookingOverviewCardProps {
  booking: PopulatedBooking
  onViewDetails?: () => void
  onWriteReview?: () => void
  onCompletePayment?: () => void
  onCancel?: () => void
  className?: string
  variant?: "default" | "compact"
}

/**
 * כרטיס סקירת הזמנה עם מידע חשוב ופעולות מהירות
 * מציג את המידע הכי רלוונטי ללקוח בצורה ברורה ונגישה
 */
export default function BookingOverviewCard({
  booking,
  onViewDetails,
  onWriteReview,
  onCompletePayment,
  onCancel,
  className,
  variant = "default"
}: BookingOverviewCardProps) {

  const isUpcoming = () => {
    const bookingDate = new Date(booking.bookingDateTime)
    const now = new Date()
    return bookingDate > now && !["cancelled", "completed", "reviewed"].includes(booking.status)
  }

  const isUrgent = () => {
    return booking.status === "pending_payment" || 
           (booking.status === "on_way" && isUpcoming())
  }

  const getTimeToBooking = () => {
    const bookingDate = new Date(booking.bookingDateTime)
    const now = new Date()
    const diffMs = bookingDate.getTime() - now.getTime()
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      return { text: "תוך שעה", urgent: true }
    } else if (diffHours < 24) {
      return { text: `עוד ${diffHours} שעות`, urgent: diffHours <= 2 }
    } else {
      const diffDays = Math.ceil(diffHours / 24)
      return { text: `עוד ${diffDays} ימים`, urgent: false }
    }
  }

  const getPrimaryAction = () => {
    switch (booking.status) {
      case "pending_payment":
        return {
          label: "השלם תשלום",
          action: onCompletePayment,
          variant: "default" as const,
          icon: CreditCard,
          urgent: true
        }
      case "pending_review":
        return {
          label: "כתוב חוות דעת",
          action: onWriteReview,
          variant: "default" as const,
          icon: Star,
          urgent: false
        }
      default:
        return {
          label: "צפה בפרטים",
          action: onViewDetails,
          variant: "outline" as const,
          icon: Eye,
          urgent: false
        }
    }
  }

  const timeInfo = isUpcoming() ? getTimeToBooking() : null
  const primaryAction = getPrimaryAction()
  const PrimaryIcon = primaryAction.icon

  if (variant === "compact") {
    return (
      <Card className={cn("w-full", isUrgent() && "ring-2 ring-amber-200", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">
                  {booking.treatmentId?.name || "טיפול לא מוגדר"}
                </h3>
                <EnhancedBookingStatusBadge booking={booking} showTooltip={false} />
              </div>
              <p className="text-xs text-gray-600">
                {format(new Date(booking.bookingDateTime), "dd/MM בשעה HH:mm", { locale: he })}
              </p>
            </div>
            <Button size="sm" variant={primaryAction.variant} onClick={primaryAction.action}>
              <PrimaryIcon className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "w-full transition-all duration-200 hover:shadow-md", 
      isUrgent() && "ring-2 ring-amber-200 bg-amber-50/30",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {booking.treatmentId?.name || "טיפול לא מוגדר"}
              {isUrgent() && <AlertTriangle className="h-4 w-4 text-amber-600" />}
            </CardTitle>
            <CardDescription className="mt-1">
              הזמנה #{booking.bookingNumber}
            </CardDescription>
          </div>
          <EnhancedBookingStatusBadge booking={booking} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date and Time Info */}
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-gray-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {format(new Date(booking.bookingDateTime), "PPPP", { locale: he })}
            </p>
            <p className="text-xs text-gray-600">
              {format(new Date(booking.bookingDateTime), "HH:mm", { locale: he })}
              {booking.isFlexibleTime && (
                <Badge variant="outline" className="mr-2 text-xs">גמיש</Badge>
              )}
              {timeInfo && (
                <span className={cn(
                  "mr-2 text-xs",
                  timeInfo.urgent ? "text-amber-600 font-medium" : "text-gray-500"
                )}>
                  • {timeInfo.text}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Location */}
        {booking.bookingAddressSnapshot && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {booking.bookingAddressSnapshot.fullAddress}
              </p>
            </div>
          </div>
        )}

        {/* Professional Info */}
        {booking.professionalId && (
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {booking.professionalId.name}
              </p>
              <p className="text-xs text-gray-600">מטפל מאושר</p>
            </div>
          </div>
        )}

        {/* Special Status Messages */}
        {booking.status === "on_way" && booking.estimatedArrivalTime && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                המטפל בדרך - הגעה משוערת {format(new Date(booking.estimatedArrivalTime), "HH:mm", { locale: he })}
              </span>
            </div>
          </div>
        )}

        {booking.status === "pending_professional" && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-900">
                מחפשים מטפל מתאים עבורך באזור
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant={primaryAction.variant} 
            size="sm" 
            onClick={primaryAction.action}
            className={cn(
              "flex-1",
              primaryAction.urgent && "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            <PrimaryIcon className="h-4 w-4 mr-2" />
            {primaryAction.label}
          </Button>
          
          {onViewDetails && primaryAction.label !== "צפה בפרטים" && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          {["pending_professional", "confirmed"].includes(booking.status) && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-red-600 hover:text-red-700">
              ביטול
            </Button>
          )}
        </div>

        {/* Price Info */}
        {booking.priceDetails?.finalAmount && (
          <div className="text-xs text-gray-600 border-t pt-2">
            סה"כ: ₪{booking.priceDetails.finalAmount.toLocaleString()}
            {booking.status === "pending_payment" && (
              <span className="text-amber-600 font-medium mr-2">• ממתין לתשלום</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 