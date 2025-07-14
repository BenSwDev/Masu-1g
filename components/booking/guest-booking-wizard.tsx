"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
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
  email?: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" 
  notes?: string
  isBookingForSomeoneElse?: boolean
  recipientFirstName?: string
  recipientLastName?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientBirthDate?: Date
  recipientGender?: "male" | "female" 
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

// ✅ תיקון: טיפוסים בטוחים במקום any
interface UniversalBookingWizardProps {
  initialData: BookingInitialData
  voucher?: GiftVoucherPlain
  userSubscription?: IUserSubscription & { treatmentId?: string | object }
  currentUser?: {
    id: string
    name?: string
    email?: string
    phone?: string
    gender?: "male" | "female" 
    dateOfBirth?: Date
    roles?: string[]
  } | null // User session data if logged in
  initialCategory?: string
}

const TOTAL_STEPS_WITH_PAYMENT = 6
const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS_WITH_PAYMENT + 1

const TIMEZONE = "Asia/Jerusalem"

export default function UniversalBookingWizard({
  initialData,
  voucher,
  userSubscription,
  currentUser,
  initialCategory
}: UniversalBookingWizardProps) {
  const router = useRouter()
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)
  
  // Track redemption data for locked fields logic
  const [redemptionData, setRedemptionData] = useState<any>(null)

  const prefilledGuestInfo = useMemo<Partial<GuestInfo>>(() => {
    // 🎯 PRIORITY 1: Legal redemption data (HIGHEST PRIORITY - BUSINESS RULE ENFORCEMENT)
    // This ensures only the rightful owner can redeem vouchers/subscriptions
    
    // Check redemption data from code input first (most authoritative)
    if (redemptionData) {
      const redemption = redemptionData
      
      // For gift vouchers - ONLY the recipient can redeem
      if ((redemption.type === "treatment_voucher" || redemption.type === "monetary_voucher") && redemption.data?.isGift && redemption.data?.recipientName) {
        const [first, ...rest] = redemption.data.recipientName.split(" ")
        return {
          firstName: first,
          lastName: rest.join(" "),
          phone: redemption.data.recipientPhone || "",
          email: redemption.data.recipientEmail || "",
          isBookingForSomeoneElse: false,
          bookerNotificationMethod: "email",
          bookerNotificationLanguage: "he"
        }
      }
      
      // For subscriptions - ONLY the purchaser can redeem
      if (redemption.type === "subscription") {
        // If subscription was purchased by a logged-in user
        if (redemption.data?.userId && currentUser?.id === redemption.data.userId.toString()) {
          // Use current user data (they are the rightful owner)
          const [first, ...rest] = (currentUser?.name || "").split(" ")
          return {
            firstName: first || "",
            lastName: rest.join(" ") || "",
            email: currentUser?.email || "",
            phone: currentUser?.phone || "",
            birthDate: (currentUser as any)?.dateOfBirth ? new Date((currentUser as any).dateOfBirth) : undefined,
            gender: (currentUser as any)?.gender,
            isBookingForSomeoneElse: false,
            bookerNotificationMethod: "email",
            bookerNotificationLanguage: "he"
          }
        }
        // If subscription was purchased by a guest
        else if (redemption.data?.guestInfo) {
          const guestInfo = redemption.data.guestInfo
          const [first, ...rest] = guestInfo.name.split(" ")
          return {
            firstName: first,
            lastName: rest.join(" "),
            email: guestInfo.email || "",
            phone: guestInfo.phone || "",
            isBookingForSomeoneElse: false,
            bookerNotificationMethod: "email",
            bookerNotificationLanguage: "he"
          }
        }
      }
      
      // Since ALL vouchers are gifts, this section is no longer needed
      // All voucher ownership is handled by the recipient logic above
    }
    
    // Check voucher passed as props (legacy flow) - ALL vouchers are gifts
    if (voucher?.recipientName) {
      const [first, ...rest] = voucher.recipientName.split(" ")
      return {
        firstName: first,
        lastName: rest.join(" "),
        phone: voucher.recipientPhone,
        email: voucher.recipientEmail || "", // Gift vouchers may have recipient email
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: "email",
        bookerNotificationLanguage: "he"
      }
    }
    
    // Check voucher purchased by guest (legacy flow)
    if ((voucher as any)?.guestInfo) {
      const guestInfo = (voucher as any).guestInfo
      const [first, ...rest] = guestInfo.name.split(" ")
      return {
        firstName: first,
        lastName: rest.join(" "),
        email: guestInfo.email,
        phone: guestInfo.phone,
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: "email",
        bookerNotificationLanguage: "he"
      }
    }
    
    // Check subscription purchased by guest (legacy flow)
    if ((userSubscription as any)?.guestInfo) {
      const guestInfo = (userSubscription as any).guestInfo
      const [first, ...rest] = guestInfo.name.split(" ")
      return {
        firstName: first,
        lastName: rest.join(" "),
        email: guestInfo.email,
        phone: guestInfo.phone,
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: "email",
        bookerNotificationLanguage: "he"
      }
    }
    
    // 👤 PRIORITY 2: Logged in user data (ONLY if no redemption)
    if (currentUser) {
      const [first, ...rest] = (currentUser.name || "").split(" ")
      return {
        firstName: first || "",
        lastName: rest.join(" ") || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        birthDate: (currentUser as any).dateOfBirth ? new Date((currentUser as any).dateOfBirth) : undefined,
        gender: (currentUser as any).gender,
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: "email",
        bookerNotificationLanguage: "he"
      }
    }
    
    // 👥 PRIORITY 3: Default for guests (no locked fields)
    return {
      isBookingForSomeoneElse: false,
      bookerNotificationMethod: "email",
      bookerNotificationLanguage: "he"
    }
  }, [voucher, userSubscription, currentUser, redemptionData])

  const [lockedFields, setLockedFields] = useState<readonly string[]>(() => {
    // Initial calculation
    if (redemptionData) {
      const redemption = redemptionData
      // For ALL vouchers (all are gifts) - LOCK recipient info (only recipient can redeem)
      if ((redemption.type === "treatment_voucher" || redemption.type === "monetary_voucher") && redemption.data?.recipientName) {
        const fields = ["firstName", "lastName"] as const
        const fieldsWithPhone = redemption.data?.recipientPhone ? [...fields, "phone"] as const : fields
        const fieldsWithEmail = redemption.data?.recipientEmail ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
        return fieldsWithEmail
      }
      // For subscriptions - LOCK purchaser info (only purchaser can redeem)
      if (redemption.type === "subscription") {
        if (redemption.data?.userId && currentUser?.id === redemption.data.userId.toString()) {
          const baseFields = ["firstName", "lastName"] as const
          const fieldsWithPhone = currentUser?.phone ? [...baseFields, "phone"] as const : baseFields
          const fieldsWithEmail = currentUser?.email ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
          return fieldsWithEmail
        }
        else if (redemption.data?.guestInfo) {
          const baseFields = ["firstName", "lastName"] as const
          const fieldsWithPhone = redemption.data.guestInfo.phone ? [...baseFields, "phone"] as const : baseFields
          const fieldsWithEmail = redemption.data.guestInfo.email ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
          return fieldsWithEmail
        }
      }
    }
    
    // Check voucher passed as props (legacy flow)
    if (voucher?.recipientName) {
      const fields = ["firstName", "lastName", "phone"] as const
      const fieldsWithEmail = voucher.recipientEmail ? [...fields, "email"] as const : fields
      return fieldsWithEmail
    }
    
    if ((voucher as any)?.guestInfo) {
      return ["firstName", "lastName", "phone", "email"] as const
    }
    
    if ((userSubscription as any)?.guestInfo) {
      return ["firstName", "lastName", "email", "phone"] as const
    }
    
    // 👤 Always lock logged-in user fields (even for regular bookings)
    if (currentUser) {
      const baseFields = ["firstName", "lastName"] as const
      const fieldsWithPhone = currentUser?.phone ? [...baseFields, "phone"] as const : baseFields
      const fieldsWithEmail = currentUser?.email ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
      return fieldsWithEmail
    }
    
    return [] as const
  })

  // 📝 NEW: Track whether to show the blue notification (only for voucher/subscription redemption)
  const [showLockedFieldsNotification, setShowLockedFieldsNotification] = useState(() => {
    // Show notification only for voucher/subscription redemption, not for coupons or regular bookings
    if (redemptionData) {
      return redemptionData.type === "treatment_voucher" || 
             redemptionData.type === "monetary_voucher" || 
             redemptionData.type === "subscription"
    }
    return Boolean(voucher || userSubscription)
  })
  
  // Update locked fields when redemption data changes
  useEffect(() => {
    const calculateLockedFields = (): readonly string[] => {
      // Check redemption data from code input first (most authoritative)  
      if (redemptionData) {
        const redemption = redemptionData
        
        // For ALL vouchers (all are gifts) - LOCK recipient info (only recipient can redeem)
        if ((redemption.type === "treatment_voucher" || redemption.type === "monetary_voucher") && redemption.data?.recipientName) {
          const fields = ["firstName", "lastName"] as const
          const fieldsWithPhone = redemption.data?.recipientPhone ? [...fields, "phone"] as const : fields
          const fieldsWithEmail = redemption.data?.recipientEmail ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
          return fieldsWithEmail
        }
        
        // For subscriptions - LOCK purchaser info (only purchaser can redeem)
        if (redemption.type === "subscription") {
          // If subscription was purchased by a logged-in user, lock ALL their fields
          if (redemption.data?.userId && currentUser?.id === redemption.data.userId.toString()) {
            const baseFields = ["firstName", "lastName"] as const
            const fieldsWithPhone = currentUser?.phone ? [...baseFields, "phone"] as const : baseFields
            const fieldsWithEmail = currentUser?.email ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
            return fieldsWithEmail
          }
          // If subscription was purchased by a guest, lock guest purchaser info
          else if (redemption.data?.guestInfo) {
            const baseFields = ["firstName", "lastName"] as const
            const fieldsWithPhone = redemption.data.guestInfo.phone ? [...baseFields, "phone"] as const : baseFields
            const fieldsWithEmail = redemption.data.guestInfo.email ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
            return fieldsWithEmail
          }
        }
      }
      
      // Check voucher passed as props (legacy flow) - ALL vouchers are gifts
      if (voucher?.recipientName) {
        const fields = ["firstName", "lastName", "phone"] as const
        const fieldsWithEmail = voucher.recipientEmail ? [...fields, "email"] as const : fields
        return fieldsWithEmail
      }
      
      // Check voucher purchased by guest (legacy flow)
      if ((voucher as any)?.guestInfo) {
        return ["firstName", "lastName", "phone", "email"] as const
      }
      
      // Check subscription purchased by guest (legacy flow)
      if ((userSubscription as any)?.guestInfo) {
        return ["firstName", "lastName", "email", "phone"] as const
      }
      
      // 👤 Always lock logged-in user fields (even for regular bookings)
      if (currentUser) {
        const baseFields = ["firstName", "lastName"] as const
        const fieldsWithPhone = currentUser?.phone ? [...baseFields, "phone"] as const : baseFields
        const fieldsWithEmail = currentUser?.email ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
        return fieldsWithEmail
      }
      
      return [] as const
    }
    
    const calculateShowNotification = (): boolean => {
      // Show notification only for voucher/subscription redemption, not for coupons or regular bookings
      if (redemptionData) {
        return redemptionData.type === "treatment_voucher" || 
               redemptionData.type === "monetary_voucher" || 
               redemptionData.type === "subscription"
      }
      return Boolean(voucher || userSubscription)
    }
    
    setLockedFields(calculateLockedFields())
    setShowLockedFieldsNotification(calculateShowNotification())
  }, [voucher, userSubscription, currentUser, redemptionData])

  // Hide "booking for someone else" option when redeeming voucher/subscription
  const [hideBookingForSomeoneElse, setHideBookingForSomeoneElse] = useState(() => {
    return Boolean(voucher || userSubscription || redemptionData)
  })

  const [guestInfo, setGuestInfoState] = useState<Partial<GuestInfo>>(prefilledGuestInfo)
  
  // Update guest info when redemption data changes
  useEffect(() => {
    if (redemptionData && Object.keys(prefilledGuestInfo).length > 0) {
      setGuestInfoState(prefilledGuestInfo)
    }
  }, [redemptionData, prefilledGuestInfo])
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
  
  // Update hideBookingForSomeoneElse when redemption data changes
  useEffect(() => {
    setHideBookingForSomeoneElse(Boolean(voucher || userSubscription || redemptionData || bookingOptions.redemptionData))
  }, [voucher, userSubscription, redemptionData, bookingOptions.redemptionData])
  
  // Update guest info when booking options redemption data changes
  useEffect(() => {
    if (bookingOptions.redemptionData && Object.keys(prefilledGuestInfo).length > 0) {
      setGuestInfoState(prefilledGuestInfo)
    }
  }, [bookingOptions.redemptionData, prefilledGuestInfo])
  
  // Update locked fields when booking options redemption data changes
  useEffect(() => {
    if (bookingOptions.redemptionData) {
      const redemption = bookingOptions.redemptionData
      
      // For ALL vouchers (all are gifts) - LOCK recipient info (only recipient can redeem)
      if ((redemption.type === "treatment_voucher" || redemption.type === "monetary_voucher") && (redemption.data as any)?.recipientName) {
        const fields = ["firstName", "lastName"] as const
        const fieldsWithPhone = (redemption.data as any)?.recipientPhone ? [...fields, "phone"] as const : fields
        const fieldsWithEmail = (redemption.data as any)?.recipientEmail ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
        setLockedFields(fieldsWithEmail)
        return
      }
      
      // For subscriptions - LOCK purchaser info (only purchaser can redeem)
      if (redemption.type === "subscription") {
        // If subscription was purchased by a logged-in user, lock ALL their fields
        if ((redemption.data as any)?.userId && currentUser?.id === (redemption.data as any).userId.toString()) {
          const baseFields = ["firstName", "lastName"] as const
          const fieldsWithPhone = currentUser?.phone ? [...baseFields, "phone"] as const : baseFields
          const fieldsWithEmail = currentUser?.email ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
          setLockedFields(fieldsWithEmail)
          return
        }
        // If subscription was purchased by a guest, lock guest purchaser info
        else if ((redemption.data as any)?.guestInfo) {
          const baseFields = ["firstName", "lastName"] as const
          const fieldsWithPhone = (redemption.data as any).guestInfo.phone ? [...baseFields, "phone"] as const : baseFields
          const fieldsWithEmail = (redemption.data as any).guestInfo.email ? [...fieldsWithPhone, "email"] as const : fieldsWithPhone
          setLockedFields(fieldsWithEmail)
          return
        }
      }
    }
  }, [bookingOptions.redemptionData, currentUser])
  
  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPriceDetails | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isTimeSlotsLoading, setIsTimeSlotsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<IBooking | null>(null)
  const [workingHoursNote, setWorkingHoursNote] = useState<string | undefined>(undefined)
  
  // New state for guest user management
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
  const [abandonedBooking, setAbandonedBooking] = useState<any>(null)
  // ✅ No longer needed - we create final booking directly
 // Track price calculation requests

  const { toast } = useToast()

  // Enhanced setGuestInfo function with proper state merging and debugging
  const setGuestInfo = useCallback((newInfo: Partial<GuestInfo>) => {
    
    setGuestInfoState(prevState => {
      const updatedState = { ...prevState, ...newInfo }
      return updatedState
    })
  }, [])

  // Function to handle guest info submission and proceed to next step
  const handleGuestInfoSubmit = useCallback(async (newInfo: Partial<GuestInfo>) => {
    
    // Update the state
    setGuestInfoState(prevState => {
      const updatedState = { ...prevState, ...newInfo }
      
      // Now proceed to next step with the updated data
      setTimeout(async () => {
        
        // Create guest user after step 3 (Personal Info step) for guests only 
        if (currentStep === 3 && !currentUser && !guestUserId) {
          
          if (updatedState.firstName && updatedState.lastName && updatedState.phone) {
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
    // ✅ תיקון: validation קריטי של userId
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      console.error("Invalid userId provided to createInitialPendingBooking:", userId)
      toast({
        variant: "destructive",
        title: "שגיאה מערכתית",
        description: "מזהה משתמש לא תקין. אנא נסה שוב.",
      })
      return
    }

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
      // For registered users, check using their user ID
      if (currentUser?.id) {
        try {
          const result = await getAbandonedBooking(currentUser.id)
          
          if (result.success && result.booking) {
            setAbandonedBooking(result.booking)
            setShowRecoveryDialog(true)
          }
        } catch (error) {
          console.warn("Error checking for abandoned booking (registered user):", error)
        }
        return // Don't check for guest bookings if user is logged in
      }
      
      // For guests, check using saved guest user ID
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
          console.warn("Error checking for abandoned booking (guest):", error)
        }
      }
    }
    
    checkForAbandonedBooking()
  }, [currentUser])

  const guestUserCreatedRef = useRef(false)
  const priceCalculationIdRef = useRef<number>(0)

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

  // Save form state whenever it changes (after step 1, but NOT during payment or confirmation)
  useEffect(() => {
    // Determine which user ID to use
    const userId = currentUser?.id || guestUserId
    
    // Don't save during payment step (6) or confirmation step (7) to avoid interference
    if (userId && currentStep > 1 && currentStep < 6) {
      const saveFormState = async () => {
        try {
          const result = await saveAbandonedBooking(userId, {
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
  }, [currentUser?.id, guestUserId, guestInfo, guestAddress, bookingOptions, calculatedPrice, currentStep])

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
          const timeSlotsWithSurcharges = (result.timeSlots || []).filter(slot => slot.surcharge)
          console.log("🕐 Booking Wizard - Received time slots:", {
            dateStr,
            totalTimeSlots: result.timeSlots?.length || 0,
            timeSlotsWithSurcharges: timeSlotsWithSurcharges.length,
            surchargeSlots: timeSlotsWithSurcharges.map(slot => ({
              time: slot.time,
              surcharge: slot.surcharge
            })),
            workingHoursNote: result.workingHoursNote
          })
          
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
      !bookingOptions.bookingTime
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

    // ✅ תיקון: מניעת race condition בחישוב מחירים
    const currentCalculationId = Date.now()
    priceCalculationIdRef.current = currentCalculationId

    setIsPriceCalculating(true)
    
    const bookingDateTime = new Date(bookingOptions.bookingDate)
    const [hours, minutes] = bookingOptions.bookingTime.split(":").map(Number)
    bookingDateTime.setHours(hours, minutes, 0, 0)

    // ✅ Enhanced payload with all necessary data for working hours calculation
    const payload: CalculatePricePayloadType = {
      userId: currentUser?.id || guestUserId || undefined,
      treatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
      bookingDateTime, // ✅ This is crucial - the exact date/time determines working hours surcharges
      couponCode: bookingOptions.appliedCouponCode,
      giftVoucherCode: voucher?.code,
      userSubscriptionId:
        bookingOptions.source === "subscription_redemption" ? bookingOptions.selectedUserSubscriptionId : undefined,
      guestPhone: !currentUser ? guestInfo.phone : undefined, // Add guest phone for ownership validation
    }
    
    // ✅ Enhanced logging for debugging working hours issues
    console.log("💰 Triggering price calculation with payload:", {
      treatmentId: payload.treatmentId,
      bookingDateTime: payload.bookingDateTime,
      selectedDate: bookingOptions.bookingDate,
      selectedTime: bookingOptions.bookingTime,
      source: bookingOptions.source,
      hasVoucher: Boolean(voucher),
      hasSubscription: Boolean(bookingOptions.selectedUserSubscriptionId),
      currentStep,
      // ✅ Enhanced working hours debugging
      workingHoursDebug: {
        bookingDateUTC: bookingDateTime.toISOString(),
        bookingTimeMinutes: bookingDateTime.getHours() * 60 + bookingDateTime.getMinutes(),
        dayOfWeek: bookingDateTime.getDay(),
        timezone: 'Asia/Jerusalem'
      }
    })
    
    const result = await calculateBookingPrice(payload)
    
    // ✅ בדיקת race condition - וידוא שזה עדיין החישוב הרלוונטי
    if (priceCalculationIdRef.current !== currentCalculationId) {
      console.log("⚠️ Price calculation race condition detected - ignoring outdated result")
      return // חישוב מיושן, התעלמות
    }
    
    if (result.success && result.priceDetails) {
      console.log("💰 Price calculation successful:", {
        basePrice: result.priceDetails.basePrice,
        surcharges: result.priceDetails.surcharges,
        totalSurchargesAmount: result.priceDetails.totalSurchargesAmount,
        finalAmount: result.priceDetails.finalAmount,
        isFullyCovered: result.priceDetails.isFullyCoveredByVoucherOrSubscription,
        bookingTime: bookingOptions.bookingTime,
        bookingDate: bookingOptions.bookingDate,
        // ✅ Enhanced logging for working hours debugging
        workingHoursInfo: {
          hasSurcharges: result.priceDetails.surcharges.length > 0,
          surchargeDescriptions: result.priceDetails.surcharges.map(s => s.description)
        }
      })
      setCalculatedPrice(result.priceDetails)
    } else {
      console.error("❌ Price calculation failed:", result.error, result.issues)
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
  }, [
    bookingOptions.selectedTreatmentId,
    bookingOptions.selectedDurationId,
    bookingOptions.bookingDate,
    bookingOptions.bookingTime,
    bookingOptions.appliedCouponCode,
    bookingOptions.source,
    bookingOptions.selectedUserSubscriptionId,
    voucher?.code,
    guestInfo.phone,
    guestUserId,
    currentUser?.id,
    toast,
    initialData.activeTreatments,
    t,
    currentStep
  ])

  useEffect(() => {
    // Trigger price calculation starting from step 2 (after treatment selection)
    if (currentStep >= 2) {
      triggerPriceCalculation()
    }
  }, [
    bookingOptions.selectedTreatmentId,
    bookingOptions.selectedDurationId,
    bookingOptions.bookingDate,
    bookingOptions.bookingTime,
    bookingOptions.appliedCouponCode,
    bookingOptions.source, // ✅ Add source to trigger recalculation when redemption changes
    bookingOptions.selectedUserSubscriptionId, // ✅ Add subscription ID changes
    guestInfo.email,
    guestInfo.phone, // ✅ Add phone for ownership validation
    guestAddress.city,
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
    // Only clear guest-specific data, don't affect registered users
    if (!currentUser) {
      // ✅ תיקון: ניקוי localStorage כוללני רק לאורחים
      try {
        localStorage.removeItem('guestUserId')
        localStorage.removeItem('abandonedBooking')
        localStorage.removeItem('bookingFormData')
      } catch (error) {
        console.warn("Failed to clear localStorage:", error)
      }
      
      setGuestUserId(null)
    }
    
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
      currentStep === TOTAL_STEPS_WITH_PAYMENT - 1 && // Summary step (now step 5)
      calculatedPrice?.finalAmount === 0 &&
      calculatedPrice?.isFullyCoveredByVoucherOrSubscription
    ) {
      // ✅ Skip payment step and create final booking directly
      console.log("💰 Zero payment detected - creating final booking directly")
      await handleFinalSubmit()
      return
    }
    
    // ✅ Move to next step first
    const nextStepNumber = Math.min(currentStep + 1, CONFIRMATION_STEP_NUMBER)
    setCurrentStep(nextStepNumber)
    
    // ✅ FIX: Trigger price recalculation when moving to any step after scheduling (step 2)
    // This ensures working hours surcharges are maintained correctly throughout the flow
    if (nextStepNumber >= 3 && bookingOptions.selectedTreatmentId && bookingOptions.bookingDate && bookingOptions.bookingTime) {
      console.log(`🔄 Triggering price recalculation for step ${nextStepNumber} to ensure working hours surcharges are maintained`)
      
      // Small delay to ensure step state is updated
      setTimeout(() => {
        triggerPriceCalculation()
      }, 100)
    }
  }

  const prevStep = () => {
    const prevStepNumber = Math.max(currentStep - 1, 1)
    setCurrentStep(prevStepNumber)
    
    // ✅ FIX: Trigger price recalculation when moving back to any step after scheduling (step 2)
    // This ensures working hours surcharges are maintained correctly when navigating back
    if (prevStepNumber >= 2 && bookingOptions.selectedTreatmentId && bookingOptions.bookingDate && bookingOptions.bookingTime) {
      console.log(`🔄 Triggering price recalculation for step ${prevStepNumber} (moving back) to ensure working hours surcharges are maintained`)
      
      // Small delay to ensure step state is updated
      setTimeout(() => {
        triggerPriceCalculation()
      }, 100)
    }
  }

  // Legacy function - no longer used with new simplified approach
  const createPendingBooking = useCallback(async () => {
    
    if (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.phone) {
      toast({
        variant: "destructive",
        title: t("bookings.errors.missingGuestInfo"),
        description: t("bookings.errors.completeGuestInfo"),
      })
      return null
    }

    // Validate email if booking for someone else and recipient email is provided
    if (guestInfo.isBookingForSomeoneElse && guestInfo.recipientEmail && !guestInfo.recipientEmail.includes('@')) {
      toast({
        variant: "destructive",
        title: "שגיאה בכתובת אימייל",
        description: "אנא הזן כתובת אימייל תקינה עבור הנמען",
      })
      return null
    }

    // Validate recipient details if booking for someone else
    if (guestInfo.isBookingForSomeoneElse) {
      if (!guestInfo.recipientFirstName?.trim()) {
        toast({
          variant: "destructive",
          title: "שם פרטי של מקבל הטיפול נדרש",
          description: "אנא מלא את השם הפרטי של מקבל הטיפול",
        })
        return null
      }
      
      if (!guestInfo.recipientLastName?.trim()) {
        toast({
          variant: "destructive",
          title: "שם משפחה של מקבל הטיפול נדרש",
          description: "אנא מלא את שם המשפחה של מקבל הטיפול",
        })
        return null
      }
      
      if (!guestInfo.recipientPhone?.trim()) {
        toast({
          variant: "destructive",
          title: "טלפון מקבל הטיפול נדרש",
          description: "אנא מלא את מספר הטלפון של מקבל הטיפול",
        })
        return null
      }
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
      const [hours, minutes] = bookingOptions.bookingTime!.split(":").map(Number)
      bookingDateTime.setHours(hours, minutes, 0, 0)

      const selectedTreatment = initialData.activeTreatments.find(
        (t) => t._id.toString() === bookingOptions.selectedTreatmentId
      )

      // ✅ Add validation for voucher/subscription redemption
      if (bookingOptions.source === "gift_voucher_redemption" && bookingOptions.selectedGiftVoucherId) {
        // Validate treatment matches for treatment vouchers
        if (voucher?.voucherType === "treatment" && voucher.treatmentId) {
          const voucherTreatmentId = typeof voucher.treatmentId === 'object' 
            ? (voucher.treatmentId as any)._id?.toString() || (voucher.treatmentId as any).toString()
            : voucher.treatmentId.toString()
            
          if (voucherTreatmentId !== bookingOptions.selectedTreatmentId) {
            toast({
              variant: "destructive",
              title: "שגיאה בבחירת טיפול",
              description: "הטיפול שנבחר לא תואם לשובר הטיפול",
            })
            return null
          }
        }
      }

      if (bookingOptions.source === "subscription_redemption" && bookingOptions.selectedUserSubscriptionId) {
        // Validate treatment matches for subscriptions
        if (userSubscription?.treatmentId) {
          const subTreatmentId = typeof userSubscription.treatmentId === 'object' 
            ? (userSubscription.treatmentId as any)._id?.toString() || (userSubscription.treatmentId as any).toString()
            : userSubscription.treatmentId.toString()
            
          if (subTreatmentId !== bookingOptions.selectedTreatmentId) {
            toast({
              variant: "destructive",
              title: "שגיאה בבחירת טיפול",
              description: "הטיפול שנבחר לא תואם למנוי",
            })
            return null
          }
        }
      }

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
          addressType: guestAddress.addressType || "apartment", // ✅ Add missing addressType
          apartment: guestAddress.apartmentNumber || undefined,
          entrance: guestAddress.entrance,
          floor: guestAddress.floor,
          notes: guestAddress.notes,
          doorName: guestAddress.addressType === "house" ? guestAddress.doorName : undefined,
          buildingName: guestAddress.addressType === "office" ? guestAddress.buildingName : undefined,
          hotelName: guestAddress.addressType === "hotel" ? guestAddress.hotelName : undefined,
          roomNumber: guestAddress.addressType === "hotel" ? guestAddress.roomNumber : undefined,
          otherInstructions: guestAddress.addressType === "other" ? guestAddress.instructions : undefined,
          hasPrivateParking: guestAddress.parking || false,
        },
        priceDetails: calculatedPrice!,
        paymentDetails: {
          paymentStatus: calculatedPrice!.finalAmount === 0 ? "not_required" : "pending",
        },
        guestInfo: {
          name: `${guestInfo.firstName} ${guestInfo.lastName}`,
          email: guestInfo.email || undefined,
          phone: guestInfo.phone,
        },
        isBookingForSomeoneElse: Boolean(guestInfo.isBookingForSomeoneElse),
        recipientName: guestInfo.isBookingForSomeoneElse 
          ? (guestInfo.recipientFirstName?.trim() && guestInfo.recipientLastName?.trim() 
              ? `${guestInfo.recipientFirstName.trim()} ${guestInfo.recipientLastName.trim()}`
              : undefined)
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
        // Add notification preferences
        notificationMethods: guestInfo.bookerNotificationMethod === "both" ? ["email", "sms"] :
                            guestInfo.bookerNotificationMethod === "sms" ? ["sms"] : ["email"],
        recipientNotificationMethods: guestInfo.isBookingForSomeoneElse ? 
          (guestInfo.recipientNotificationMethod === "both" ? ["email", "sms"] :
           guestInfo.recipientNotificationMethod === "sms" ? ["sms"] : ["email"]) : undefined,
        notificationLanguage: guestInfo.bookerNotificationLanguage || "he",
        // Add required fields for schema compatibility
        // treatmentCategory will be handled in the backend to convert to ObjectId
        consents: {
          customerAlerts: guestInfo.bookerNotificationMethod === "sms" ? "sms" : "email",
          patientAlerts: guestInfo.isBookingForSomeoneElse 
            ? (guestInfo.recipientNotificationMethod === "sms" ? "sms" : "email")
            : (guestInfo.bookerNotificationMethod === "sms" ? "sms" : "email"),
          marketingOptIn: true,
          termsAccepted: true
        },
      } as CreateBookingPayloadType & { guestInfo: { name: string; email?: string; phone: string } }

      // Choose the correct function based on user type
      const result = currentUser 
        ? await createBooking({
            ...payload,
            userId: currentUser.id, // Use actual user ID for registered users
            // Remove guestInfo for registered users as it's not needed
            guestInfo: undefined
          })
        : await createGuestBooking(payload)
      
      if (result.success && result.booking) {
        // ✅ No longer tracking pending booking ID
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
  }, [guestInfo, guestAddress, bookingOptions, calculatedPrice, guestUserId, toast, t, initialData.activeTreatments])

  // Handle final confirmation after successful payment
  const handleFinalSubmit = async () => {
    console.log("🎯 handleFinalSubmit called - creating final booking", { 
      guestUserId,
      calculatedPrice: calculatedPrice?.finalAmount,
      currentStep 
    })

    setIsLoading(true)
    console.log("⏳ Starting final booking creation...")

    try {
      // ✅ Create the booking directly with confirmed status
      const finalBookingId = await createFinalBooking()
      if (!finalBookingId) {
        console.error("❌ Failed to create final booking")
        toast({
          variant: "destructive",
          title: "שגיאה ביצירת ההזמנה",
          description: "לא ניתן ליצור את ההזמנה. אנא נסה שוב.",
        })
        return
      }
      
      console.log("✅ Final booking created successfully:", finalBookingId)
      
      // Clear saved form state on successful booking
      if (guestUserId) {
        localStorage.removeItem('guestUserId')
        console.log("🗑️ Cleared localStorage")
      }
      
      // Immediately redirect to confirmation page
      console.log("🔄 Redirecting to confirmation page")
      const confirmationUrl = `/bookings/confirmation?bookingId=${finalBookingId}&status=success`
      console.log("🎯 Redirecting to:", confirmationUrl)
      
      // Add a small delay to ensure state is updated
      setTimeout(() => {
        router.push(confirmationUrl)
      }, 100)
      
      toast({
        title: t("bookings.success.bookingCreated"),
        description: t("bookings.success.bookingCreatedDescription"),
      })
      
    } catch (error) {
      console.error("💥 Booking creation error:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.unexpectedError"),
        description: t("bookings.errors.tryAgain"),
      })
    } finally {
      console.log("🏁 handleFinalSubmit completed, setting loading to false")
      setIsLoading(false)
    }
  }

  // Create final booking with confirmed status
  const createFinalBooking = useCallback(async () => {
    
    if (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.phone) {
      toast({
        variant: "destructive",
        title: t("bookings.errors.missingGuestInfo"),
        description: t("bookings.errors.completeGuestInfo"),
      })
      return null
    }

    // Validate email if booking for someone else and recipient email is provided
    if (guestInfo.isBookingForSomeoneElse && guestInfo.recipientEmail && !guestInfo.recipientEmail.includes('@')) {
      toast({
        variant: "destructive",
        title: "שגיאה בכתובת אימייל",
        description: "אנא הזן כתובת אימייל תקינה עבור הנמען",
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
      const [hours, minutes] = bookingOptions.bookingTime!.split(":").map(Number)
      bookingDateTime.setHours(hours, minutes, 0, 0)

      const selectedTreatment = initialData.activeTreatments.find(
        (t) => t._id.toString() === bookingOptions.selectedTreatmentId
      )

      // ✅ Add validation for voucher/subscription redemption
      if (bookingOptions.source === "gift_voucher_redemption" && bookingOptions.selectedGiftVoucherId) {
        // Validate treatment matches for treatment vouchers
        if (voucher?.voucherType === "treatment" && voucher.treatmentId) {
          const voucherTreatmentId = typeof voucher.treatmentId === 'object' 
            ? (voucher.treatmentId as any)._id?.toString() || (voucher.treatmentId as any).toString()
            : voucher.treatmentId.toString()
            
          if (voucherTreatmentId !== bookingOptions.selectedTreatmentId) {
            toast({
              variant: "destructive",
              title: "שגיאה בבחירת טיפול",
              description: "הטיפול שנבחר לא תואם לשובר הטיפול",
            })
            return null
          }
        }
      }

      if (bookingOptions.source === "subscription_redemption" && bookingOptions.selectedUserSubscriptionId) {
        // Validate treatment matches for subscriptions
        if (userSubscription?.treatmentId) {
          const subTreatmentId = typeof userSubscription.treatmentId === 'object' 
            ? (userSubscription.treatmentId as any)._id?.toString() || (userSubscription.treatmentId as any).toString()
            : userSubscription.treatmentId.toString()
            
          if (subTreatmentId !== bookingOptions.selectedTreatmentId) {
            toast({
              variant: "destructive",
              title: "שגיאה בבחירת טיפול",
              description: "הטיפול שנבחר לא תואם למנוי",
            })
            return null
          }
        }
      }

      // ✅ Generate transaction ID for successful payment
      const isProduction = process.env.NODE_ENV === 'production'
      const transactionId = isProduction 
        ? `LIVE-${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}` 
        : `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
          addressType: guestAddress.addressType || "apartment", // ✅ Add missing addressType
          apartment: guestAddress.apartmentNumber || undefined,
          entrance: guestAddress.entrance,
          floor: guestAddress.floor,
          notes: guestAddress.notes,
          doorName: guestAddress.addressType === "house" ? guestAddress.doorName : undefined,
          buildingName: guestAddress.addressType === "office" ? guestAddress.buildingName : undefined,
          hotelName: guestAddress.addressType === "hotel" ? guestAddress.hotelName : undefined,
          roomNumber: guestAddress.addressType === "hotel" ? guestAddress.roomNumber : undefined,
          otherInstructions: guestAddress.addressType === "other" ? guestAddress.instructions : undefined,
          hasPrivateParking: guestAddress.parking || false,
        },
        priceDetails: calculatedPrice!,
        paymentDetails: {
          paymentStatus: calculatedPrice!.finalAmount === 0 ? "not_required" : "paid", // ✅ Set as paid immediately
          transactionId: calculatedPrice!.finalAmount === 0 ? undefined : transactionId, // ✅ Add transaction ID
        },
        guestInfo: {
          name: `${guestInfo.firstName} ${guestInfo.lastName}`,
          email: guestInfo.email || undefined,
          phone: guestInfo.phone,
        },
        isBookingForSomeoneElse: Boolean(guestInfo.isBookingForSomeoneElse),
        recipientName: guestInfo.isBookingForSomeoneElse 
          ? (guestInfo.recipientFirstName?.trim() && guestInfo.recipientLastName?.trim() 
              ? `${guestInfo.recipientFirstName.trim()} ${guestInfo.recipientLastName.trim()}`
              : undefined)
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
        // Add notification preferences
        notificationMethods: guestInfo.bookerNotificationMethod === "both" ? ["email", "sms"] :
                            guestInfo.bookerNotificationMethod === "sms" ? ["sms"] : ["email"],
        recipientNotificationMethods: guestInfo.isBookingForSomeoneElse ? 
          (guestInfo.recipientNotificationMethod === "both" ? ["email", "sms"] :
           guestInfo.recipientNotificationMethod === "sms" ? ["sms"] : ["email"]) : undefined,
        notificationLanguage: guestInfo.bookerNotificationLanguage || "he",
        // Add required fields for schema compatibility
        consents: {
          customerAlerts: guestInfo.bookerNotificationMethod === "sms" ? "sms" : "email",
          patientAlerts: guestInfo.isBookingForSomeoneElse 
            ? (guestInfo.recipientNotificationMethod === "sms" ? "sms" : "email")
            : (guestInfo.bookerNotificationMethod === "sms" ? "sms" : "email"),
          marketingOptIn: true,
          termsAccepted: true
        },
      } as CreateBookingPayloadType & { guestInfo: { name: string; email?: string; phone: string } }

      // ✅ Choose the correct function based on redemption ownership
      // When redeeming voucher/subscription, booking goes to the owner, not current user
      let targetUserId = null
      
      if (redemptionData) {
        // For vouchers - booking goes to recipient (ownerUserId)  
        if (redemptionData.type === "treatment_voucher" || redemptionData.type === "monetary_voucher") {
          // Use findOrCreateUserByPhone to get/create the recipient user
          const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
          const recipientPhone = redemptionData.data?.recipientPhone || guestInfo.phone
          const recipientResult = await findOrCreateUserByPhone(recipientPhone, {
            name: `${guestInfo.firstName} ${guestInfo.lastName}`,
            email: guestInfo.email,
            gender: guestInfo.gender,
            dateOfBirth: guestInfo.birthDate
          })
          
          if (recipientResult.success) {
            targetUserId = recipientResult.userId
          } else {
            console.error("Failed to find/create voucher recipient user:", recipientResult.error)
            toast({
              variant: "destructive",
              title: "שגיאה ביצירת הזמנה",
              description: "לא הצלחנו לאמת את בעלות השובר. אנא נסה שוב.",
            })
            return null
          }
        }
        // For subscriptions - booking goes to purchaser
        else if (redemptionData.type === "subscription") {
          // Use findOrCreateUserByPhone to get/create the purchaser user
          const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
          const purchaserPhone = redemptionData.data?.guestInfo?.phone || guestInfo.phone
          const purchaserResult = await findOrCreateUserByPhone(purchaserPhone, {
            name: `${guestInfo.firstName} ${guestInfo.lastName}`,
            email: guestInfo.email,
            gender: guestInfo.gender,
            dateOfBirth: guestInfo.birthDate
          })
          
          if (purchaserResult.success) {
            targetUserId = purchaserResult.userId
          } else {
            console.error("Failed to find/create subscription purchaser user:", purchaserResult.error)
            toast({
              variant: "destructive",
              title: "שגיאה ביצירת הזמנה",
              description: "לא הצלחנו לאמת את בעלות המנוי. אנא נסה שוב.",
            })
            return null
          }
        }
      } else if (guestInfo.isBookingForSomeoneElse && guestInfo.recipientPhone) {
        // ✅ NEW: Both logged-in users and guests booking for someone else - create user for recipient
        try {
          const { findOrCreateUserByPhone } = await import("@/actions/auth-actions")
          const recipientResult = await findOrCreateUserByPhone(guestInfo.recipientPhone, {
            name: `${guestInfo.recipientFirstName} ${guestInfo.recipientLastName}`,
            email: guestInfo.recipientEmail,
            gender: guestInfo.recipientGender,
            dateOfBirth: guestInfo.recipientBirthDate
          })
          
          if (recipientResult.success) {
            targetUserId = recipientResult.userId
            console.log("✅ Created/found user for recipient:", targetUserId)
          } else {
            console.warn("Failed to find/create recipient user:", recipientResult.error)
            // Fall back to booker (current user or guest)
            targetUserId = currentUser?.id || null
          }
        } catch (error) {
          console.warn("Error creating recipient user:", error)
          // Fall back to booker (current user or guest)
          targetUserId = currentUser?.id || null
        }
      } else if (currentUser) {
        // No redemption and not booking for someone else - use current logged-in user
        targetUserId = currentUser.id
      }
      
      const result = targetUserId 
        ? await createBooking({
            ...payload,
            userId: targetUserId,
            // Remove guestInfo for registered users as it's not needed
            guestInfo: undefined
          })
        : await createGuestBooking(payload)
      
      if (result.success && result.booking) {
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
      console.error("💥 Final booking creation error:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.unexpectedError"),
        description: t("bookings.errors.tryAgain"),
      })
      return null
    }
  }, [guestInfo, guestAddress, bookingOptions, calculatedPrice, guestUserId, toast, t, initialData.activeTreatments, currentUser, voucher, userSubscription])

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // NEW ORDER: Treatment Selection First
        return (
                      <GuestTreatmentSelectionStep
              initialData={initialData}
              initialCategory={initialCategory}
              bookingOptions={bookingOptions}
              setBookingOptions={setBookingOptions}
              onNext={nextStep}
              onPrev={prevStep}
              voucher={voucher}
              userSubscription={userSubscription}
              currentUser={currentUser}
              setRedemptionData={setRedemptionData}
              guestInfo={guestInfo}
            />
        )
      case 2:
        // NEW ORDER: Scheduling Second
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
            calculatedPrice={calculatedPrice}
            isPriceCalculating={isPriceCalculating}
          />
        )
      case 3:
        // NEW ORDER: Guest/User Info Third
        return (
          <GuestInfoStep
            guestInfo={guestInfo}
            setGuestInfo={setGuestInfo}
            onNext={handleGuestInfoSubmit}
            onPrev={prevStep}
            lockedFields={lockedFields as any}
            hideBookingForSomeoneElse={hideBookingForSomeoneElse}
            showLockedFieldsNotification={showLockedFieldsNotification}
          />
        )
      case 4:
        // NEW ORDER: Address Fourth
        return (
          <GuestAddressStep
            address={guestAddress}
            setAddress={setGuestAddress}
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
            createPendingBooking={undefined} // ✅ No longer needed - we create final booking directly
            pendingBookingId={null} // ✅ No longer needed
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
        return t("bookings.steps.treatment.title") || "בחירת טיפול"
      case 2:
        return t("bookings.steps.scheduling.title") || "תזמון הטיפול"
      case 3:
        return currentUser ? "פרטים אישיים" : t("bookings.steps.guestInfo.title") || "פרטים אישיים"
      case 4:
        return t("bookings.addressStep.title") || "כתובת הטיפול"
      case 5:
        return t("bookings.steps.summary.title") || "סיכום ההזמנה"
      case 6:
        return t("bookings.steps.payment.title") || "תשלום"
      case 7:
        return t("bookings.steps.confirmation.title") || "אישור הזמנה"
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