"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails, TimeSlot } from "@/types/booking"
import type { UserSessionData } from "@/types/next-auth"
import { useToast } from "@/components/common/ui/use-toast"

// Import unified steps (will be renamed from guest-* to unified)
import { GuestInfoStep } from "./steps/guest-info-step"
import { GuestAddressStep } from "./steps/guest-address-step"
import { GuestTreatmentSelectionStep } from "./steps/guest-treatment-selection-step"
import { GuestSchedulingStep } from "./steps/guest-scheduling-step"
import { GuestSummaryStep } from "./steps/guest-summary-step"
import { GuestPaymentStep } from "./steps/guest-payment-step"
import { GuestBookingConfirmation } from "./steps/guest-booking-confirmation"

// Import member-specific step for source selection
import BookingSourceStep from "@/components/dashboard/member/book-treatment/steps/booking-source-step"

import { 
  calculateBookingPrice, 
  createGuestBooking,
  createBooking,
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

interface UnifiedBookingWizardProps {
  initialData: BookingInitialData
  currentUser?: UserSessionData // Optional - if provided, user is logged in
}

const TIMEZONE = "Asia/Jerusalem"

export default function UnifiedBookingWizard({ initialData, currentUser }: UnifiedBookingWizardProps) {
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)
  
  // Determine if this is a guest booking or member booking
  const isGuestBooking = !currentUser
  
  // All users (guests and members) follow the same flow, but members get pre-filled data
  // Members can optionally use subscriptions/vouchers in the summary step
  const TOTAL_STEPS_WITH_PAYMENT = 6 // info → address → treatment → scheduling → summary → payment
  const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS_WITH_PAYMENT + 1
  
  // Initialize guest info with user data if available
  const [guestInfo, setGuestInfoState] = useState<Partial<GuestInfo>>(() => {
    if (currentUser) {
      return {
        firstName: currentUser.name?.split(' ')[0] || '',
        lastName: currentUser.name?.split(' ').slice(1).join(' ') || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
      }
    }
    return {}
  })
  
  const [guestAddress, setGuestAddress] = useState<Partial<GuestAddress>>({})
  const [bookingOptions, setBookingOptions] = useState<Partial<SelectedBookingOptions>>({
    therapistGenderPreference: initialData.userPreferences?.therapistGender || "any",
    isFlexibleTime: false,
    source: "new_purchase", // Default to new purchase for everyone
  })
  
  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPriceDetails | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isTimeSlotsLoading, setIsTimeSlotsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<IBooking | null>(null)
  const [guestUserId, setGuestUserId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem('guestUserId') : null
  )
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null)
  const [workingHoursNote, setWorkingHoursNote] = useState<string>("")
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
  const [abandonedBooking, setAbandonedBooking] = useState<any>(null)
  const guestUserCreatedRef = useRef(false)
  const { toast } = useToast()

  // Enhanced setGuestInfo function with proper state merging
  const setGuestInfo = useCallback((newInfo: Partial<GuestInfo>) => {
    console.log("🔄 setGuestInfo called with:", newInfo)
    console.log("🔄 Current guestInfo state:", guestInfo)
    
    setGuestInfoState(prevState => {
      const updatedState = { ...prevState, ...newInfo }
      console.log("✅ Updated guestInfo state:", updatedState)
      return updatedState
    })
  }, [guestInfo])

  // Function to create initial pending booking (guest only)
  const createInitialPendingBooking = async (userId: string, guestInfoData: Partial<GuestInfo>) => {
    if (!isGuestBooking) return // Only for guests
    
    try {
      console.log("📝 Creating initial pending booking for guest:", userId)
      
      const result = await saveAbandonedBooking(userId, {
        guestInfo: guestInfoData,
        guestAddress: {},
        bookingOptions: {},
        calculatedPrice: null,
        currentStep: 1,
      })
      
      if (result.success) {
        console.log("✅ Initial pending booking created:", result.bookingId)
        toast({
          title: "התחלת תהליך הזמנה",
          description: "ההזמנה נשמרה במערכת ותופיע בעמוד הזמנות המנהל",
        })
      }
    } catch (error) {
      console.error("❌ Error creating initial pending booking:", error)
    }
  }

  // Function to handle guest info submission and proceed to next step
  const handleGuestInfoSubmit = useCallback(async (newInfo: Partial<GuestInfo>) => {
    console.log("🔄 handleGuestInfoSubmit called with:", newInfo)
    
    // Update the state
    setGuestInfoState(prevState => {
      const updatedState = { ...prevState, ...newInfo }
      console.log("✅ Updated guestInfo state in handleGuestInfoSubmit:", updatedState)
      
      // For guest bookings, create guest user after step 1
      if (isGuestBooking && currentStep === 1 && !guestUserId) {
        setTimeout(async () => {
          if (updatedState.firstName && updatedState.lastName && updatedState.email && updatedState.phone) {
            console.log("👤 Creating guest user...")
            const guestUserData = {
              firstName: updatedState.firstName,
              lastName: updatedState.lastName,
              email: updatedState.email,
              phone: updatedState.phone,
              birthDate: updatedState.birthDate,
              gender: updatedState.gender,
            }
            
            try {
              const result = await createGuestUser(guestUserData)
              
              if (result.success && result.userId) {
                console.log("✅ Guest user created/found:", result.userId)
                setGuestUserId(result.userId)
                localStorage.setItem('guestUserId', result.userId)
                await createInitialPendingBooking(result.userId, updatedState)
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
          }
        }, 100)
      }
      
      return updatedState
    })
    
    // Proceed to next step
    nextStep()
  }, [currentStep, guestUserId, isGuestBooking])

  // Effect to fetch time slots
  useEffect(() => {
    if (bookingOptions.bookingDate && bookingOptions.selectedTreatmentId) {
      const fetchSlots = async () => {
        setIsTimeSlotsLoading(true)
        setTimeSlots([])
        setWorkingHoursNote(undefined)
        
        const localDate = bookingOptions.bookingDate!
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
        setIsTimeSlotsLoading(false)
      }
      fetchSlots()
    } else {
      setTimeSlots([])
      setWorkingHoursNote(undefined)
    }
  }, [bookingOptions.bookingDate, bookingOptions.selectedTreatmentId, bookingOptions.selectedDurationId, toast, t])

  // Price calculation function
  const triggerPriceCalculation = useCallback(async () => {
    if (
      !bookingOptions.selectedTreatmentId ||
      !bookingOptions.bookingDate ||
      !bookingOptions.bookingTime ||
      (!currentUser?.id && !guestUserId)
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
      treatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
      bookingDateTime,
      couponCode: bookingOptions.appliedCouponCode,
      giftVoucherCode:
        bookingOptions.source === "gift_voucher_redemption" && bookingOptions.selectedGiftVoucherId
          ? initialData.usableGiftVouchers?.find((gv) => gv._id.toString() === bookingOptions.selectedGiftVoucherId)?.code
          : undefined,
      userSubscriptionId:
        bookingOptions.source === "subscription_redemption" ? bookingOptions.selectedUserSubscriptionId : undefined,
      userId: currentUser?.id || guestUserId || undefined,
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
  }, [bookingOptions, currentUser?.id, guestUserId, toast, initialData.activeTreatments, initialData.usableGiftVouchers, t])

  // Effect for price calculation
  useEffect(() => {
    const shouldCalculatePrice = isGuestBooking ? currentStep >= 4 : currentStep >= 3
    if (shouldCalculatePrice) {
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
    isGuestBooking,
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

  // Auto create guest user for guests (enhanced version)
  useEffect(() => {
    if (!isGuestBooking) return
    
    const attemptAutoCreate = async () => {
      if (
        !guestUserId &&
        !guestUserCreatedRef.current &&
        guestInfo.firstName &&
        guestInfo.lastName &&
        guestInfo.email &&
        guestInfo.phone
      ) {
        guestUserCreatedRef.current = true
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
            setGuestUserId(result.userId)
            localStorage.setItem('guestUserId', result.userId)
            await createInitialPendingBooking(result.userId, guestInfo)
          } else {
            guestUserCreatedRef.current = false
          }
        } catch (error) {
          console.error('❌ Auto guest user creation failed:', error)
          guestUserCreatedRef.current = false
        }
      }
    }

    attemptAutoCreate()
  }, [guestInfo.firstName, guestInfo.lastName, guestInfo.email, guestInfo.phone, guestUserId, isGuestBooking])

  // Save form state for guests
  useEffect(() => {
    if (!isGuestBooking || !guestUserId) return
    
    const saveFormState = async () => {
      try {
        await saveAbandonedBooking(guestUserId, {
          guestInfo,
          guestAddress,
          bookingOptions,
          calculatedPrice,
          currentStep,
        })
      } catch (error) {
        console.error("Error saving form state:", error)
      }
    }

    const timeoutId = setTimeout(saveFormState, 2000)
    return () => clearTimeout(timeoutId)
  }, [guestInfo, guestAddress, bookingOptions, calculatedPrice, currentStep, guestUserId, isGuestBooking])

  const nextStep = async () => {
    const shouldSkipPayment = 
      currentStep === TOTAL_STEPS_WITH_PAYMENT - 1 && 
      calculatedPrice?.finalAmount === 0 &&
      calculatedPrice?.isFullyCoveredByVoucherOrSubscription

    if (shouldSkipPayment) {
      handleFinalSubmit(true)
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, CONFIRMATION_STEP_NUMBER))
    }
  }

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  // Create pending booking for guests
  const createPendingBooking = async () => {
    if (!isGuestBooking) return null
    
    console.log("🔄 Creating pending booking...")
    
    if (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.email || !guestInfo.phone) {
      toast({
        variant: "destructive",
        title: t("bookings.errors.missingGuestInfo"),
        description: t("bookings.errors.completeGuestInfo"),
      })
      return null
    }

    if (
      !bookingOptions.selectedTreatmentId ||
      !bookingOptions.bookingDate ||
      !bookingOptions.bookingTime
    ) {
      toast({
        variant: "destructive",
        title: t("bookings.errors.incompleteBookingDetails"),
        description: t("bookings.errors.completeAllFields"),
      })
      return null
    }

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
      }

      const result = await createGuestBooking(payload)
      
      if (result.success && result.booking) {
        setPendingBookingId(result.booking._id.toString())
        return result.booking._id.toString()
      } else {
        toast({
          variant: "destructive",
          title: t("bookings.errors.createBookingFailed"),
          description: result.error || t("bookings.errors.tryAgain"),
        })
        return null
      }
    } catch (error) {
      console.error("❌ Error creating pending booking:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.createBookingFailed"),
        description: t("bookings.errors.tryAgain"),
      })
      return null
    }
  }

  // Final submit function
  const handleFinalSubmit = async (skipPaymentUI = false) => {
    if (currentStep === CONFIRMATION_STEP_NUMBER) return

    setIsLoading(true)
    
    try {
      const bookingDateTime = new Date(bookingOptions.bookingDate!)
      const [hours, minutes] = bookingOptions.bookingTime!.split(":").map(Number)
      bookingDateTime.setHours(hours, minutes, 0, 0)

      if (isGuestBooking) {
        // Guest booking flow
        const payload = {
          userId: guestUserId || "guest",
          treatmentId: bookingOptions.selectedTreatmentId!,
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
            paymentStatus: calculatedPrice!.finalAmount === 0 ? "not_required" : "paid",
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
        }

        const result = await createGuestBooking(payload)
        
        if (result.success && result.booking) {
          setBookingResult(result.booking)
          setCurrentStep(CONFIRMATION_STEP_NUMBER)
          localStorage.removeItem('guestUserId')
        } else {
          throw new Error(result.error || "Failed to create booking")
        }
      } else {
        // Member booking flow
        const payload: CreateBookingPayloadType = {
          userId: currentUser!.id,
          treatmentId: bookingOptions.selectedTreatmentId!,
          selectedDurationId: bookingOptions.selectedDurationId,
          bookingDateTime,
          selectedAddressId: bookingOptions.selectedAddressId,
          therapistGenderPreference: bookingOptions.therapistGenderPreference || "any",
          notes: bookingOptions.notes,
          priceDetails: calculatedPrice!,
          paymentDetails: {
            paymentMethodId: bookingOptions.selectedPaymentMethodId,
            paymentStatus: calculatedPrice!.finalAmount === 0 ? "not_required" : "paid",
          },
          source: bookingOptions.source || "new_purchase",
          redeemedUserSubscriptionId:
            bookingOptions.source === "subscription_redemption" ? bookingOptions.selectedUserSubscriptionId : undefined,
          redeemedGiftVoucherId:
            bookingOptions.source === "gift_voucher_redemption" ? bookingOptions.selectedGiftVoucherId : undefined,
          appliedCouponId: calculatedPrice!.appliedCouponId,
          isFlexibleTime: bookingOptions.isFlexibleTime || false,
          flexibilityRangeHours: bookingOptions.flexibilityRangeHours,
          recipientName: bookingOptions.isBookingForSomeoneElse ? bookingOptions.recipientName : undefined,
          recipientPhone: bookingOptions.isBookingForSomeoneElse ? bookingOptions.recipientPhone : undefined,
          recipientEmail: bookingOptions.isBookingForSomeoneElse ? bookingOptions.recipientEmail : undefined,
          recipientBirthDate: bookingOptions.isBookingForSomeoneElse ? bookingOptions.recipientBirthDate : undefined,
        }

        const result = await createBooking(payload)
        
        if (result.success && result.booking) {
          setBookingResult(result.booking)
          setCurrentStep(CONFIRMATION_STEP_NUMBER)
        } else {
          throw new Error(result.error || "Failed to create booking")
        }
      }
    } catch (error) {
      console.error("❌ Error in final submit:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.createBookingFailed"),
        description: error instanceof Error ? error.message : t("bookings.errors.tryAgain"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render appropriate step based on current step (same flow for everyone)
  const renderStep = () => {
    if (currentStep === CONFIRMATION_STEP_NUMBER) {
      return (
        <GuestBookingConfirmation
          bookingResult={bookingResult!}
          initialData={initialData}
        />
      )
    }

    // Same flow for both guests and members
    switch (currentStep) {
      case 1:
        return (
          <GuestInfoStep
            guestInfo={guestInfo}
            setGuestInfo={setGuestInfo}
            onNext={handleGuestInfoSubmit}
            // For members, make personal info read-only but allow booking for someone else
            defaultBookingForSomeoneElse={false}
            hideRecipientBirthGender={false}
            showGiftOptions={false}
            isRegisteredUser={!isGuestBooking}
          />
        )
      case 2:
        return (
          <GuestAddressStep
            guestAddress={guestAddress}
            setGuestAddress={setGuestAddress}
            onNext={nextStep}
            onPrev={prevStep}
            // For members, show saved addresses as options
            savedAddresses={currentUser ? initialData.userAddresses : undefined}
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
            // For members, show subscription/voucher options
            showSourceOptions={!isGuestBooking}
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
            createPendingBooking={createPendingBooking}
            pendingBookingId={pendingBookingId}
            // For members, show saved payment methods
            savedPaymentMethods={currentUser ? initialData.userPaymentMethods : undefined}
          />
        )
    }

    return null
  }

  const getStepTitle = () => {
    if (currentStep === CONFIRMATION_STEP_NUMBER) {
      return t("bookings.confirmation")
    }

    // Same step titles for everyone
    switch (currentStep) {
      case 1: return t("guestInfo.title")
      case 2: return t("guestAddress.title")
      case 3: return t("bookings.selectTreatment")
      case 4: return t("bookings.selectDateTime")
      case 5: return t("bookings.summary")
      case 6: return t("bookings.payment")
      default: return ""
    }
  }

  const progressPercentage = (currentStep / TOTAL_STEPS_WITH_PAYMENT) * 100

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isGuestBooking ? t("bookings.guestBookingTitle") : t("bookings.memberBookingTitle")}
        </h1>
        <p className="text-gray-600">
          {isGuestBooking ? t("bookings.guestBookingDescription") : t("bookings.memberBookingDescription")}
        </p>
      </div>

      {/* Progress Bar */}
      {currentStep <= TOTAL_STEPS_WITH_PAYMENT && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{getStepTitle()}</span>
            <span>{currentStep} / {TOTAL_STEPS_WITH_PAYMENT}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {renderStep()}
      </div>

      {/* Recovery Dialog for Guests */}
      {isGuestBooking && showRecoveryDialog && (
        <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                {t("bookings.recoveryDialog.title")}
              </DialogTitle>
              <DialogDescription>
                {t("bookings.recoveryDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRecoveryDialog(false)}>
                {t("bookings.recoveryDialog.startFresh")}
              </Button>
              <Button onClick={() => setShowRecoveryDialog(false)}>
                {t("bookings.recoveryDialog.recover")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 