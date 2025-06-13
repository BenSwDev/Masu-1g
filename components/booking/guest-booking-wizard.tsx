"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  getAbandonedBooking,
  deleteAbandonedBooking
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
  // Notification preferences
  bookerNotificationMethod?: "email" | "sms" | "both"
  bookerNotificationLanguage?: "he" | "en" | "ru"
  recipientNotificationMethod?: "email" | "sms" | "both"
  recipientNotificationLanguage?: "he" | "en" | "ru"
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
const CONFIRMATION_STEP_NUMBER = 7

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
  const [workingHoursNote, setWorkingHoursNote] = useState<string>("")
  
  // New state for guest user management
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
  const [abandonedBooking, setAbandonedBooking] = useState<any>(null)

  const { toast } = useToast()

  // Refs for smart saving
  const lastSavedData = useRef<string>('')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isCreatingUser = useRef(false)

  // Create guest user once when needed
  const createGuestUserOnce = useCallback(async (guestData: Partial<GuestInfo>) => {
    if (guestUserId || isCreatingUser.current) {
      console.log("🔄 Guest user already exists or being created:", guestUserId)
      return guestUserId
    }
    
    if (!guestData.firstName || !guestData.lastName || !guestData.email || !guestData.phone) {
      console.log("⚠️ Missing required guest info for user creation")
      return null
    }
    
    isCreatingUser.current = true
    console.log("👤 Creating guest user once...")
    
    try {
      const result = await createGuestUser({
        firstName: guestData.firstName,
        lastName: guestData.lastName,
        email: guestData.email,
        phone: guestData.phone,
        birthDate: guestData.birthDate,
        gender: guestData.gender,
      })
      
      if (result.success && result.userId) {
        console.log("✅ Guest user created/found:", result.userId)
        setGuestUserId(result.userId)
        localStorage.setItem('guestUserId', result.userId)
        
        // Create initial abandoned booking
        await createInitialAbandonedBooking(result.userId, guestData)
        
        return result.userId
      } else {
        console.error("❌ Failed to create guest user:", result.error)
        toast({
          variant: "destructive",
          title: "שגיאה ביצירת משתמש אורח",
          description: result.error || "נסה שוב",
        })
        return null
      }
    } catch (error) {
      console.error("❌ Error creating guest user:", error)
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת משתמש אורח",
        description: "אירעה שגיאה בלתי צפויה. נסה שוב.",
      })
      return null
    } finally {
      isCreatingUser.current = false
    }
  }, [guestUserId, toast])

  // Function to handle guest info submission and proceed to next step
  const handleGuestInfoSubmit = useCallback(async (newInfo: Partial<GuestInfo>) => {
    console.log("🔄 handleGuestInfoSubmit called with:", newInfo)
    
    // Update the state
    setGuestInfo(newInfo)
    
    // Create guest user if needed
    if (currentStep === 1) {
      const userId = await createGuestUserOnce(newInfo)
      if (!userId) {
        console.log("❌ Failed to create guest user, not proceeding")
        return
      }
    }
    
    // Move to next step
    setCurrentStep(prev => Math.min(prev + 1, CONFIRMATION_STEP_NUMBER))
  }, [currentStep, createGuestUserOnce])

  // Function to create initial abandoned booking
  const createInitialAbandonedBooking = async (userId: string, guestInfoData: Partial<GuestInfo>) => {
    try {
      console.log("💾 Creating initial abandoned booking for user:", userId)
      
      const result = await saveAbandonedBooking(userId, {
        guestInfo: guestInfoData,
        guestAddress: {}, 
        bookingOptions: {}, 
        calculatedPrice: null,
        currentStep: 1,
      })
      
      if (result.success) {
        console.log("✅ Initial abandoned booking created:", result.bookingId)
        toast({
          title: "התחלת תהליך הזמנה",
          description: "ההזמנה נשמרה במערכת",
        })
      } else {
        console.log("⚠️ Failed to create initial abandoned booking:", result.error)
      }
    } catch (error) {
      console.error("❌ Error creating initial abandoned booking:", error)
    }
  }

  // Check for abandoned booking on component mount
  useEffect(() => {
    const checkForAbandonedBooking = async () => {
      console.log("🔍 Checking for abandoned booking...")
      const savedUserId = localStorage.getItem('guestUserId')
      
      if (savedUserId) {
        try {
          const result = await getAbandonedBooking(savedUserId)
          
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
      }
    }
    
    checkForAbandonedBooking()
  }, [])

  // Smart save form state whenever it changes (after step 1)
  useEffect(() => {
    if (guestUserId && currentStep > 1) {
      const currentData = JSON.stringify({
        guestInfo,
        guestAddress,
        bookingOptions,
        calculatedPrice,
        currentStep,
      })
      
      // Only save if data actually changed
      if (currentData !== lastSavedData.current) {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        
        // Set new timeout for saving
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            console.log("💾 Smart saving form state for step:", currentStep)
            const result = await saveAbandonedBooking(guestUserId, {
              guestInfo,
              guestAddress,
              bookingOptions,
              calculatedPrice,
              currentStep,
            })
            
            if (result.success) {
              console.log("✅ Form state saved successfully")
              lastSavedData.current = currentData
            } else {
              console.error("❌ Failed to save form state:", result.error)
            }
          } catch (error) {
            console.error("❌ Error saving form state:", error)
          }
        }, 2000) // Save after 2 seconds of inactivity
      }
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [guestUserId, guestInfo, guestAddress, bookingOptions, calculatedPrice, currentStep])

  // Load time slots when needed
  useEffect(() => {
    const loadTimeSlots = async () => {
      if (
        currentStep === 4 &&
        bookingOptions.selectedTreatmentId &&
        bookingOptions.bookingDate &&
        bookingOptions.therapistGenderPreference
      ) {
        setIsTimeSlotsLoading(true)
        try {
          const localDate = new Date(bookingOptions.bookingDate)
          const year = localDate.getFullYear()
          const month = (localDate.getMonth() + 1).toString().padStart(2, "0")
          const day = localDate.getDate().toString().padStart(2, "0")
          const dateStr = `${year}-${month}-${day}`
          
          const result = await getAvailableTimeSlots(
            dateStr,
            bookingOptions.selectedTreatmentId,
            bookingOptions.selectedDurationId,
          )
          
          if (result.success) {
            setTimeSlots(result.timeSlots || [])
            setWorkingHoursNote(result.workingHoursNote || "")
          } else {
            console.error("Failed to load time slots:", result.error)
            setTimeSlots([])
          }
        } catch (error) {
          console.error("Error loading time slots:", error)
          setTimeSlots([])
        } finally {
          setIsTimeSlotsLoading(false)
        }
      }
    }
    
    loadTimeSlots()
  }, [currentStep, bookingOptions.selectedTreatmentId, bookingOptions.selectedDurationId, bookingOptions.bookingDate, bookingOptions.therapistGenderPreference])

  // Calculate price when needed
  const triggerPriceCalculation = useCallback(async () => {
    if (
      !bookingOptions.selectedTreatmentId ||
      !bookingOptions.bookingDate ||
      !bookingOptions.bookingTime ||
      !guestInfo.email ||
      !guestUserId
    ) {
      console.log("⚠️ Missing required data for price calculation")
      return
    }

    setIsPriceCalculating(true)
    
    const selectedTreatment = (initialData?.activeTreatments || []).find(
      (t) => t._id.toString() === bookingOptions.selectedTreatmentId
    )

    if (!selectedTreatment) {
      console.log("⚠️ Selected treatment not found")
      setIsPriceCalculating(false)
      return
    }

    const bookingDateTime = new Date(bookingOptions.bookingDate)
    const [hours, minutes] = bookingOptions.bookingTime.split(":").map(Number)
    bookingDateTime.setHours(hours, minutes, 0, 0)

    const payload: CalculatePricePayloadType = {
      userId: guestUserId,
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

  const handleStartFresh = async () => {
    try {
      // Delete abandoned booking from database
      if (guestUserId) {
        await deleteAbandonedBooking(guestUserId)
        localStorage.removeItem('guestUserId')
      }
      
      // Reset all state
      setGuestUserId(null)
      setAbandonedBooking(null)
      setShowRecoveryDialog(false)
      setGuestInfo({})
      setGuestAddress({})
      setBookingOptions({
        therapistGenderPreference: initialData.userPreferences?.therapistGender || "any",
        isFlexibleTime: false,
        source: "new_purchase",
      })
      setCalculatedPrice(null)
      setCurrentStep(1)
      
      toast({
        title: "התחלה חדשה",
        description: "הטופס אופס והתחלת מחדש",
      })
    } catch (error) {
      console.error("❌ Error starting fresh:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בעת התחלה מחדש",
      })
    }
  }

  const nextStep = async () => {
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
          apartment: guestAddress.apartmentNumber,
          entrance: guestAddress.entrance,
          floor: guestAddress.floor,
          notes: guestAddress.notes,
          doorName: guestAddress.doorName,
          buildingName: guestAddress.buildingName,
          hotelName: guestAddress.hotelName,
          roomNumber: guestAddress.roomNumber,
          otherInstructions: guestAddress.instructions,
          hasPrivateParking: guestAddress.parking || false,
        },
        guestInfo: {
          name: `${guestInfo.firstName} ${guestInfo.lastName}`,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
        recipientName: guestInfo.isBookingForSomeoneElse 
          ? `${guestInfo.recipientFirstName} ${guestInfo.recipientLastName}`
          : `${guestInfo.firstName} ${guestInfo.lastName}`,
        recipientEmail: guestInfo.isBookingForSomeoneElse 
          ? guestInfo.recipientEmail
          : guestInfo.email,
        recipientPhone: guestInfo.isBookingForSomeoneElse 
          ? guestInfo.recipientPhone
          : guestInfo.phone,
        recipientBirthDate: guestInfo.isBookingForSomeoneElse 
          ? guestInfo.recipientBirthDate
          : guestInfo.birthDate,
        recipientGender: guestInfo.isBookingForSomeoneElse 
          ? guestInfo.recipientGender
          : guestInfo.gender,
        notes: guestInfo.notes,
        couponCode: bookingOptions.appliedCouponCode,
        priceDetails: calculatedPrice!,
        paymentDetails: {
          paymentStatus: calculatedPrice!.finalAmount === 0 ? "not_required" : "pending",
        },
        bookerNotificationMethod: guestInfo.bookerNotificationMethod,
        bookerNotificationLanguage: guestInfo.bookerNotificationLanguage,
        recipientNotificationMethod: guestInfo.recipientNotificationMethod,
        recipientNotificationLanguage: guestInfo.recipientNotificationLanguage,
      } as CreateBookingPayloadType

      console.log("📤 Submitting booking payload:", payload)
      const result = await createGuestBooking(payload)

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
            onNext={handleGuestInfoSubmit}
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
            setGuestInfo={setGuestInfo}
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