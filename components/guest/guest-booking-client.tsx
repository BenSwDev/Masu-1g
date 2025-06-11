"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { useToast } from "@/components/common/ui/use-toast"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"
import { GuestUserEditModal } from "./guest-user-edit-modal"
import { convertGuestToRealUser, mergeGuestWithExistingUser } from "@/actions/guest-auth-actions"
import { signIn } from "next-auth/react"
import { 
  User, 
  Edit, 
  LogIn, 
  Home, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils/utils"

import type { IUser } from "@/lib/db/models/user"
import type { IPaymentMethod } from "@/actions/payment-method-actions"
import type { BookingInitialData } from "@/types/booking"
import type { IBooking } from "@/lib/db/models/booking"

interface GuestBookingClientProps {
  guestUser: IUser
  shouldMerge?: boolean
  existingUserId?: string
  initialData: BookingInitialData
  initialPaymentMethods: IPaymentMethod[]
}

export default function GuestBookingClient({
  guestUser,
  shouldMerge = false,
  existingUserId,
  initialData,
  initialPaymentMethods
}: GuestBookingClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [bookingCompleted, setBookingCompleted] = useState<IBooking | null>(null)
  const [isProcessingCompletion, setIsProcessingCompletion] = useState(false)
  const [currentGuestUser, setCurrentGuestUser] = useState(guestUser)

  // Enhanced initial data with guest user
  const enhancedInitialData: BookingInitialData = {
    ...initialData,
    currentUser: currentGuestUser,
    paymentMethods: initialPaymentMethods
  }

  const handleBookingCompletion = async (booking: IBooking) => {
    setBookingCompleted(booking)
    setIsProcessingCompletion(true)

    try {
      // If this should merge with existing user
      if (shouldMerge && existingUserId) {
        const mergeResult = await mergeGuestWithExistingUser(
          currentGuestUser._id, 
          existingUserId
        )
        
        if (mergeResult.success) {
          toast({
            title: t("guest.booking.mergeSuccess"),
            description: t("guest.booking.mergeSuccessDescription"),
            variant: "default"
          })
        }
      } else {
        // Convert guest to real user
        const convertResult = await convertGuestToRealUser(currentGuestUser._id)
        
        if (convertResult.success) {
          toast({
            title: t("guest.booking.accountCreated"),
            description: t("guest.booking.accountCreatedDescription"),
            variant: "default"
          })
        }
      }
    } catch (error) {
      console.error("Error processing booking completion:", error)
      // Don't show error to user as booking was successful
    } finally {
      setIsProcessingCompletion(false)
    }
  }

  const handleGoToMemberDashboard = async () => {
    try {
      // Sign in the user automatically
      const result = await signIn("credentials", {
        email: currentGuestUser.email,
        redirect: false
      })
      
      if (result?.ok) {
        router.push("/dashboard/member")
      } else {
        // Fallback: redirect to login
        router.push("/auth/login")
      }
    } catch (error) {
      console.error("Auto-signin failed:", error)
      router.push("/auth/login")
    }
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleEditGuestDetails = () => {
    setIsEditModalOpen(true)
  }

  const handleGuestDetailsUpdated = (updatedUser: IUser) => {
    setCurrentGuestUser(updatedUser)
    setIsEditModalOpen(false)
    toast({
      title: t("guest.booking.detailsUpdated"),
      description: t("guest.booking.detailsUpdatedDescription"),
      variant: "default"
    })
  }

  const handleLoginAsExisting = () => {
    router.push("/auth/login")
  }

  // If booking is completed, show completion screen
  if (bookingCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t("guest.booking.completionTitle")}
            </h1>
            <p className="text-lg text-gray-600">
              {t("guest.booking.completionDescription")}
            </p>
          </div>

          {/* Booking Details Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t("guest.booking.bookingDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t("bookings.bookingNumber")}</p>
                  <p className="font-semibold">#{bookingCompleted.bookingNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("bookings.status.label")}</p>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {t("bookings.status.pending_professional_assignment")}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("bookings.dateTime")}</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(bookingCompleted.bookingDateTime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("bookings.paymentStatus")}</p>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {t(`bookings.paymentStatus.${bookingCompleted.paymentDetails.paymentStatus}`)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Information */}
          <Alert className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("guest.booking.statusExplanation")}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGoToMemberDashboard}
              size="lg"
              className="px-8"
              disabled={isProcessingCompletion}
            >
              <Settings className={cn("w-5 h-5", dir === "rtl" ? "ml-2" : "mr-2")} />
              {t("guest.booking.goToMemberDashboard")}
              <ArrowRight className={cn("w-4 h-4", dir === "rtl" ? "mr-2" : "ml-2")} />
            </Button>
            <Button
              onClick={handleBackToHome}
              variant="outline"
              size="lg"
              className="px-8"
            >
              <Home className={cn("w-5 h-5", dir === "rtl" ? "ml-2" : "mr-2")} />
              {t("guest.booking.backToHome")}
            </Button>
          </div>

          {/* Processing indicator */}
          {isProcessingCompletion && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                {t("guest.booking.processingAccount")}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show booking wizard with guest controls
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Guest Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("guest.booking.title")}
              </h1>
              <p className="text-gray-600 mt-1">
                {t("guest.booking.subtitle")}
              </p>
            </div>
            
            {/* Guest User Info & Actions */}
            <div className="flex flex-col sm:flex-row gap-2 min-w-0">
              <Card className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {currentGuestUser.firstName} {currentGuestUser.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {currentGuestUser.email}
                    </p>
                  </div>
                </div>
              </Card>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditGuestDetails}
                  className="whitespace-nowrap"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {t("guest.booking.editDetails")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoginAsExisting}
                  className="whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  {t("guest.booking.loginAsExisting")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Content */}
      <div className="container mx-auto px-4 py-8">
        <BookingWizard
          initialData={enhancedInitialData}
          currentUser={currentGuestUser}
          isGuestMode={true}
          onBookingComplete={handleBookingCompletion}
        />
      </div>

      {/* Guest User Edit Modal */}
      <GuestUserEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        guestUser={currentGuestUser}
        onUserUpdated={handleGuestDetailsUpdated}
      />
    </div>
  )
} 