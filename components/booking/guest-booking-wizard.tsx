"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails, TimeSlot } from "@/types/booking"
import { useToast } from "@/components/common/ui/use-toast"

import { GuestInfoStep } from "./steps/guest-info-step"
import { GuestAddressStep } from "./steps/guest-address-step"
import { GuestTreatmentSelectionStep } from "./steps/guest-treatment-selection-step"
import { GuestSchedulingStep } from "./steps/guest-scheduling-step"
import { GuestSummaryStep } from "./steps/guest-summary-step"
import { GuestPaymentStep } from "./steps/guest-payment-step"
import { GuestBookingConfirmation } from "./steps/guest-booking-confirmation"

import { 
  calculateBookingPrice, 
  createGuestBooking, 
  getAvailableTimeSlots,
  createGuestUser,
  saveAbandonedBooking,
  getAbandonedBooking
} from "@/actions/booking-actions"
import type { CreateBookingPayloadType, CalculatePricePayloadType } from "@/lib/validation/booking-schemas"
import { Progress } from "@/components/common/ui/progress"
import { AlertCircle, RotateCcw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { Button } from "@/components/common/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import type { IBooking } from "@/lib/db/models/booking"

interface GuestInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
  notes?: string
  isBookingForSomeoneElse?: boolean
  recipientFirstName?: string
  recipientLastName?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientBirthDate?: Date
  recipientGender?: "male" | "female" | "other"
}

interface GuestAddress {
  city: string
  street: string
  houseNumber: string
  addressType: "apartment" | "house" | "office" | "hotel" | "other"
  floor?: string
  apartmentNumber?: string
  entrance?: string
  parking: boolean
  notes?: string
  // Type-specific details
  doorName?: string // for house
  buildingName?: string // for office
  hotelName?: string // for hotel
  roomNumber?: string // for hotel
  instructions?: string // for other
}

interface GuestBookingWizardProps {
  initialData: BookingInitialData
}

const TOTAL_STEPS_WITH_PAYMENT = 6
const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS_WITH_PAYMENT + 1

const TIMEZONE = "Asia/Jerusalem"

export default function GuestBookingWizard({ initialData }: GuestBookingWizardProps) {
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)
  
  const [guestInfo, setGuestInfo] = useState<Partial<GuestInfo>>({})
  const [guestAddress, setGuestAddress] = useState<Partial<GuestAddress>>({})
  const [bookingOptions, setBookingOptions] = useState<Partial<SelectedBookingOptions>>({
    therapistGenderPreference: initialData.userPreferences?.therapistGender || "any",
    isFlexibleTime: false,
    source: "new_purchase",
  })
  
  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPriceDetails | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isTimeSlotsLoading, setIsTimeSlotsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<IBooking | null>(null)
  const [workingHoursNote, setWorkingHoursNote] = useState<string | undefined>(undefined)
  
  // New state for guest user management
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
  const [abandonedBooking, setAbandonedBooking] = useState<any>(null)

  const { toast } = useToast()

  // Function to create initial pending booking
  const createInitialPendingBooking = async (userId: string) => {
    try {
      console.log("📝 Creating initial pending booking for guest:", userId)
      
      // Create a minimal booking with "abandoned_pending_payment" status
      // This ensures the booking appears in admin bookings list immediately
      const result = await saveAbandonedBooking(userId, {
        guestInfo,
        guestAddress: {}, // Empty initially
        bookingOptions: {}, // Empty initially  
        calculatedPrice: null, // Empty initially
        currentStep: 1,
      })
      
      if (result.success) {
        console.log("✅ Initial pending booking created:", result.bookingId)
        toast({
          title: "התחלת תהליך הזמנה",
          description: "ההזמנה נשמרה במערכת ותופיע בעמוד הזמנות המנהל",
        })
      } else {
        console.log("⚠️ Failed to create initial pending booking:", result.error)
      }
    } catch (error) {
      console.error("❌ Error creating initial pending booking:", error)
    }
  }

  // Check for abandoned booking on component mount
  useEffect(() => {
    const checkForAbandonedBooking = async () => {
      console.log("🔍 Checking for abandoned booking...")
      const savedUserId = localStorage.getItem('guestUserId')
      console.log("📱 Saved guest user ID:", savedUserId)
      
      if (savedUserId) {
        try {
          const result = await getAbandonedBooking(savedUserId)
          console.log("📋 Abandoned booking result:", result)
          
          if (result.success && result.booking) {
            console.log("✅ Found abandoned booking, showing recovery dialog")
            setAbandonedBooking(result.booking)
            setGuestUserId(savedUserId)
            setShowRecoveryDialog(true)
          } else {
            console.log("ℹ️ No abandoned booking found")
          }
        } catch (error) {
          console.error("❌ Error checking for abandoned booking:", error)
        }
      } else {
        console.log("ℹ️ No saved guest user ID found")
      }
    }
    
    checkForAbandonedBooking()
  }, [])

  // Save form state whenever it changes (after step 1)
  useEffect(() => {
    if (guestUserId && currentStep > 1) {
      const saveFormState = async () => {
        try {
          console.log("💾 Saving form state for step:", currentStep)
          const result = await saveAbandonedBooking(guestUserId, {
            guestInfo,
            guestAddress,
            bookingOptions,
            calculatedPrice,
            currentStep,
          })
          
          if (result.success) {
            console.log("✅ Form state saved successfully")
          } else {
            console.error("❌ Failed to save form state:", result.error)
          }
        } catch (error) {
          console.error("❌ Error saving form state:", error)
        }
      }
      
      // Debounce the save operation
      const timeoutId = setTimeout(saveFormState, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [guestUserId, guestInfo, guestAddress, bookingOptions, calculatedPrice, currentStep])

  // Effect to fetch time slots with debouncing for better performance
  useEffect(() => {
    if (!bookingOptions.bookingDate || !bookingOptions.selectedTreatmentId) {
      setTimeSlots([])
      setWorkingHoursNote(undefined)
      return
    }

    // Debounce the API call to prevent rapid requests
    const timeoutId = setTimeout(async () => {
      setIsTimeSlotsLoading(true)
      setTimeSlots([])
      setWorkingHoursNote(undefined)
      
      try {
        const localDate = new Date(bookingOptions.bookingDate!)
        const year = localDate.getFullYear()
        const month = (localDate.getMonth() + 1).toString().padStart(2, "0")
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
            title: t(result.error || "bookings.errors.fetchTimeSlotsFailedTitle") || result.error || "Error fetching time slots",
            description: t(result.error || "bookings.errors.fetchTimeSlotsFailedTitle"),
          })
        }
      } catch (error) {
        console.error("Error fetching time slots:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load available times",
        })
      } finally {
        setIsTimeSlotsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [bookingOptions.bookingDate, bookingOptions.selectedTreatmentId, bookingOptions.selectedDurationId, toast, t])

  const triggerPriceCalculation = useCallback(async () => {
    if (
      !bookingOptions.selectedTreatmentId ||
      !bookingOptions.bookingDate ||
      !bookingOptions.bookingTime ||
      !guestInfo.email
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
    
    const bookingDateTime = new Date(bookingOptions.bookingDate)
    const [hours, minutes] = bookingOptions.bookingTime.split(":").map(Number)
    bookingDateTime.setHours(hours, minutes, 0, 0)

    const payload: CalculatePricePayloadType = {
      userId: guestUserId || "guest",
      treatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
      bookingDateTime,
      couponCode: bookingOptions.appliedCouponCode,
    }
    
    const result = await calculateBookingPrice(payload)
    if (result.success && result.priceDetails) {
      setCalculatedPrice(result.priceDetails)
    } else {
      toast({
        variant: "destructive",
        title: t(result.error || "bookings.errors.calculatePriceFailedTitle") || result.error || "Error calculating price",
        description: result.issues
          ? result.issues.map((issue) => issue.message).join(", ")
          : t(result.error || "bookings.errors.calculatePriceFailedTitle"),
      })
      setCalculatedPrice(null)
    }
    setIsPriceCalculating(false)
  }, [bookingOptions, guestInfo.email, guestUserId, toast, initialData.activeTreatments, t])

  useEffect(() => {
    if (currentStep >= 4) {
      triggerPriceCalculation()
    }
  }, [
    bookingOptions.selectedTreatmentId,
    bookingOptions.selectedDurationId,
    bookingOptions.bookingDate,
    bookingOptions.bookingTime,
    bookingOptions.appliedCouponCode,
    guestInfo.email,
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

  const handleRecoverBooking = () => {
    if (abandonedBooking?.formState) {
      const formState = abandonedBooking.formState
      setGuestInfo(formState.guestInfo || {})
      setGuestAddress(formState.guestAddress || {})
      setBookingOptions(formState.bookingOptions || {})
      setCalculatedPrice(formState.calculatedPrice || null)
      setCurrentStep(formState.currentStep || 1)
    }
    setShowRecoveryDialog(false)
    toast({
      title: "הטופס שוחזר בהצלחה",
      description: "ניתן להמשיך מהנקודה בה עצרת",
    })
  }

  const handleStartFresh = () => {
    // Clear abandoned booking and start fresh
    if (guestUserId) {
      localStorage.removeItem('guestUserId')
    }
    setGuestUserId(null)
    setAbandonedBooking(null)
    setShowRecoveryDialog(false)
    // Reset all form state
    setGuestInfo({})
    setGuestAddress({})
    setBookingOptions({
      therapistGenderPreference: initialData.userPreferences?.therapistGender || "any",
      isFlexibleTime: false,
      source: "new_purchase",
    })
    setCalculatedPrice(null)
    setCurrentStep(1)
  }

  const nextStep = async () => {
    // Create guest user after step 1 AND create pending booking
    if (currentStep === 1 && !guestUserId) {
      if (guestInfo.firstName && guestInfo.lastName && guestInfo.email && guestInfo.phone) {
        console.log("👤 Creating guest user...")
        try {
          const result = await createGuestUser({
            firstName: guestInfo.firstName,
            lastName: guestInfo.lastName,
            email: guestInfo.email,
            phone: guestInfo.phone,
            birthDate: guestInfo.birthDate,
            gender: guestInfo.gender,
          })
          
          if (result.success && result.userId) {
            console.log("✅ Guest user created/found:", result.userId)
            setGuestUserId(result.userId)
            localStorage.setItem('guestUserId', result.userId)
            
            // Create initial pending booking immediately
            await createInitialPendingBooking(result.userId)
          } else {
            console.error("❌ Failed to create guest user:", result.error)
            toast({
              variant: "destructive",
              title: "שגיאה ביצירת משתמש אורח",
              description: result.error || "נסה שוב",
            })
            return
          }
        } catch (error) {
          console.error("❌ Error creating guest user:", error)
          toast({
            variant: "destructive",
            title: "שגיאה ביצירת משתמש אורח",
            description: "אירעה שגיאה בלתי צפויה. נסה שוב.",
          })
          return
        }
      } else {
        console.log("⚠️ Missing required guest info for user creation")
      }
    }

    if (
      currentStep === TOTAL_STEPS_WITH_PAYMENT - 1 && // Summary step
      calculatedPrice?.finalAmount === 0 &&
      calculatedPrice?.isFullyCoveredByVoucherOrSubscription
    ) {
      handleFinalSubmit(true)
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, CONFIRMATION_STEP_NUMBER))
  }

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  const handleFinalSubmit = async (skipPaymentUI = false) => {
    console.log("🔄 Starting guest booking submission...")
    
    if (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.email || !guestInfo.phone) {
      console.log("❌ Missing guest info:", { guestInfo })
      toast({
        variant: "destructive",
        title: t("bookings.errors.missingGuestInfo"),
        description: t("bookings.errors.completeGuestInfo"),
      })
      return
    }

    if (
      !bookingOptions.selectedTreatmentId ||
      !bookingOptions.bookingDate ||
      !bookingOptions.bookingTime
    ) {
      console.log("❌ Missing booking options:", { bookingOptions })
      toast({
        variant: "destructive",
        title: t("bookings.errors.incompleteBookingDetails"),
        description: t("bookings.errors.completeAllFields"),
      })
      return
    }

    setIsLoading(true)

    try {
      const bookingDateTime = new Date(bookingOptions.bookingDate)
      const [hours, minutes] = bookingOptions.bookingTime.split(":").map(Number)
      bookingDateTime.setHours(hours, minutes, 0, 0)

      const payload = {
        userId: guestUserId || "guest",
        treatmentId: bookingOptions.selectedTreatmentId,
        selectedDurationId: bookingOptions.selectedDurationId,
        bookingDateTime,
        therapistGenderPreference: bookingOptions.therapistGenderPreference || "any",
        source: "new_purchase",
        customAddressDetails: {
          fullAddress: `${guestAddress.street} ${guestAddress.houseNumber}, ${guestAddress.city}`,
          city: guestAddress.city || "",
          street: guestAddress.street || "",
          streetNumber: guestAddress.houseNumber || "",
          apartment: guestAddress.apartmentNumber || undefined,
          entrance: guestAddress.entrance,
          floor: guestAddress.floor,
          notes: guestAddress.notes,
        },
        priceDetails: calculatedPrice!,
        paymentDetails: {
          paymentStatus: calculatedPrice!.finalAmount === 0 ? "not_required" : "pending",
        },
        guestInfo: {
          name: `${guestInfo.firstName} ${guestInfo.lastName}`,
          email: guestInfo.email!,
          phone: guestInfo.phone!,
        },
        recipientName: guestInfo.isBookingForSomeoneElse 
          ? `${guestInfo.recipientFirstName} ${guestInfo.recipientLastName}`
          : `${guestInfo.firstName} ${guestInfo.lastName}`,
        recipientEmail: guestInfo.isBookingForSomeoneElse 
          ? guestInfo.recipientEmail!
          : guestInfo.email!,
        recipientPhone: guestInfo.isBookingForSomeoneElse 
          ? guestInfo.recipientPhone!
          : guestInfo.phone!,
        recipientBirthDate: guestInfo.isBookingForSomeoneElse 
          ? guestInfo.recipientBirthDate
          : guestInfo.birthDate,
        recipientGender: guestInfo.isBookingForSomeoneElse 
          ? guestInfo.recipientGender
          : guestInfo.gender,
      } as CreateBookingPayloadType & { guestInfo: { name: string; email: string; phone: string } }

      console.log("📦 Payload prepared:", JSON.stringify(payload, null, 2))
      console.log("🚀 Calling createGuestBooking...")

      const result = await createGuestBooking(payload)
      
      console.log("📨 Server response:", result)
      
      if (result.success && result.booking) {
        console.log("✅ Booking created successfully:", result.booking)
        setBookingResult(result.booking)
        setCurrentStep(CONFIRMATION_STEP_NUMBER)
        
        // Clear saved form state on successful booking
        if (guestUserId) {
          localStorage.removeItem('guestUserId')
        }
        
        toast({
          title: t("bookings.success.bookingCreated"),
          description: t("bookings.success.bookingCreatedDescription"),
        })
      } else {
        console.log("❌ Booking failed:", result)
        toast({
          variant: "destructive",
          title: t(result.error || "bookings.errors.bookingFailedTitle") || result.error || "Booking failed",
          description: result.issues
            ? result.issues.map((issue) => issue.message).join(", ")
            : t(result.error || "bookings.errors.bookingFailedTitle"),
        })
      }
    } catch (error) {
      console.error("💥 Booking submission error:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.unexpectedError"),
        description: t("bookings.errors.tryAgain"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <GuestInfoStep
            guestInfo={guestInfo}
            setGuestInfo={setGuestInfo}
            onNext={nextStep}
          />
        )
      case 2:
        return (
          <GuestAddressStep
            address={guestAddress}
            setAddress={setGuestAddress}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 3:
        return (
          <GuestTreatmentSelectionStep
            initialData={initialData}
            bookingOptions={bookingOptions}
            setBookingOptions={setBookingOptions}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 4:
        return (
          <GuestSchedulingStep
            initialData={initialData}
            bookingOptions={bookingOptions}
            setBookingOptions={setBookingOptions}
            timeSlots={timeSlots}
            isTimeSlotsLoading={isTimeSlotsLoading}
            workingHoursNote={workingHoursNote}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 5:
        return (
          <GuestSummaryStep
            initialData={initialData}
            bookingOptions={bookingOptions}
            guestInfo={guestInfo}
            calculatedPrice={calculatedPrice}
            isPriceCalculating={isPriceCalculating}
            onNext={nextStep}
            onPrev={prevStep}
            setBookingOptions={setBookingOptions}
          />
        )
      case 6:
        return (
          <GuestPaymentStep
            calculatedPrice={calculatedPrice}
            guestInfo={guestInfo}
            onConfirm={handleFinalSubmit}
            onPrev={prevStep}
            isLoading={isLoading}
          />
        )
      case 7:
        return (
          <GuestBookingConfirmation
            bookingResult={bookingResult}
            initialData={initialData}
          />
        )
      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return t("bookings.steps.guestInfo.title")
      case 2:
        return t("bookings.addressStep.title") || "הוסף כתובת חדשה"
      case 3:
        return t("bookings.steps.treatment.title")
      case 4:
        return t("bookings.steps.scheduling.title")
      case 5:
        return t("bookings.steps.summary.title")
      case 6:
        return t("bookings.steps.payment.title")
      case 7:
        return t("bookings.steps.confirmation.title")
      default:
        return ""
    }
  }

  const progressPercentage = ((currentStep - 1) / (TOTAL_STEPS_WITH_PAYMENT - 1)) * 100

  if (currentStep === CONFIRMATION_STEP_NUMBER) {
    return renderStep()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Recovery Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              שחזור הזמנה
            </DialogTitle>
            <DialogDescription>
              נמצאה הזמנה שלא הושלמה מהיום האחרון. האם תרצה להמשיך מהנקודה בה עצרת או להתחיל מחדש?
            </DialogDescription>
          </DialogHeader>
          
          {/* Debug info */}
          {abandonedBooking && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <div>שלב: {abandonedBooking.formState?.currentStep || 'לא ידוע'}</div>
              <div>נשמר: {abandonedBooking.formState?.savedAt ? new Date(abandonedBooking.formState.savedAt).toLocaleString('he-IL') : 'לא ידוע'}</div>
              {abandonedBooking.formState?.guestInfo?.firstName && (
                <div>שם: {abandonedBooking.formState.guestInfo.firstName} {abandonedBooking.formState.guestInfo.lastName}</div>
              )}
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleStartFresh}>
              התחל מחדש
            </Button>
            <Button onClick={handleRecoverBooking}>
              המשך מהנקודה בה עצרתי
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{getStepTitle()}</span>
          <span>{currentStep} / {TOTAL_STEPS_WITH_PAYMENT}</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Error Display */}
      {isLoading && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.loading")}</AlertTitle>
          <AlertDescription>{t("bookings.processing")}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {renderStep()}
    </div>
  )
} 