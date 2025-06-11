"use client"
import { useState, useEffect, useCallback } from "react" // Added useMemo
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails, TimeSlot } from "@/types/booking"
import { useToast } from "@/components/common/ui/use-toast"

import BookingSourceStep from "./steps/booking-source-step"
import TreatmentSelectionStep from "./steps/treatment-selection-step"
import SchedulingStep from "./steps/scheduling-step"
import SummaryStep from "./steps/summary-step"
import PaymentStep from "./steps/payment-step"
import BookingConfirmation from "./steps/booking-confirmation"

import { calculateBookingPrice, createBooking, getAvailableTimeSlots } from "@/actions/booking-actions"
import type { IUser } from "@/lib/db/models/user"
import type { CreateBookingPayloadType, CalculatePricePayloadType } from "@/lib/validation/booking-schemas"
import { Progress } from "@/components/common/ui/progress" // Added Progress
import { AlertCircle } from "lucide-react" // For error messages
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert" // For error messages
import type { IBooking } from "@/lib/db/models/booking" // Add this import

interface BookingWizardProps {
  initialData: BookingInitialData
  currentUser: IUser
  isGuestMode?: boolean
  onBookingComplete?: (booking: IBooking) => void
}

const TOTAL_STEPS_WITH_PAYMENT = 5
const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS_WITH_PAYMENT + 1

// Add a constant for the timezone
const TIMEZONE = "Asia/Jerusalem" // Israel timezone

export default function BookingWizard({ initialData, currentUser, isGuestMode = false, onBookingComplete }: BookingWizardProps) {
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)
  const [bookingOptions, setBookingOptions] = useState<Partial<SelectedBookingOptions>>({
    therapistGenderPreference: initialData.userPreferences?.therapistGender || "any",
    isFlexibleTime: false,
    source:
      initialData.activeUserSubscriptions?.length > 0 || initialData.usableGiftVouchers?.length > 0
        ? undefined
        : "new_purchase",
  })
  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPriceDetails | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isTimeSlotsLoading, setIsTimeSlotsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<IBooking | null>(null)
  const [workingHoursNote, setWorkingHoursNote] = useState<string | undefined>(undefined)
  const [isBookingCompleted, setIsBookingCompleted] = useState(false)

  const { toast } = useToast()

  // Session storage key for this booking session
  const sessionKey = `booking_wizard_${currentUser._id}_${Date.now()}`
  const sessionStorageKey = `booking_wizard_${currentUser._id}`

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(sessionStorageKey)
    if (savedState && !bookingResult) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed.bookingOptions) {
          setBookingOptions(parsed.bookingOptions)
        }
        if (parsed.currentStep && parsed.currentStep < CONFIRMATION_STEP_NUMBER) {
          setCurrentStep(parsed.currentStep)
        }
        if (parsed.calculatedPrice) {
          setCalculatedPrice(parsed.calculatedPrice)
        }
      } catch (error) {
        console.warn('Failed to load saved booking state:', error)
      }
    }
  }, [sessionStorageKey, bookingResult])

  // Save state to localStorage whenever relevant data changes
  useEffect(() => {
    if (!isBookingCompleted && currentStep < CONFIRMATION_STEP_NUMBER) {
      const stateToSave = {
        bookingOptions,
        currentStep,
        calculatedPrice,
        timestamp: Date.now(),
      }
      try {
        localStorage.setItem(sessionStorageKey, JSON.stringify(stateToSave))
      } catch (error) {
        console.warn('Failed to save booking state:', error)
      }
    }
  }, [bookingOptions, currentStep, calculatedPrice, sessionStorageKey, isBookingCompleted])

  // Clear saved state when booking is completed
  useEffect(() => {
    if (isBookingCompleted || bookingResult) {
      try {
        localStorage.removeItem(sessionStorageKey)
      } catch (error) {
        console.warn('Failed to clear booking state:', error)
      }
    }
  }, [isBookingCompleted, bookingResult, sessionStorageKey])

  const loadTimeSlots = useCallback(
    async (treatmentId: string, selectedDate: Date, selectedDurationId?: string) => {
      setIsTimeSlotsLoading(true)
      setWorkingHoursNote(undefined)

      try {
        // Format date as YYYY-MM-DD string
        const dateString = selectedDate.toISOString().split('T')[0]
        
        const result = await getAvailableTimeSlots(
          dateString,
          treatmentId,
          selectedDurationId
        )

        if (result.success && result.timeSlots) {
          setTimeSlots(result.timeSlots)
          setWorkingHoursNote(result.workingHoursNote)
        } else {
          setTimeSlots([])
          toast({
            variant: "destructive",
            title: t("bookings.errors.timeSlotsFailedTitle") || "Failed to load time slots",
            description: t("bookings.errors.timeSlotsFailedDescription") || "Please try again",
          })
        }
      } catch (error) {
        setTimeSlots([])
        toast({
          variant: "destructive",
          title: t("common.error") || "Error",
          description: t("bookings.errors.timeSlotsFailedDescription") || "Failed to load available time slots",
        })
      } finally {
        setIsTimeSlotsLoading(false)
      }
    },
    [toast, t],
  )

  useEffect(() => {
    if (bookingOptions.selectedTreatmentId && bookingOptions.bookingDate) {
      loadTimeSlots(bookingOptions.selectedTreatmentId, bookingOptions.bookingDate, bookingOptions.selectedDurationId)
    } else {
      setTimeSlots([])
    }
  }, [
    bookingOptions.selectedTreatmentId,
    bookingOptions.bookingDate,
    bookingOptions.selectedDurationId,
    loadTimeSlots,
  ])

  const triggerPriceCalculation = useCallback(async () => {
    if (
      !bookingOptions.selectedTreatmentId ||
      !bookingOptions.bookingDate ||
      !bookingOptions.bookingTime ||
      !currentUser.id
    ) {
      setCalculatedPrice(null)
      return
    }

    const selectedTreatment = initialData.activeTreatments.find(
      (t) => t._id.toString() === bookingOptions.selectedTreatmentId,
    )
    if (selectedTreatment?.pricingType === "duration_based" && !bookingOptions.selectedDurationId) {
      setCalculatedPrice(null)
      return
    }

    setIsPriceCalculating(true)
    
    // Create the booking date time in a timezone-consistent way
    const bookingDateTime = new Date(bookingOptions.bookingDate)
    const [hours, minutes] = bookingOptions.bookingTime.split(":").map(Number)
    bookingDateTime.setHours(hours, minutes, 0, 0)
    
    // Note: This will be treated as a local date by the server,
    // and will be converted to the correct timezone when needed

    const payload: CalculatePricePayloadType = {
      treatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
      bookingDateTime,
      couponCode: bookingOptions.appliedCouponCode,
      giftVoucherCode:
        bookingOptions.source === "gift_voucher_redemption" && bookingOptions.selectedGiftVoucherId
          ? initialData.usableGiftVouchers.find((gv) => gv._id.toString() === bookingOptions.selectedGiftVoucherId)
              ?.code
          : undefined,
      userSubscriptionId:
        bookingOptions.source === "subscription_redemption" ? bookingOptions.selectedUserSubscriptionId : undefined,
      userId: currentUser.id,
    }
    const result = await calculateBookingPrice(payload)
    if (result.success && result.priceDetails) {
      setCalculatedPrice(result.priceDetails)
    } else {
      toast({
        variant: "destructive",
        title:
          t(result.error || "bookings.errors.calculatePriceFailedTitle") || result.error || "Error calculating price",
        description: result.issues
          ? result.issues.map((issue) => issue.message).join(", ")
          : t(result.error || "bookings.errors.calculatePriceFailedTitle"),
      })
      setCalculatedPrice(null)
    }
    setIsPriceCalculating(false)
  }, [bookingOptions, currentUser.id, toast, initialData.activeTreatments, t, initialData.usableGiftVouchers])

  useEffect(() => {
    if (currentStep >= 3) {
      triggerPriceCalculation()
    }
  }, [
    bookingOptions.selectedTreatmentId,
    bookingOptions.selectedDurationId,
    bookingOptions.bookingDate,
    bookingOptions.bookingTime,
    bookingOptions.appliedCouponCode,
    bookingOptions.source,
    bookingOptions.selectedGiftVoucherId,
    bookingOptions.selectedUserSubscriptionId,
    currentStep,
    triggerPriceCalculation,
  ])

  // Effect to auto-select the first available time slot
  useEffect(() => {
    if (timeSlots.length > 0 && !bookingOptions.bookingTime) {
      const firstAvailableSlot = timeSlots.find((slot) => slot.isAvailable)
      if (firstAvailableSlot) {
        setBookingOptions((prev) => ({
          ...prev,
          bookingTime: firstAvailableSlot.time,
        }))
      }
    }
  }, [timeSlots, bookingOptions.bookingTime])

  const nextStep = () => {
    if (
      currentStep === TOTAL_STEPS_WITH_PAYMENT - 1 && // Summary step
      calculatedPrice?.finalAmount === 0 &&
      calculatedPrice?.isFullyCoveredByVoucherOrSubscription
    ) {
      // Skip payment step, go directly to confirmation by simulating final submit
      handleFinalSubmit(true) // Pass a flag to indicate skipping payment UI
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, CONFIRMATION_STEP_NUMBER))
    }
  }
  
  const prevStep = () => {
    // Prevent going back after booking is completed
    if (isBookingCompleted || bookingResult) {
      return
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleFinalSubmit = async (skipPaymentUI = false) => {
    setIsLoading(true)
    if (
      !bookingOptions.selectedTreatmentId ||
      !bookingOptions.bookingDate ||
      !bookingOptions.bookingTime ||
      !calculatedPrice ||
      !bookingOptions.selectedAddressId
    ) {
      toast({
        variant: "destructive",
        title: t("bookings.errors.missingInfoTitle") || "Missing Information",
        description: t("bookings.errors.missingInfoSubmit") || "Please fill all required fields.",
      })
      setIsLoading(false)
      return
    }

    if (!skipPaymentUI && calculatedPrice.finalAmount > 0 && !bookingOptions.selectedPaymentMethodId) {
      toast({
        variant: "destructive",
        title: t("bookings.errors.paymentMethodRequiredTitle") || "Payment Method Required",
        description: t("bookings.errors.paymentMethodRequired") || "Please select a payment method.",
      })
      setIsLoading(false)
      return
    }

    // Create the booking date time in a timezone-consistent way
    const bookingDateTime = new Date(bookingOptions.bookingDate)
    const [hours, minutes] = bookingOptions.bookingTime.split(":").map(Number)
    bookingDateTime.setHours(hours, minutes, 0, 0)

    // Convert to UTC for storage
    const utcDateTime = new Date(bookingDateTime.getTime() - bookingDateTime.getTimezoneOffset() * 60000)

    const payload: CreateBookingPayloadType = {
      treatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
      bookingDateTime: utcDateTime.toISOString(),
      addressId: bookingOptions.selectedAddressId,
      notes: bookingOptions.notes || "",
      therapistGenderPreference: bookingOptions.therapistGenderPreference || "any",
      source: bookingOptions.source!,
      selectedUserSubscriptionId: bookingOptions.selectedUserSubscriptionId,
      selectedGiftVoucherId: bookingOptions.selectedGiftVoucherId,
      appliedCouponCode: bookingOptions.appliedCouponCode,
      selectedPaymentMethodId: skipPaymentUI ? undefined : bookingOptions.selectedPaymentMethodId,
      agreeToTerms: true,
      agreeToMarketing: bookingOptions.agreeToMarketing || false,
      isFlexibleTime: false,
      flexibilityRangeHours: 2,
      isBookingForSomeoneElse: bookingOptions.isBookingForSomeoneElse || false,
      recipientName: bookingOptions.recipientName,
      recipientPhone: bookingOptions.recipientPhone,
      recipientEmail: bookingOptions.recipientEmail,
      recipientBirthDate: bookingOptions.recipientBirthDate?.toISOString(),
    }

    const result = await createBooking(payload)

    if (result.success && result.booking) {
      setBookingResult(result.booking)
      setIsBookingCompleted(true) // Mark as completed to prevent navigation back
      
      // Call callback if provided (for guest mode)
      if (onBookingComplete) {
        onBookingComplete(result.booking)
        return // Don't show toast or change step, let the callback handle it
      }
      
      toast({
        title: t("bookings.success.bookingCreatedTitle") || "Booking Created!",
        description: t("bookings.success.bookingCreatedDescription") || "Your booking has been successfully created.",
      })
      setCurrentStep(CONFIRMATION_STEP_NUMBER)
    } else {
      toast({
        variant: "destructive",
        title: t(result.error || "bookings.errors.bookingFailedTitle") || result.error || "Booking Failed",
        description: result.issues
          ? result.issues.map((issue) => issue.message).join(", ")
          : t(result.error || "bookings.errors.unknownBookingError") || result.error || "An unknown error occurred.",
      })
    }
    setIsLoading(false)
  }

  const progressValue = (currentStep / TOTAL_STEPS_WITH_PAYMENT) * 100

  const renderStep = () => {
    // If booking is completed, only show confirmation step
    if (isBookingCompleted && currentStep !== CONFIRMATION_STEP_NUMBER) {
      setCurrentStep(CONFIRMATION_STEP_NUMBER)
      return null
    }

    const stepProps = {
      initialData,
      bookingOptions,
      setBookingOptions,
      onNext: nextStep,
      onPrev: prevStep,
    }

    switch (currentStep) {
      case 1:
        return <BookingSourceStep {...stepProps} />
      case 2:
        return <TreatmentSelectionStep {...stepProps} />
      case 3:
        return (
          <SchedulingStep
            {...stepProps}
            timeSlots={timeSlots}
            isTimeSlotsLoading={isTimeSlotsLoading}
            workingHoursNote={workingHoursNote}
          />
        )
      case 4:
        return <SummaryStep {...stepProps} calculatedPrice={calculatedPrice} isLoadingPrice={isPriceCalculating} />
      case 5:
        return (
          <PaymentStep
            {...stepProps}
            calculatedPrice={calculatedPrice}
            onSubmit={() => handleFinalSubmit(false)} // Explicitly pass false for skipPaymentUI
            isLoading={isLoading}
          />
        )
      case CONFIRMATION_STEP_NUMBER:
        return (
          <BookingConfirmation bookingResult={bookingResult!} initialData={initialData} currentUser={currentUser} />
        )
      default:
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("common.error") || "Error"}</AlertTitle>
            <AlertDescription>{t("common.unknownStep") || "Unknown step encountered."}</AlertDescription>
          </Alert>
        )
    }
  }

  return (
    <div className="w-full max-w-none sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-2 sm:px-0">
      <div className="bg-card p-3 sm:p-4 md:p-6 lg:p-8 rounded-lg shadow-xl border w-full">
        {currentStep <= TOTAL_STEPS_WITH_PAYMENT && !isBookingCompleted && (
          <div className="mb-4 sm:mb-6">
            <Progress value={progressValue} className="w-full h-2 sm:h-3" />
            <p className="text-center text-xs sm:text-sm text-muted-foreground mt-2">
              {t("common.step") || "Step"} {currentStep} {t("common.of") || "of"} {TOTAL_STEPS_WITH_PAYMENT}
            </p>
          </div>
        )}
        <div className="w-full overflow-hidden">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
