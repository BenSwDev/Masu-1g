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
import type { UserSessionData } from "@/types/next-auth"
import type { CreateBookingPayloadType, CalculatePricePayloadType } from "@/lib/validation/booking-schemas"
import { Progress } from "@/components/common/ui/progress" // Added Progress
import { AlertCircle } from "lucide-react" // For error messages
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert" // For error messages
import type { IBooking } from "@/lib/db/models/booking" // Add this import

interface BookingWizardProps {
  initialData: BookingInitialData
  currentUser: UserSessionData
}

const TOTAL_STEPS_WITH_PAYMENT = 5
const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS_WITH_PAYMENT + 1

// Add a constant for the timezone
const TIMEZONE = "Asia/Jerusalem" // Israel timezone

export default function BookingWizard({ initialData, currentUser }: BookingWizardProps) {
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

  const { toast } = useToast()
  // const translations = useMemo(() => initialData.translations || {}, [initialData.translations])

  // Effect to fetch time slots
  useEffect(() => {
    if (bookingOptions.bookingDate && bookingOptions.selectedTreatmentId) {
      const fetchSlots = async () => {
        setIsTimeSlotsLoading(true)
        setTimeSlots([])
        setWorkingHoursNote(undefined)
        
        // Get the local date from the bookingOptions
        const localDate = bookingOptions.bookingDate!
        
        // Format the date as YYYY-MM-DD - use the raw date object
        // This ensures the correct date is sent regardless of timezone
        const year = localDate.getFullYear()
        const month = (localDate.getMonth() + 1).toString().padStart(2, "0") // getMonth() is 0-indexed
        const day = localDate.getDate().toString().padStart(2, "0")
        const dateStr = `${year}-${month}-${day}`
        
        const result = await getAvailableTimeSlots(
          dateStr,
          bookingOptions.selectedTreatmentId!,
          bookingOptions.selectedDurationId,
        )
        if (result.success) {
          setTimeSlots(result.timeSlots || [])
          setWorkingHoursNote(result.workingHoursNote)
        } else {
          toast({
            variant: "destructive",
            title:
              t(result.error || "bookings.errors.fetchTimeSlotsFailedTitle") ||
              result.error ||
              "Error fetching time slots",
            description: t(result.error || "bookings.errors.fetchTimeSlotsFailedTitle"),
          })
        }
        setIsTimeSlotsLoading(false)
      }
      fetchSlots()
    } else {
      setTimeSlots([])
      setWorkingHoursNote(undefined)
    }
  }, [bookingOptions.bookingDate, bookingOptions.selectedTreatmentId, bookingOptions.selectedDurationId, toast, t])

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
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

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

    try {
      // Create the booking date time in a timezone-consistent way
      const bookingDateTime = new Date(bookingOptions.bookingDate);
      const [hours, minutes] = bookingOptions.bookingTime.split(":").map(Number);
      bookingDateTime.setHours(hours, minutes, 0, 0);

      // Prepare the booking data
      const bookingData = {
        ...bookingOptions,
        userId: currentUser.id,
        bookingDateTime: bookingDateTime.toISOString(),
        recipientBirthDate: bookingOptions.recipientBirthDate ? new Date(bookingOptions.recipientBirthDate).toISOString() : undefined,
      };

      // Create the booking
      const response = await createBooking(bookingData);

      if (!response.success) {
        throw new Error(response.error || "Failed to create booking");
      }

      // Handle successful booking
      setCurrentStep(CONFIRMATION_STEP_NUMBER);
      setBookingResult({
        success: true,
        bookingNumber: response.booking?.bookingNumber,
        error: null,
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      setBookingResult({
        success: false,
        bookingNumber: null,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const progressValue = (currentStep / TOTAL_STEPS_WITH_PAYMENT) * 100

  const renderStep = () => {
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
    <div className="bg-card p-4 sm:p-6 md:p-8 rounded-lg shadow-xl border max-w-3xl mx-auto">
      {currentStep <= TOTAL_STEPS_WITH_PAYMENT && (
        <div className="mb-6">
          <Progress value={progressValue} className="w-full" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {t("common.step") || "Step"} {currentStep} {t("common.of") || "of"} {TOTAL_STEPS_WITH_PAYMENT}
          </p>
        </div>
      )}
      {renderStep()}
    </div>
  )
}
