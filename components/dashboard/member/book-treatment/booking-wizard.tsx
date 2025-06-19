"use client"
import { useState, useEffect, useCallback } from "react" // Added useMemo
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

import type {
  BookingInitialData,
  SelectedBookingOptions,
  CalculatedPriceDetails,
  TimeSlot,
} from "@/types/booking"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import { useToast } from "@/components/common/ui/use-toast"

import BookingSourceStep from "./steps/booking-source-step"
import TreatmentSelectionStep from "./steps/treatment-selection-step"
import SchedulingStep from "./steps/scheduling-step"
import SummaryStep from "./steps/summary-step"
import PaymentStep from "./steps/payment-step"
import BookingConfirmation from "./steps/booking-confirmation"
import NotificationPreferencesSelector from "@/components/booking/notification-preferences-selector"

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
  voucher?: GiftVoucherPlain
  userSubscription?: IUserSubscription & { treatmentId?: any }
}

const TOTAL_STEPS_WITH_PAYMENT = 5
const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS_WITH_PAYMENT + 1

// Add a constant for the timezone
const TIMEZONE = "Asia/Jerusalem" // Israel timezone

export default function BookingWizard({
  initialData,
  currentUser,
  voucher,
  userSubscription,
}: BookingWizardProps) {
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)
  const defaultBookingOptions: Partial<SelectedBookingOptions> = {
    therapistGenderPreference: initialData.userPreferences?.therapistGender || "any",
    isFlexibleTime: false,
    source: voucher
      ? "gift_voucher_redemption"
      : userSubscription
      ? "subscription_redemption"
      : initialData.activeUserSubscriptions?.length > 0 || initialData.usableGiftVouchers?.length > 0
      ? undefined
      : "new_purchase",
    selectedGiftVoucherId: voucher ? voucher._id.toString() : undefined,
    selectedUserSubscriptionId: userSubscription ? userSubscription._id.toString() : undefined,
    selectedTreatmentId: voucher?.treatmentId?.toString() || userSubscription?.treatmentId?.toString(),
    selectedDurationId:
      voucher?.selectedDurationId?.toString() || userSubscription?.selectedDurationId?.toString(),
  }

  const [bookingOptions, setBookingOptions] = useState<Partial<SelectedBookingOptions>>(defaultBookingOptions)
  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPriceDetails | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isTimeSlotsLoading, setIsTimeSlotsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<IBooking | null>(null)
  const [workingHoursNote, setWorkingHoursNote] = useState<string | undefined>(undefined)
  
  // Notification preferences state
  const [notificationPreferences, setNotificationPreferences] = useState({
    methods: ["email"] as ("email" | "sms")[],
    language: "he" as "he" | "en" | "ru"
  })
  const [recipientNotificationPreferences, setRecipientNotificationPreferences] = useState({
    methods: ["email"] as ("email" | "sms")[],
    language: "he" as "he" | "en" | "ru"
  })

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

    // Create the booking date time in a timezone-consistent way
    const bookingDateTime = new Date(bookingOptions.bookingDate)
    const [hours, minutes] = bookingOptions.bookingTime.split(":").map(Number)
    bookingDateTime.setHours(hours, minutes, 0, 0)

    const payload: CreateBookingPayloadType = {
      userId: currentUser.id,
      treatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
      bookingDateTime,
      selectedAddressId: bookingOptions.selectedAddressId,
      therapistGenderPreference: bookingOptions.therapistGenderPreference || "any",
      notes: bookingOptions.notes,
      priceDetails: calculatedPrice,
      paymentDetails: {
        paymentMethodId: bookingOptions.selectedPaymentMethodId,
        paymentStatus: calculatedPrice.finalAmount === 0 ? "not_required" : "pending",
      },
      source: bookingOptions.source || "new_purchase",
      redeemedUserSubscriptionId:
        bookingOptions.source === "subscription_redemption" ? bookingOptions.selectedUserSubscriptionId : undefined,
      redeemedGiftVoucherId:
        bookingOptions.source === "gift_voucher_redemption" ? bookingOptions.selectedGiftVoucherId : undefined,
      appliedCouponId: calculatedPrice.appliedCouponId,
      isFlexibleTime: bookingOptions.isFlexibleTime || false,
      flexibilityRangeHours: bookingOptions.flexibilityRangeHours,
      // Add new fields for "book for someone else"
      recipientName: bookingOptions.isBookingForSomeoneElse ? bookingOptions.recipientName : undefined,
      recipientPhone: bookingOptions.isBookingForSomeoneElse ? bookingOptions.recipientPhone : undefined,
      recipientEmail: bookingOptions.isBookingForSomeoneElse ? bookingOptions.recipientEmail : undefined,
      recipientBirthDate: bookingOptions.isBookingForSomeoneElse ? bookingOptions.recipientBirthDate : undefined,
      // Add notification preferences
      notificationMethods: notificationPreferences.methods,
      recipientNotificationMethods: bookingOptions.isBookingForSomeoneElse ? recipientNotificationPreferences.methods : undefined,
      notificationLanguage: notificationPreferences.language,
    }

    const result = await createBooking(payload)
    if (result.success && result.booking) {
      setBookingResult(result.booking)
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
        return (
          <div className="space-y-6">
            <SummaryStep {...stepProps} calculatedPrice={calculatedPrice} isLoadingPrice={isPriceCalculating} />
            
            {/* Notification Preferences */}
            <NotificationPreferencesSelector
              value={notificationPreferences}
              onChange={setNotificationPreferences}
              isForRecipient={false}
              className="mt-6"
            />
            
            {/* Recipient Notification Preferences (if booking for someone else) */}
            {bookingOptions.isBookingForSomeoneElse && (
              <NotificationPreferencesSelector
                value={recipientNotificationPreferences}
                onChange={setRecipientNotificationPreferences}
                isForRecipient={true}
                recipientName={bookingOptions.recipientName}
                className="mt-4"
              />
            )}
          </div>
        )
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
      {currentStep <= TOTAL_STEPS_WITH_PAYMENT && (
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
