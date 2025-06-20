"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
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
import { GuestPaymentProcessingStep } from "./steps/guest-payment-processing-step"
import { GuestFinalConfirmationStep } from "./steps/guest-final-confirmation-step"
import { GuestBookingConfirmation } from "./steps/guest-booking-confirmation"
import NotificationPreferencesSelector from "./notification-preferences-selector"

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
import { AlertCircle, RotateCcw, CheckCircle, ArrowRight, ArrowLeft, CreditCard } from "lucide-react"
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
  
  // ➕ Gift functionality (Step 3)
  isGift?: boolean
  giftGreeting?: string
  giftSendWhen?: "now" | Date
  giftHidePrice?: boolean
  
  // Notification preferences (moved to Step 6)
  bookerNotificationMethod?: "email" | "sms" | "both"
  bookerNotificationLanguage?: "he" | "en" | "ru"
  recipientNotificationMethod?: "email" | "sms" | "both"
  recipientNotificationLanguage?: "he" | "en" | "ru"
  
  // ➕ Consents (Step 6)
  customerAlerts?: "sms" | "email" | "none"
  patientAlerts?: "sms" | "email" | "none"
  marketingOptIn?: boolean
  termsAccepted?: boolean
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

interface UniversalBookingWizardProps {
  initialData: BookingInitialData
  voucher?: GiftVoucherPlain
  userSubscription?: IUserSubscription & { treatmentId?: any }
  currentUser?: any // User session data if logged in
}

// 🎯 MODERN STREAMLINED FLOW - Reduced to 4 steps + confirmation
const TOTAL_STEPS_WITH_PAYMENT = 4 // ✅ Streamlined: 1=Service+Time, 2=Details+Address, 3=Preferences, 4=Payment
const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS_WITH_PAYMENT + 1

const TIMEZONE = "Asia/Jerusalem"

// 🎨 Modern step definitions with better UX
const MODERN_STEPS = [
  {
    id: 1,
    title: "זמן וטיפול",
    subtitle: "בחר טיפול ותאריך",
    icon: "🗓️",
    estimatedTime: "2 דק'"
  },
  {
    id: 2, 
    title: "פרטים וכתובת",
    subtitle: "פרטיך וכתובת הטיפול",
    icon: "👤",
    estimatedTime: "3 דק'"
  },
  {
    id: 3,
    title: "העדפות",
    subtitle: "מתנה והתראות",
    icon: "✨",
    estimatedTime: "1 דק'"
  },
  {
    id: 4,
    title: "סיכום ותשלום",
    subtitle: "אישור וסיום ההזמנה",
    icon: "💳",
    estimatedTime: "2 דק'"
  }
]

export default function UniversalBookingWizard({ 
  initialData, 
  voucher, 
  userSubscription, 
  currentUser 
}: UniversalBookingWizardProps) {
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)

  const prefilledGuestInfo = useMemo<Partial<GuestInfo>>(() => {
    // Priority 1: Logged-in user (highest priority)
    if (currentUser) {
      // ✅ Phone normalization: Convert +972525131777 to 525131777 for UI
      let normalizedPhone = currentUser.phone || ""
      if (normalizedPhone.startsWith("+972")) {
        normalizedPhone = normalizedPhone.substring(4) // Remove +972 prefix
        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = normalizedPhone.substring(1) // Remove leading 0 if exists
        }
      }
      
      return {
        firstName: currentUser.name?.split(" ")[0] || "",
        lastName: currentUser.name?.split(" ").slice(1).join(" ") || "",
        email: currentUser.email || "",
        phone: normalizedPhone, // ✅ Normalized phone without +972
        birthDate: currentUser.dateOfBirth ? new Date(currentUser.dateOfBirth) : undefined, // ✅ Extract birth date
        gender: currentUser.gender || undefined, // ✅ Extract gender
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: currentUser.notificationPreferences?.methods?.includes("sms") ? 
          (currentUser.notificationPreferences?.methods?.includes("email") ? "both" : "sms") : "email",
        bookerNotificationLanguage: currentUser.notificationPreferences?.language || "he"
      }
    }
    
    // Priority 2: Gift voucher recipient data
    if (voucher?.isGift && voucher.recipientName) {
      const [first, ...rest] = voucher.recipientName.split(" ")
      // ✅ Phone normalization for voucher recipient
      let normalizedPhone = voucher.recipientPhone || ""
      if (normalizedPhone.startsWith("+972")) {
        normalizedPhone = normalizedPhone.substring(4)
        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = normalizedPhone.substring(1)
        }
      }
      
      return {
        firstName: first,
        lastName: rest.join(" "),
        email: voucher.recipientEmail || "",
        phone: normalizedPhone, // ✅ Normalized phone
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: "email",
        bookerNotificationLanguage: "he"
      }
    }
    
    // Priority 3: Voucher guest info
    if ((voucher as any)?.guestInfo) {
      const guestInfo = (voucher as any).guestInfo
      const [first, ...rest] = guestInfo.name.split(" ")
      // ✅ Phone normalization for guest info
      let normalizedPhone = guestInfo.phone || ""
      if (normalizedPhone.startsWith("+972")) {
        normalizedPhone = normalizedPhone.substring(4)
        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = normalizedPhone.substring(1)
        }
      }
      
      return {
        firstName: first,
        lastName: rest.join(" "),
        email: guestInfo.email,
        phone: normalizedPhone, // ✅ Normalized phone
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: "email",
        bookerNotificationLanguage: "he"
      }
    }
    
    // Priority 4: Subscription guest info
    if ((userSubscription as any)?.guestInfo) {
      const guestInfo = (userSubscription as any).guestInfo
      const [first, ...rest] = guestInfo.name.split(" ")
      // ✅ Phone normalization for subscription guest info
      let normalizedPhone = guestInfo.phone || ""
      if (normalizedPhone.startsWith("+972")) {
        normalizedPhone = normalizedPhone.substring(4)
        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = normalizedPhone.substring(1)
        }
      }
      
      return {
        firstName: first,
        lastName: rest.join(" "),
        email: guestInfo.email,
        phone: normalizedPhone, // ✅ Normalized phone
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: "email",
        bookerNotificationLanguage: "he"
      }
    }
    
    // Default for guests
    return {
      isBookingForSomeoneElse: false,
      bookerNotificationMethod: "email",
      bookerNotificationLanguage: "he"
    }
  }, [voucher, userSubscription, currentUser])

  const lockedFields = useMemo(() => {
    // ✅ For logged-in users - make all basic fields editable but pre-filled
    // Only show as "locked" visually but allow editing
    if (currentUser) {
      return [] as const // Don't lock any fields - just pre-fill them
    }
    
    if (voucher?.isGift && voucher.recipientName) {
      // For gift vouchers - lock name and phone, but email might be empty so allow editing
      const fields = ["firstName", "lastName", "phone"] as const
      if ((voucher as any).recipientEmail) {
        return [...fields, "email"] as const
      }
      return fields
    }
    if ((voucher as any)?.guestInfo) {
      // For non-gift vouchers purchased by guests - lock all fields
      return ["firstName", "lastName", "phone", "email"] as const
    }
    if ((userSubscription as any)?.guestInfo) {
      return ["firstName", "lastName", "email", "phone"] as const
    }
    return [] as const
  }, [voucher, userSubscription, currentUser])

  // Hide "booking for someone else" option when redeeming voucher/subscription
  const hideBookingForSomeoneElse = useMemo(() => {
    return Boolean(voucher || userSubscription)
  }, [voucher, userSubscription])

  const [guestInfo, setGuestInfoState] = useState<Partial<GuestInfo>>(prefilledGuestInfo)
  // Pre-fill address for logged-in users
  const prefilledAddress = useMemo<Partial<GuestAddress>>(() => {
    if (currentUser && initialData.userAddresses && initialData.userAddresses.length > 0) {
      const defaultAddress = initialData.userAddresses.find(addr => addr.isDefault) || initialData.userAddresses[0]
      if (defaultAddress) {
        return {
          city: defaultAddress.city,
          street: defaultAddress.street,
          houseNumber: defaultAddress.streetNumber || "",
          addressType: defaultAddress.addressType as any,
          floor: defaultAddress.addressType === "apartment" ? defaultAddress.apartmentDetails?.floor?.toString() : undefined,
          apartmentNumber: defaultAddress.addressType === "apartment" ? defaultAddress.apartmentDetails?.apartmentNumber : undefined,
          entrance: defaultAddress.addressType === "apartment" ? defaultAddress.apartmentDetails?.entrance : undefined,
          parking: defaultAddress.hasPrivateParking || false,
          notes: defaultAddress.additionalNotes || ""
        }
      }
    }
    return {}
     }, [currentUser, initialData.userAddresses])
  
  const [guestAddress, setGuestAddress] = useState<Partial<GuestAddress>>(prefilledAddress)
  
  // Update address when prefilledAddress changes
  useEffect(() => {
    if (Object.keys(prefilledAddress).length > 0 && Object.keys(guestAddress).length === 0) {
      setGuestAddress(prefilledAddress)
    }
  }, [prefilledAddress, guestAddress])
  
  const defaultBookingOptions: Partial<SelectedBookingOptions> = {
    therapistGenderPreference: initialData.userPreferences?.therapistGender || "any",
    isFlexibleTime: false,
    source: voucher
      ? "gift_voucher_redemption"
      : userSubscription
      ? "subscription_redemption"
      : "new_purchase",
    selectedGiftVoucherId: voucher ? voucher._id.toString() : undefined,
    selectedUserSubscriptionId: userSubscription ? String(userSubscription._id) : undefined,
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
        
        // Create guest user after step 3 (Personal Info step) for guests only 
        if (currentStep === 3 && !currentUser && !guestUserId) {
          
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
                toast({
                  variant: "destructive",
                  title: "שגיאה ביצירת משתמש אורח",
                  description: result.error || "נסה שוב",
                })
                // Don't block progression if guest creation fails
              }
            } catch (error) {
              toast({
                variant: "destructive",
                title: "שגיאה ביצירת משתמש אורח",
                description: "אירעה שגיאה בלתי צפויה. נסה שוב.",
              })
              // Continue to next step even if user creation fails
            }
          }
        }
        
        // Move to next step
        setCurrentStep(prev => Math.min(prev + 1, CONFIRMATION_STEP_NUMBER))
      }, 0)
      
      return updatedState
    })
  }, [currentStep, guestUserId, currentUser, toast])

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
      } else {
        console.warn("Failed to save initial pending booking:", result.error)
      }
    } catch (error) {
      console.warn("Error creating initial pending booking:", error)
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
          console.warn("Error checking for abandoned booking:", error)
        }
      }
    }
    
    checkForAbandonedBooking()
  }, [])

  const guestUserCreatedRef = useRef(false)

  // Auto create guest user and initial booking once mandatory info is provided
  useEffect(() => {
    const attemptAutoCreate = async () => {
      // Validate required fields first
      if (
        !guestUserId &&
        !guestUserCreatedRef.current &&
        guestInfo.firstName?.trim() &&
        guestInfo.lastName?.trim() &&
        guestInfo.email?.trim() &&
        guestInfo.phone?.trim()
      ) {
        guestUserCreatedRef.current = true
        try {
          const result = await createGuestUser({
            firstName: guestInfo.firstName.trim(),
            lastName: guestInfo.lastName.trim(),
            email: guestInfo.email.trim(),
            phone: guestInfo.phone.trim(),
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
          console.warn('Auto guest user creation failed:', error)
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
            console.warn("Failed to save form state:", result.error)
          }
        } catch (error) {
          console.warn("Error saving form state:", error)
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
    
    // Create guest user after step 3 (Personal Info step) for guests only
    if (currentStep === 3 && !currentUser && !guestUserId) {
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
      currentStep === TOTAL_STEPS_WITH_PAYMENT && // Payment step (step 4)
      calculatedPrice?.finalAmount === 0 &&
      calculatedPrice?.isFullyCoveredByVoucherOrSubscription
    ) {
      // Skip payment, go directly to confirmation by simulating final submit
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
        // Add notification preferences
        notificationMethods: guestInfo.bookerNotificationMethod === "both" ? ["email", "sms"] :
                            guestInfo.bookerNotificationMethod === "sms" ? ["sms"] : ["email"],
        recipientNotificationMethods: guestInfo.isBookingForSomeoneElse ? 
          (guestInfo.recipientNotificationMethod === "both" ? ["email", "sms"] :
           guestInfo.recipientNotificationMethod === "sms" ? ["sms"] : ["email"]) : undefined,
        notificationLanguage: guestInfo.bookerNotificationLanguage || "he",
      } as CreateBookingPayloadType & { guestInfo: { name: string; email: string; phone: string } }


      const result = await createGuestBooking(payload)
      
      
      if (result.success && result.booking) {
        setPendingBookingId(String(result.booking._id))
        return String(result.booking._id)
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
        // 🎯 MODERN STEP 1: Treatment + Scheduling Combined
        return (
          <div className="space-y-6">
            {/* Treatment Display */}
            <div className="text-center bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6">
              <div className="text-4xl mb-3">🌟</div>
              <h2 className="text-2xl font-bold mb-2">מתי תרצה את הטיפול?</h2>
              <p className="text-muted-foreground">בחר תאריך ושעה מועדפים</p>
            </div>

            {/* Treatment Info Card */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{initialData.treatment?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {initialData.treatment?.duration} דקות • ₪{initialData.treatment?.price}
                  </p>
                  {bookingOptions.selectedDurationId && (
                    <span className="inline-block bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs mt-1">
                      {initialData.treatment?.durations?.find(d => d.id === bookingOptions.selectedDurationId)?.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduling Component */}
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
          </div>
        )
      case 2:
        // 🎯 MODERN STEP 2: Personal Details + Address Combined
        return (
          <div className="space-y-6">
            <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
              <div className="text-4xl mb-3">👤</div>
              <h2 className="text-2xl font-bold mb-2">פרטים אישיים</h2>
              <p className="text-muted-foreground">נשמח להכיר אותך ולדעת לאן להגיע</p>
            </div>

            {/* Personal Info */}
            <GuestInfoStep
              guestInfo={guestInfo}
              setGuestInfo={setGuestInfo}
              onNext={handleGuestInfoSubmit}
              onPrev={prevStep}
              lockedFields={lockedFields as any}
              hideBookingForSomeoneElse={hideBookingForSomeoneElse}
            />

            {/* Address */}
            <GuestAddressStep
              address={guestAddress}
              setAddress={setGuestAddress}
              onNext={nextStep}
              onPrev={prevStep}
            />
          </div>
        )
      case 3:
        // 🎯 MODERN STEP 3: Preferences + Gift Options
        return (
          <div className="space-y-6">
            <div className="text-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
              <div className="text-4xl mb-3">✨</div>
              <h2 className="text-2xl font-bold mb-2">העדפות נוספות</h2>
              <p className="text-muted-foreground">כמה פרטים אחרונים לחוויה מושלמת</p>
            </div>

            {/* Gift & Notification Preferences Combined */}
            <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
              {/* Gift Options */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  🎁 <span>האם זו מתנה?</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isGift"
                      checked={guestInfo.isGift || false}
                      onChange={(e) => setGuestInfo({ ...guestInfo, isGift: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="isGift" className="text-sm">זהו טיפול מתנה למישהו אחר</label>
                  </div>
                  
                  {guestInfo.isGift && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <label htmlFor="giftGreeting" className="block text-sm font-medium mb-2">מסר אישי למתנה</label>
                      <textarea
                        id="giftGreeting"
                        value={guestInfo.giftGreeting || ""}
                        onChange={(e) => setGuestInfo({ ...guestInfo, giftGreeting: e.target.value })}
                        placeholder="כתוב כאן מסר חם ואישי..."
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  📱 <span>העדפות התראות</span>
                </h3>
                <NotificationPreferencesSelector
                  value={{
                    methods: guestInfo.bookerNotificationMethod === "both" ? ["email", "sms"] :
                             guestInfo.bookerNotificationMethod === "sms" ? ["sms"] : ["email"],
                    language: guestInfo.bookerNotificationLanguage || "he"
                  }}
                  onChange={(prefs) => setGuestInfo({
                    ...guestInfo,
                    bookerNotificationMethod: prefs.methods.includes("email") && prefs.methods.includes("sms") ? "both" :
                                             prefs.methods.includes("sms") ? "sms" : "email",
                    bookerNotificationLanguage: prefs.language
                  })}
                  isForRecipient={false}
                />
              </div>
            </div>
          </div>
        )
      case 4:
        // 🎯 MODERN STEP 4: Summary + Payment Combined
        return (
          <div className="space-y-6">
            <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
              <div className="text-4xl mb-3">💳</div>
              <h2 className="text-2xl font-bold mb-2">סיכום ההזמנה</h2>
              <p className="text-muted-foreground">בדוק את הפרטים ושלם לסיום</p>
            </div>

            {/* Combined Summary + Payment */}
            <div className="space-y-4">
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
              
              <GuestPaymentStep
                calculatedPrice={calculatedPrice}
                guestInfo={guestInfo}
                setGuestInfo={setGuestInfo}
                onConfirm={handleFinalSubmit} // Go directly to final submit
                onPrev={prevStep}
                isLoading={isLoading}
                createPendingBooking={createPendingBooking}
                pendingBookingId={pendingBookingId}
                isRedeeming={Boolean(voucher || userSubscription)}
              />
            </div>
          </div>
        )
      case 5:
        // 🎯 SUCCESS PAGE
        if (bookingResult) {
          return (
            <GuestFinalConfirmationStep
              bookingDetails={{
                bookingNumber: bookingResult.bookingNumber || "000001",
                treatmentName: initialData.treatment?.name || "",
                treatmentDuration: initialData.treatment?.duration || 60,
                bookingDateTime: bookingOptions.selectedDateTime || new Date(),
                finalAmount: calculatedPrice?.finalAmount || 0,
                paymentStatus: calculatedPrice?.finalAmount === 0 ? "not_required" : "paid",
                guestInfo: {
                  firstName: guestInfo.firstName || "",
                  lastName: guestInfo.lastName || "",
                  email: guestInfo.email || "",
                  phone: guestInfo.phone || ""
                },
                address: {
                  fullAddress: `${guestAddress.street || ""} ${guestAddress.houseNumber || ""}`,
                  city: guestAddress.city || ""
                },
                isGift: guestInfo.isGift,
                giftGreeting: guestInfo.giftGreeting,
                consents: {
                  customerAlerts: guestInfo.customerAlerts || "email",
                  marketingOptIn: guestInfo.marketingOptIn || false,
                  termsAccepted: guestInfo.termsAccepted || false
                }
              }}
              onComplete={() => setCurrentStep(CONFIRMATION_STEP_NUMBER)}
            />
          )
        }
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
        return "זמן וטיפול"
      case 2:
        return "פרטים וכתובת"
      case 3:
        return "העדפות"
      case 4:
        return "סיכום ותשלום"
      case 5:
        return "אישור סופי"
      default:
        return ""
    }
  }

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1:
        return "בחר טיפול ותאריך"
      case 2:
        return "פרטיך וכתובת הטיפול"
      case 3:
        return "מתנה והתראות"
      case 4:
        return "אישור וסיום ההזמנה"
      case 5:
        return "ההזמנה הושלמה בהצלחה"
      default:
        return ""
    }
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 1:
        return "🗓️"
      case 2:
        return "👤"
      case 3:
        return "✨"
      case 4:
        return "💳"
      case 5:
        return "🎉"
      default:
        return ""
    }
  }

  const progressPercentage = ((currentStep - 1) / (TOTAL_STEPS_WITH_PAYMENT - 1)) * 100

  if (currentStep === CONFIRMATION_STEP_NUMBER) {
    return renderStep()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
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

      {/* Modern Header with Progress */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-xl md:text-2xl">{getStepIcon()}</div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">{getStepTitle()}</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{getStepSubtitle()}</p>
              </div>
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">
              {currentStep}/{TOTAL_STEPS_WITH_PAYMENT}
            </div>
          </div>
          
          {/* Modern Progress Steps - Mobile Optimized */}
          <div className="flex items-center justify-between">
            {MODERN_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center ${index === MODERN_STEPS.length - 1 ? '' : 'flex-1'}`}>
                  <div className={`
                    w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-medium transition-all
                    ${currentStep >= step.id 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {currentStep > step.id ? (
                      <CheckCircle className="h-3 w-3 md:h-5 md:w-5" />
                    ) : (
                      <span className="text-sm md:text-lg">{step.icon}</span>
                    )}
                  </div>
                  
                  <div className="mr-2 md:mr-3 hidden lg:block">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.estimatedTime}</div>
                  </div>
                </div>
                
                {index < MODERN_STEPS.length - 1 && (
                  <div className={`
                    h-1 flex-1 mx-2 md:mx-4 rounded transition-all
                    ${currentStep > step.id ? 'bg-primary' : 'bg-muted'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area - Mobile Optimized */}
      <div className="max-w-4xl mx-auto p-3 md:p-4 pb-24 min-h-[calc(100vh-200px)]">
        {/* Error Display */}
        {isLoading && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>טוען...</AlertTitle>
            <AlertDescription>מעבד את ההזמנה שלך</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="h-full">
          {renderStep()}
        </div>
      </div>

      {/* Modern Fixed Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-10 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto p-3 md:p-4">
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 text-sm md:text-base"
            >
              <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">חזור</span>
              <span className="sm:hidden">←</span>
            </Button>
            
            <div className="text-center hidden lg:block">
              <div className="text-sm text-muted-foreground">
                {MODERN_STEPS[currentStep - 1]?.subtitle}
              </div>
              <div className="text-xs text-muted-foreground">
                זמן משוער: {MODERN_STEPS[currentStep - 1]?.estimatedTime}
              </div>
            </div>
            
            <Button 
              onClick={nextStep}
              disabled={isLoading}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 bg-primary hover:bg-primary/90 text-sm md:text-base"
            >
              {currentStep === TOTAL_STEPS_WITH_PAYMENT ? (
                <>
                  <span className="hidden sm:inline">💳 שלם וסיים</span>
                  <span className="sm:hidden">💳 סיים</span>
                  <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">המשך</span>
                  <span className="sm:hidden">→</span>
                  <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
                </>
              )}
            </Button>
          </div>
          
          {/* Mobile progress with step info */}
          <div className="lg:hidden mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">{getStepSubtitle()}</span>
              <span className="text-xs text-muted-foreground">{MODERN_STEPS[currentStep - 1]?.estimatedTime}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 