"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import {
  getBookingByIdForProfessional,
  type BookingDetailsForProfessional,
} from "@/actions/professional-booking-view-actions" // ניצור קובץ זה
import {
  professionalAcceptBooking,
  professionalMarkEnRoute,
  professionalMarkCompleted,
} from "@/actions/booking-actions"
import { useTranslation } from "@/lib/translations/i18n" // ודא שהנתיב נכון
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import { AlertCircle, CheckCircle2, Hourglass, Send, Check, X } from "lucide-react"

// Helper function to format date and time
const formatDateTime = (dateString: string | Date | undefined, locale = "he-IL") => {
  if (!dateString) return "N/A"
  try {
    return new Date(dateString).toLocaleString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (e) {
    return "Invalid Date"
  }
}

export default function ProfessionalBookingManagementPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { toast } = useToast()
  const { t, language } = useTranslation()

  const bookingId = params.bookingId as string

  const [booking, setBooking] = useState<BookingDetailsForProfessional | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentProfessionalId = session?.user?.id

  const fetchBookingDetails = useCallback(async () => {
    if (!bookingId || sessionStatus !== "authenticated") {
      if (sessionStatus === "unauthenticated") router.push("/auth/login")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getBookingByIdForProfessional(bookingId)
      if (result.success && result.booking) {
        setBooking(result.booking)
      } else {
        setError(result.error || t("professionalBookingManagement.errors.fetchFailed"))
        setBooking(null)
      }
    } catch (err) {
      setError(t("professionalBookingManagement.errors.unexpectedError"))
      logger.error("Fetch booking details error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId, sessionStatus, router, t])

  useEffect(() => {
    fetchBookingDetails()
  }, [fetchBookingDetails])

  const handleAcceptBooking = async () => {
    setActionLoading(true)
    const result = await professionalAcceptBooking(bookingId, currentProfessionalId || "")
    if (result.success) {
      toast({
        title: t("professionalBookingManagement.toasts.accepted.title"),
        description: t("professionalBookingManagement.toasts.accepted.description"),
      })
      await fetchBookingDetails() // Re-fetch to get latest state
    } else {
      toast({
        variant: "destructive",
        title: t("professionalBookingManagement.toasts.actionFailed.title"),
        description: result.error || t("professionalBookingManagement.errors.acceptFailed"),
      })
    }
    setActionLoading(false)
  }

  const handleMarkEnRoute = async () => {
    setActionLoading(true)
    const result = await professionalMarkEnRoute(bookingId)
    if (result.success) {
      toast({
        title: t("professionalBookingManagement.toasts.enRoute.title"),
        description: t("professionalBookingManagement.toasts.enRoute.description"),
      })
      await fetchBookingDetails()
    } else {
      toast({
        variant: "destructive",
        title: t("professionalBookingManagement.toasts.actionFailed.title"),
        description: result.error || t("professionalBookingManagement.errors.enRouteFailed"),
      })
    }
    setActionLoading(false)
  }

  const handleMarkCompleted = async () => {
    setActionLoading(true)
    const result = await professionalMarkCompleted(bookingId)
    if (result.success) {
      toast({
        title: t("professionalBookingManagement.toasts.completed.title"),
        description: t("professionalBookingManagement.toasts.completed.description"),
      })
      await fetchBookingDetails()
    } else {
      toast({
        variant: "destructive",
        title: t("professionalBookingManagement.toasts.actionFailed.title"),
        description: result.error || t("professionalBookingManagement.errors.completedFailed"),
      })
    }
    setActionLoading(false)
  }

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-10 w-1/3 mt-4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <Hourglass className="h-4 w-4" />
          <AlertTitle>{t("professionalBookingManagement.status.noBookingFound.title")}</AlertTitle>
          <AlertDescription>
            {t("professionalBookingManagement.status.noBookingFound.description")}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const isAssignedToCurrentPro = booking.professionalId?._id?.toString() === currentProfessionalId
  const clientName =
    booking.userId?.name || t("professionalBookingManagement.details.anonymousClient")
  const clientPhone = booking.userId?.phone || t("common.notAvailable")
  const clientEmail = booking.userId?.email || t("common.notAvailable")

  const renderActionButtons = () => {
    if (booking.status === "in_process") {
      return (
        <Button onClick={handleAcceptBooking} disabled={actionLoading} className="w-full">
          <CheckCircle2 className="mr-2 h-4 w-4" />{" "}
          {t("professionalBookingManagement.actions.acceptBooking")}
        </Button>
      )
    }
    if (isAssignedToCurrentPro) {
      if (booking.status === "confirmed") {
        return (
          <div className="space-y-2 w-full">
            <Button onClick={handleMarkEnRoute} disabled={actionLoading} className="w-full">
              <Send className="mr-2 h-4 w-4" />{" "}
              {t("professionalBookingManagement.actions.markEnRoute")}
            </Button>
            <Button onClick={handleMarkCompleted} disabled={actionLoading} className="w-full">
              <Check className="mr-2 h-4 w-4" />{" "}
              {t("professionalBookingManagement.actions.markCompleted")}
            </Button>
          </div>
        )
      }
    }
    return null // No actions available for other statuses or if not assigned
  }

  const getStatusText = (statusKey: string | undefined) => {
    if (!statusKey) return t("common.status.unknown")
    const translationKey = `bookings.status.${statusKey}` as any
    const translated = t(translationKey)
    // If translation returns the key itself, it means it's missing. Fallback.
    return translated === translationKey
      ? statusKey.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
      : translated
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {t("professionalBookingManagement.title")}:{" "}
            {booking.treatmentId?.name || t("common.unknownTreatment")}
          </CardTitle>
          <CardDescription>
            {t("professionalBookingManagement.bookingId")}: {booking._id?.toString() || ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">
              {t("professionalBookingManagement.details.title")}
            </h3>
            <p>
              <strong>{t("professionalBookingManagement.details.status")}:</strong>{" "}
              <span
                className={`font-medium ${booking.status === "completed" ? "text-green-600" : booking.status?.startsWith("cancelled") ? "text-red-600" : "text-blue-600"}`}
              >
                {getStatusText(booking.status)}
              </span>
            </p>
            <p>
              <strong>{t("professionalBookingManagement.details.dateTime")}:</strong>{" "}
              {formatDateTime(booking.bookingDateTime, language)}
            </p>
            <p>
              <strong>{t("professionalBookingManagement.details.duration")}:</strong>{" "}
              {booking.treatmentId?.selectedDuration?.minutes ||
                booking.treatmentId?.defaultDurationMinutes ||
                t("common.notAvailable")}{" "}
              {t("common.minutes")}
            </p>
            <p>
              <strong>{t("professionalBookingManagement.details.address")}:</strong>{" "}
              {booking.addressId?.fullAddress ||
                booking.customAddressDetails?.fullAddress ||
                t("common.notAvailable")}
            </p>
            {booking.notes && (
              <p>
                <strong>{t("professionalBookingManagement.details.notes")}:</strong> {booking.notes}
              </p>
            )}
          </div>

          {((booking.status !== "pending_professional_assignment" && isAssignedToCurrentPro) ||
            session?.user.roles.includes("admin")) && (
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {t("professionalBookingManagement.clientDetails.title")}
              </h3>
              <p>
                <strong>{t("professionalBookingManagement.clientDetails.name")}:</strong>{" "}
                {clientName}
              </p>
              <p>
                <strong>{t("professionalBookingManagement.clientDetails.phone")}:</strong>{" "}
                {formatPhoneForDisplay(clientPhone || "")}
              </p>
              <p>
                <strong>{t("professionalBookingManagement.clientDetails.email")}:</strong>{" "}
                {clientEmail}
              </p>
            </div>
          )}

          {booking.status === "in_process" && !isAssignedToCurrentPro && (
            <Alert>
              <Hourglass className="h-4 w-4" />
              <AlertTitle>
                {t("professionalBookingManagement.status.pendingAssignment.title")}
              </AlertTitle>
              <AlertDescription>
                {t("professionalBookingManagement.status.pendingAssignment.description")}
              </AlertDescription>
            </Alert>
          )}

          {booking.status === "confirmed" && !isAssignedToCurrentPro && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertTitle>
                {t("professionalBookingManagement.status.alreadyAssigned.title")}
              </AlertTitle>
              <AlertDescription>
                {t("professionalBookingManagement.status.alreadyAssigned.description")}
              </AlertDescription>
            </Alert>
          )}
          {booking.status === "completed" && isAssignedToCurrentPro && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">
                {t("professionalBookingManagement.status.completed.title")}
              </AlertTitle>
              <AlertDescription className="text-green-600">
                {t("professionalBookingManagement.status.completed.description")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>{renderActionButtons()}</CardFooter>
      </Card>
    </div>
  )
}

// Helper logger (can be moved to a utils file if used elsewhere)
const logger = {
  error: (...args: any[]) => console.error("[ProfBookingMgmtPage]", ...args),
  info: (...args: any[]) => console.info("[ProfBookingMgmtPage]", ...args),
}
