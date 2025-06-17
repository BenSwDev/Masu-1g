"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails, TimeSlot } from "@/types/booking"
import { useToast } from "@/hooks/use-toast"

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

import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"

interface GuestBookingWizardProps {
  initialData: BookingInitialData
  voucher?: GiftVoucherPlain
  userSubscription?: IUserSubscription & { treatmentId?: any }
}

const TOTAL_STEPS_WITH_PAYMENT = 6
const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS_WITH_PAYMENT + 1

const TIMEZONE = "Asia/Jerusalem"

export default function GuestBookingWizard({ initialData, voucher, userSubscription }: GuestBookingWizardProps) {
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)

  const prefilledGuestInfo = useMemo<Partial<GuestInfo>>(() => {
    if (voucher?.isGift && voucher.recipientName) {
      const [first, ...rest] = voucher.recipientName.split(" ")
      return {
        firstName: first,
        lastName: rest.join(" "),
        phone: voucher.recipientPhone,
        email: "", // Gift vouchers usually don't have recipient email
        isBookingForSomeoneElse: false, // No booking for someone else when using voucher/subscription
      }
    }
    if (voucher?.guestInfo) {
      // For non-gift vouchers purchased by guests
      const [first, ...rest] = voucher.guestInfo.name.split(" ")
      return {
        firstName: first,
        lastName: rest.join(" "),
        email: voucher.guestInfo.email,
        phone: voucher.guestInfo.phone,
        isBookingForSomeoneElse: false,
      }
    }
    if (userSubscription?.guestInfo) {
      const [first, ...rest] = userSubscription.guestInfo.name.split(" ")
      return {
        firstName: first,
        lastName: rest.join(" "),
        email: userSubscription.guestInfo.email,
        phone: userSubscription.guestInfo.phone,
        isBookingForSomeoneElse: false, // No booking for someone else when using voucher/subscription
      }
    }
    return {
      isBookingForSomeoneElse: false, // Default to false for redemption
    }
  }, [voucher, userSubscription])

  const lockedFields = useMemo<(keyof GuestInfo)[]>(() => {
    if (voucher?.isGift && voucher.recipientName) {
      // For gift vouchers - lock name and phone, but email might be empty so allow editing
      const fields: (keyof GuestInfo)[] = ["firstName", "lastName", "phone"]
      if (voucher.recipientEmail) {
        fields.push("email")
      }
      return fields
    }
    if (voucher?.guestInfo) {
      // For non-gift vouchers purchased by guests - lock all fields
      return ["firstName", "lastName", "phone", "email"]
    }
    if (userSubscription?.guestInfo) {
      return ["firstName", "lastName", "email", "phone"]
    }
    return []
  }, [voucher, userSubscription])

  // Hide "booking for someone else" option when redeeming voucher/subscription
  const hideBookingForSomeoneElse = useMemo(() => {
    return Boolean(voucher || userSubscription)
  }, [voucher, userSubscription])

  const [guestInfo, setGuestInfoState] = useState<Partial<GuestInfo>>(prefilledGuestInfo)
  const [guestAddress, setGuestAddress] = useState<Partial<GuestAddress>>({})
  const defaultBookingOptions: Partial<SelectedBookingOptions> = {
    therapistGenderPreference: initialData.userPreferences?.therapistGender || "any",
    isFlexibleTime: false,
    source: voucher
      ? "gift_voucher_redemption"
      : userSubscription
      ? "subscription_redemption"
      : "new_purchase",
    selectedGiftVoucherId: voucher ? voucher._id.toString() : undefined,
    selectedUserSubscriptionId: userSubscription ? userSubscription._id.toString() : undefined,
    selectedTreatmentId:
      voucher?.treatmentId?.toString() || userSubscription?.treatmentId?.toString(),
    selectedDurationId:
      voucher?.selectedDurationId?.toString() || userSubscription?.selectedDurationId?.toString(),
  }

  const [bookingOptions, setBookingOptions] = useState<Partial<SelectedBookingOptions>>(defaultBookingOptions)
  
  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPriceDetails | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isTimeSlotsLoading, setIsTimeSlotsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<IBooking | null>(null)
  const [workingHoursNote, setWorkingHoursNote] = useState<string | undefined>(undefined)
  
  // New state for guest user management
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
  const [abandonedBooking, setAbandonedBooking] = useState<any>(null)
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null) // Track pending booking ID

  const { toast } = useToast()

  // Enhanced setGuestInfo function with proper state merging and debugging
  const setGuestInfo = useCallback((newInfo: Partial<GuestInfo>) => {
    
    setGuestInfoState(prevState => {
      const updatedState = { ...prevState, ...newInfo }
      return updatedState
    })
  }, [guestInfo])

  // Function to handle guest info submission and proceed to next step
  const handleGuestInfoSubmit = useCallback(async (newInfo: Partial<GuestInfo>) => {
    
    // Update the state
    setGuestInfoState(prevState => {
      const updatedState = { ...prevState, ...newInfo }
      
      // Now proceed to next step with the updated data
      setTimeout(async () => {
        
        // Create guest user after step 1 AND create pending booking
        if (currentStep === 1 && !guestUserId) {
          
          if (updatedState.firstName && updatedState.lastName && updatedState.email && updatedState.phone) {
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
                setGuestUserId(result.userId)
                localStorage.setItem('guestUserId', result.userId)
                
                // Create initial pending booking immediately
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
        }
        
        // Move to next step
        setCurrentStep(prev => Math.min(prev + 1, CONFIRMATION_STEP_NUMBER))
      }, 0)
      
      return updatedState
    })
  }, [currentStep, guestUserId, toast])

  // Function to create initial pending booking
  const createInitialPendingBooking = async (userId: string, guestInfoData: Partial<GuestInfo>) => {
    try {
      
      // Create a minimal booking with "abandoned_pending_payment" status
      // This ensures the booking appears in admin bookings list immediately
      const result = await saveAbandonedBooking(userId, {
        guestInfo: guestInfoData,
        guestAddress: {}, // Empty initially
        bookingOptions: {}, // Empty initially  
        calculatedPrice: null, // Empty initially
        currentStep: 1,
      })
      
      if (result.success) {
        toast({
          title: "התחלת תהליך הזמנה",
          description: "ההזמנה נשמרה במערכת ותופיע בעמוד הזמנות המנהל",
        })
      }
    } catch (error) {
      console.error("❌ Error creating initial pending booking:", error)
    }
  }

  // Check for abandoned booking on component mount
  useEffect(() => {
    const checkForAbandonedBooking = async () => {
      const savedUserId = localStorage.getItem('guestUserId')
      
      if (savedUserId) {
        try {
          const result = await getAbandonedBooking(savedUserId)
          
          if (result.success && result.booking) {
            setAbandonedBooking(result.booking)
            setGuestUserId(savedUserId)
            setShowRecoveryDialog(true)
          }
        } catch (error) {
          console.error("❌ Error checking for abandoned booking:", error)
        }
      }
    }
    
    checkForAbandonedBooking()
  }, [])

  const guestUserCreatedRef = useRef(false)

  // Auto create guest user and initial booking once mandatory info is provided
  useEffect(() => {
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
  }, [guestInfo.firstName, guestInfo.lastName, guestInfo.email, guestInfo.phone, guestUserId])

  // Save form state whenever it changes (after step 1)
  useEffect(() => {
    if (guestUserId && currentStep > 1) {
      const saveFormState = async () => {
        try {
          const result = await saveAbandonedBooking(guestUserId, {
            guestInfo,
            guestAddress,
            bookingOptions,
            calculatedPrice,
            currentStep,
          })
          
          if (!result.success) {
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
      giftVoucherCode: voucher?.code,
      userSubscriptionId:
        bookingOptions.source === "subscription_redemption" ? bookingOptions.selectedUserSubscriptionId : undefined,
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
    setGuestInfo(prefilledGuestInfo)
    setGuestAddress({})
    setBookingOptions(defaultBookingOptions)
    setCalculatedPrice(null)
    setCurrentStep(1)
  }

  const nextStep = async () => {
    
    // Create guest user after step 1 AND create pending booking
    if (currentStep === 1 && !guestUserId) {
      
      if (guestInfo.firstName && guestInfo.lastName && guestInfo.email && guestInfo.phone) {
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
            
            // Create initial pending booking immediately
            await createInitialPendingBooking(result.userId, guestInfo)
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
        toast({
          variant: "destructive",
          title: t("bookings.errors.missingGuestInfo"),
          description: t("bookings.errors.completeGuestInfo"),
        })
        return
      }
    }

    if (
      currentStep === TOTAL_STEPS_WITH_PAYMENT - 1 && // Summary step
      calculatedPrice?.finalAmount === 0 &&
      calculatedPrice?.isFullyCoveredByVoucherOrSubscription
    ) {
      // Skip payment step, go directly to confirmation by simulating final submit
      handleFinalSubmit()
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, CONFIRMATION_STEP_NUMBER))
  }

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  // Create booking before payment
  const createPendingBooking = async () => {
    
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
        source: bookingOptions.source || "new_purchase",
        redeemedUserSubscriptionId:
          bookingOptions.source === "subscription_redemption" ? bookingOptions.selectedUserSubscriptionId : undefined,
        redeemedGiftVoucherId:
          bookingOptions.source === "gift_voucher_redemption" ? bookingOptions.selectedGiftVoucherId : undefined,
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


      const result = await createGuestBooking(payload)
      
      
      if (result.success && result.booking) {
        setPendingBookingId(result.booking._id.toString())
        return result.booking._id.toString()
      } else {
        toast({
          variant: "destructive",
          title: t(result.error || "bookings.errors.bookingFailedTitle") || result.error || "Booking failed",
          description: result.issues
            ? result.issues.map((issue) => issue.message).join(", ")
            : t(result.error || "bookings.errors.bookingFailedTitle"),
        })
        return null
      }
    } catch (error) {
      console.error("💥 Booking creation error:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.unexpectedError"),
        description: t("bookings.errors.tryAgain"),
      })
      return null
    }
  }

  // Handle final confirmation after successful payment
  const handleFinalSubmit = async () => {
    
    if (!pendingBookingId) {
      return
    }

    setIsLoading(true)

    try {
      // Import the updateBookingStatusAfterPayment function
      const { updateBookingStatusAfterPayment } = await import("@/actions/booking-actions")
      
      const result = await updateBookingStatusAfterPayment(
        pendingBookingId,
        "success",
        `DEMO-${Date.now()}` // Demo transaction ID
      )
      
      if (result.success && result.booking) {
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
        toast({
          variant: "destructive",
          title: "שגיאה בעדכון ההזמנה",
          description: result.error || "לא ניתן לעדכן את סטטוס ההזמנה",
        })
      }
    } catch (error) {
      console.error("💥 Booking finalization error:", error)
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
            lockedFields={lockedFields}
            hideBookingForSomeoneElse={hideBookingForSomeoneElse}
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
            voucher={voucher}
            userSubscription={userSubscription}
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
            voucher={voucher}
            userSubscription={userSubscription}
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
            isRedeeming={Boolean(voucher || userSubscription)}
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
