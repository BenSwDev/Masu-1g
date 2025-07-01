﻿"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

import type {
  BookingInitialData,
  SelectedBookingOptions,
  CalculatedPriceDetails,
  TimeSlot,
} from "@/types/booking"
import { useToast } from "@/components/ui/use-toast"

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
  getAbandonedBooking,
} from "@/actions/booking-actions"
import type {
  CreateBookingPayloadType,
  CalculatePricePayloadType,
} from "@/lib/validation/booking-schemas"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, RotateCcw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { IBooking } from "@/lib/db/models/booking"

import type { GiftVoucher as GiftVoucherPlain } from "@/types/core"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { GuestInfo, GuestAddress } from "@/types/core"

// âœ… ×ª×™×§×•×Ÿ: ×˜×™×¤×•×¡×™× ×‘×˜×•×—×™× ×‘×ž×§×•× any
interface UniversalBookingWizardProps {
  initialData: BookingInitialData
  voucher?: GiftVoucherPlain
  userSubscription?: IUserSubscription & { treatmentId?: string | object }
  currentUser?: {
    id: string
    name?: string
    email?: string
    phone?: string
    gender?: "male" | "female" | "other"
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
  initialCategory,
}: UniversalBookingWizardProps) {
  const router = useRouter()
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)

  // Track redemption data for locked fields logic
  const [redemptionData, setRedemptionData] = useState<any>(null)

  const prefilledGuestInfo = useMemo<Partial<GuestInfo>>(() => {
    // Priority 1: Logged in user data
    if (currentUser) {
      const [first, ...rest] = (currentUser.name || "").split(" ")
      return {
        firstName: first || "",
        lastName: rest.join(" ") || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        birthDate: (currentUser as any).dateOfBirth
          ? new Date((currentUser as any).dateOfBirth)
          : undefined,
        gender: (currentUser as any).gender,
        isBookingForSomeoneElse: false,
        bookerNotificationMethod: "email", // Default for logged in users
        bookerNotificationLanguage: "he",
      }
    }

    // Priority 2: Gift voucher data
    if (voucher?.isGift && voucher.recipientName) {
      const [first, ...rest] = voucher.recipientName.split(" ")
      return {
        firstName: first,
        lastName: rest.join(" "),
        phone: voucher.recipientPhone,
        email: "", // Gift vouchers usually don't have recipient email
        isBookingForSomeoneElse: false, // No booking for someone else when using voucher/subscription
        bookerNotificationMethod: "email",
        bookerNotificationLanguage: "he",
      }
    }

    // Priority 3: Voucher guest info
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
        bookerNotificationLanguage: "he",
      }
    }

    // Priority 4: Subscription guest info
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
        bookerNotificationLanguage: "he",
      }
    }

    // Priority 5: Redemption data from code input
    if (redemptionData) {
      const redemption = redemptionData

      // For gift vouchers with recipient info
      if (
        (redemption.type === "treatment_voucher" || redemption.type === "monetary_voucher") &&
        redemption.data?.isGift &&
        redemption.data?.recipientName
      ) {
        const [first, ...rest] = redemption.data.recipientName.split(" ")
        return {
          firstName: first,
          lastName: rest.join(" "),
          phone: redemption.data.recipientPhone || "",
          email: redemption.data.recipientEmail || "",
          isBookingForSomeoneElse: false,
          bookerNotificationMethod: "email",
          bookerNotificationLanguage: "he",
        }
      }

      // For non-gift vouchers purchased by guests
      if (
        (redemption.type === "treatment_voucher" || redemption.type === "monetary_voucher") &&
        redemption.data?.guestInfo &&
        !redemption.data?.isGift
      ) {
        const guestInfo = redemption.data.guestInfo
        const [first, ...rest] = guestInfo.name.split(" ")
        return {
          firstName: first,
          lastName: rest.join(" "),
          email: guestInfo.email || "",
          phone: guestInfo.phone || "",
          isBookingForSomeoneElse: false,
          bookerNotificationMethod: "email",
          bookerNotificationLanguage: "he",
        }
      }

      // For subscriptions with guest info
      if (redemption.type === "subscription" && redemption.data?.guestInfo) {
        const guestInfo = redemption.data.guestInfo
        const [first, ...rest] = guestInfo.name.split(" ")
        return {
          firstName: first,
          lastName: rest.join(" "),
          email: guestInfo.email || "",
          phone: guestInfo.phone || "",
          isBookingForSomeoneElse: false,
          bookerNotificationMethod: "email",
          bookerNotificationLanguage: "he",
        }
      }
    }

    // Default for guests
    return {
      isBookingForSomeoneElse: false,
      bookerNotificationMethod: "email",
      bookerNotificationLanguage: "he",
    }
  }, [voucher, userSubscription, currentUser, redemptionData])

  const lockedFields = useMemo(() => {
    // If user is logged in, lock their basic info
    if (currentUser) {
      const baseFields = ["firstName", "lastName"] as const
      const fieldsWithPhone = currentUser.phone ? ([...baseFields, "phone"] as const) : baseFields
      const fieldsWithEmail = currentUser.email
        ? ([...fieldsWithPhone, "email"] as const)
        : fieldsWithPhone
      return fieldsWithEmail
    }

    // Check redemption data from code input first
    if (redemptionData) {
      const redemption = redemptionData

      // For treatment vouchers, lock fields based on voucher data
      if (redemption.type === "treatment_voucher" || redemption.type === "monetary_voucher") {
        const voucherData = redemption.data as any

        // If it's a gift voucher, lock recipient info
        if (voucherData?.isGift && voucherData?.recipientName) {
          const fields = ["firstName", "lastName"] as const
          const fieldsWithPhone = voucherData?.recipientPhone
            ? ([...fields, "phone"] as const)
            : fields
          if (voucherData?.recipientEmail) {
            return [...fieldsWithPhone, "email"] as const
          }
          return fieldsWithPhone
        }

        // If it's a non-gift voucher purchased by a guest, lock purchaser info
        if (voucherData?.guestInfo && !voucherData?.isGift) {
          const baseFields = ["firstName", "lastName"] as const
          const fieldsWithPhone = voucherData.guestInfo.phone
            ? ([...baseFields, "phone"] as const)
            : baseFields
          const fieldsWithEmail = voucherData.guestInfo.email
            ? ([...fieldsWithPhone, "email"] as const)
            : fieldsWithPhone
          return fieldsWithEmail
        }
      }

      // For subscriptions, lock fields based on subscription data
      if (redemption.type === "subscription") {
        const subscriptionData = redemption.data as any
        if (subscriptionData?.guestInfo) {
          const baseFields = ["firstName", "lastName"] as const
          const fieldsWithPhone = subscriptionData.guestInfo.phone
            ? ([...baseFields, "phone"] as const)
            : baseFields
          const fieldsWithEmail = subscriptionData.guestInfo.email
            ? ([...fieldsWithPhone, "email"] as const)
            : fieldsWithPhone
          return fieldsWithEmail
        }
      }
    }

    // Fallback to props-based logic (legacy flow)
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
  }, [voucher, userSubscription, currentUser, redemptionData])

  // Hide "booking for someone else" option when redeeming voucher/subscription
  const hideBookingForSomeoneElse = useMemo(() => {
    return Boolean(voucher || userSubscription || redemptionData)
  }, [voucher, userSubscription, redemptionData])

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
      const defaultAddress =
        initialData.userAddresses.find(addr => addr.isDefault) || initialData.userAddresses[0]
      if (defaultAddress) {
        return {
          city: defaultAddress.city,
          street: defaultAddress.street,
          houseNumber: defaultAddress.streetNumber || "",
          addressType: defaultAddress.addressType as any,
          floor:
            defaultAddress.addressType === "apartment"
              ? defaultAddress.apartmentDetails?.floor?.toString()
              : undefined,
          apartmentNumber:
            defaultAddress.addressType === "apartment"
              ? defaultAddress.apartmentDetails?.apartmentNumber
              : undefined,
          entrance:
            defaultAddress.addressType === "apartment"
              ? defaultAddress.apartmentDetails?.entrance
              : undefined,
          parking: defaultAddress.hasPrivateParking || false,
          notes: defaultAddress.additionalNotes || "",
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

  const [bookingOptions, setBookingOptions] =
    useState<Partial<SelectedBookingOptions>>(defaultBookingOptions)

  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPriceDetails | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isTimeSlotsLoading, setIsTimeSlotsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<IBooking | null>(null)
  const [workingHoursNote, setWorkingHoursNote] = useState<string | undefined>(undefined)

  // New state for guest user management
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
  const [abandonedBooking, setAbandonedBooking] = useState<any>(null)
  // âœ… No longer needed - we create final booking directly
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
  const handleGuestInfoSubmit = useCallback(
    async (newInfo: Partial<GuestInfo>) => {
      // Update the state
      setGuestInfoState(prevState => {
        const updatedState = { ...prevState, ...newInfo }

        // Now proceed to next step with the updated data
        setTimeout(async () => {
          // Create guest user after step 3 (Personal Info step) for guests only
          if (currentStep === 3 && !currentUser && !guestUserId) {
            if (updatedState.firstName && updatedState.lastName && updatedState.phone) {
              const guestUserData = {
                name: `${updatedState.firstName} ${updatedState.lastName}`,
                email: updatedState.email || "",
                phone: updatedState.phone,
                language: "he",
              }
              try {
                const result = await createGuestUser(guestUserData)

                if (result.success && result.userId) {
                  setGuestUserId(result.userId)
                  localStorage.setItem("guestUserId", result.userId)

                  // Create initial pending booking immediately
                  await createInitialPendingBooking(result.userId, updatedState)
                } else {
                  toast({
                    variant: "destructive",
                    title: "×©×’×™××” ×‘×™×¦×™×¨×ª ×ž×©×ª×ž×© ××•×¨×—",
                    description: result.error || "× ×¡×” ×©×•×‘",
                  })
                  // Don't block progression if guest creation fails
                }
              } catch (error) {
                toast({
                  variant: "destructive",
                  title: "×©×’×™××” ×‘×™×¦×™×¨×ª ×ž×©×ª×ž×© ××•×¨×—",
                  description: "××™×¨×¢×” ×©×’×™××” ×‘×œ×ª×™ ×¦×¤×•×™×”. × ×¡×” ×©×•×‘.",
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
    },
    [currentStep, guestUserId, currentUser, toast]
  )

  // Function to create initial pending booking
  const createInitialPendingBooking = async (userId: string, guestInfoData: Partial<GuestInfo>) => {
    // âœ… ×ª×™×§×•×Ÿ: validation ×§×¨×™×˜×™ ×©×œ userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      console.error("Invalid userId provided to createInitialPendingBooking:", userId)
      toast({
        variant: "destructive",
        title: "×©×’×™××” ×ž×¢×¨×›×ª×™×ª",
        description: "×ž×–×”×” ×ž×©×ª×ž×© ×œ× ×ª×§×™×Ÿ. ×× × × ×¡×” ×©×•×‘.",
      })
      return
    }

    try {
      // Create a minimal booking with "abandoned_pending_payment" status
      // This ensures the booking appears in admin bookings list immediately
      const result = await saveAbandonedBooking(userId, {
        formState: {
          guestInfo: guestInfoData,
          guestAddress: {}, // Empty initially
          bookingOptions: {}, // Empty initially
          calculatedPrice: null, // Empty initially
          currentStep: 1,
        },
      } as any)

      if (result.success) {
        toast({
          title: "×”×ª×—×œ×ª ×ª×”×œ×™×š ×”×–×ž× ×”",
          description: "×”×”×–×ž× ×” × ×©×ž×¨×” ×‘×ž×¢×¨×›×ª ×•×ª×•×¤×™×¢ ×‘×¢×ž×•×“ ×”×–×ž× ×•×ª ×”×ž× ×”×œ",
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

          if (result.success && result.abandonedBooking) {
            setAbandonedBooking(result.abandonedBooking)
            setShowRecoveryDialog(true)
          }
        } catch (error) {
          console.warn("Error checking for abandoned booking (registered user):", error)
        }
        return // Don't check for guest bookings if user is logged in
      }

      // For guests, check using saved guest user ID
      const savedUserId = localStorage.getItem("guestUserId")

      if (savedUserId) {
        try {
          const result = await getAbandonedBooking(savedUserId)

          if (result.success && result.abandonedBooking) {
            setAbandonedBooking(result.abandonedBooking)
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
            name: `${guestInfo.firstName.trim()} ${guestInfo.lastName.trim()}`,
            email: guestInfo.email.trim(),
            phone: guestInfo.phone.trim(),
            language: "he",
          })
          if (result.success && result.userId) {
            setGuestUserId(result.userId)
            localStorage.setItem("guestUserId", result.userId)
            await createInitialPendingBooking(result.userId, guestInfo)
          } else {
            guestUserCreatedRef.current = false
          }
        } catch (error) {
          console.warn("Auto guest user creation failed:", error)
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
            formState: {
              guestInfo,
              guestAddress,
              bookingOptions,
              calculatedPrice,
              currentStep,
            },
          } as any)

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
  }, [
    currentUser?.id,
    guestUserId,
    guestInfo,
    guestAddress,
    bookingOptions,
    calculatedPrice,
    currentStep,
  ])

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
          bookingOptions.selectedDurationId
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
  }, [
    bookingOptions.bookingDate,
    bookingOptions.selectedTreatmentId,
    bookingOptions.selectedDurationId,
    toast,
    t,
  ])

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
      t => t._id.toString() === bookingOptions.selectedTreatmentId
    )
    if (selectedTreatment?.pricingType === "duration_based" && !bookingOptions.selectedDurationId) {
      setCalculatedPrice(null)
      return
    }

    // âœ… ×ª×™×§×•×Ÿ: ×ž× ×™×¢×ª race condition ×‘×—×™×©×•×‘ ×ž×—×™×¨×™×
    const currentCalculationId = Date.now()
    priceCalculationIdRef.current = currentCalculationId

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
        bookingOptions.source === "subscription_redemption"
          ? bookingOptions.selectedUserSubscriptionId
          : undefined,
    }

    const result = await calculateBookingPrice(payload)

    // âœ… ×‘×“×™×§×ª race condition - ×•×™×“×•× ×©×–×” ×¢×“×™×™×Ÿ ×”×—×™×©×•×‘ ×”×¨×œ×•×•× ×˜×™
    if (priceCalculationIdRef.current !== currentCalculationId) {
      return // ×—×™×©×•×‘ ×ž×™×•×©×Ÿ, ×”×ª×¢×œ×ž×•×ª
    }

    if (result.success && result.priceDetails) {
      setCalculatedPrice(result.priceDetails)
    } else {
      toast({
        variant: "destructive",
        title:
          t(result.error || "bookings.errors.calculatePriceFailedTitle") ||
          result.error ||
          "Error calculating price",
        description: result.issues
          ? result.issues.map((issue: any) => issue.message).join(", ")
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
      const firstAvailableSlot = timeSlots.find(slot => slot.isAvailable)
      if (firstAvailableSlot) {
        setBookingOptions(prev => ({
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
      title: "×”×˜×•×¤×¡ ×©×•×—×–×¨ ×‘×”×¦×œ×—×”",
      description: "× ×™×ª×Ÿ ×œ×”×ž×©×™×š ×ž×”× ×§×•×“×” ×‘×” ×¢×¦×¨×ª",
    })
  }

  const handleStartFresh = () => {
    // Only clear guest-specific data, don't affect registered users
    if (!currentUser) {
      // âœ… ×ª×™×§×•×Ÿ: × ×™×§×•×™ localStorage ×›×•×œ×œ× ×™ ×¨×§ ×œ××•×¨×—×™×
      try {
        localStorage.removeItem("guestUserId")
        localStorage.removeItem("abandonedBooking")
        localStorage.removeItem("bookingFormData")
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
            name: `${guestInfo.firstName} ${guestInfo.lastName}`,
            email: guestInfo.email || "",
            phone: guestInfo.phone,
            language: "he",
          })

          if (result.success && result.userId) {
            setGuestUserId(result.userId)
            localStorage.setItem("guestUserId", result.userId)

            // Create initial pending booking immediately
            await createInitialPendingBooking(result.userId, guestInfo)
          } else {
            console.error("âŒ Failed to create guest user:", result.error)
            toast({
              variant: "destructive",
              title: "×©×’×™××” ×‘×™×¦×™×¨×ª ×ž×©×ª×ž×© ××•×¨×—",
              description: result.error || "× ×¡×” ×©×•×‘",
            })
            return
          }
        } catch (error) {
          console.error("âŒ Error creating guest user:", error)
          toast({
            variant: "destructive",
            title: "×©×’×™××” ×‘×™×¦×™×¨×ª ×ž×©×ª×ž×© ××•×¨×—",
            description: "××™×¨×¢×” ×©×’×™××” ×‘×œ×ª×™ ×¦×¤×•×™×”. × ×¡×” ×©×•×‘.",
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
      // âœ… Skip payment step and create final booking directly
      console.log("ðŸ’° Zero payment detected - creating final booking directly")
      await handleFinalSubmit()
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, CONFIRMATION_STEP_NUMBER))
  }

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

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
    if (
      guestInfo.isBookingForSomeoneElse &&
      guestInfo.recipientEmail &&
      !guestInfo.recipientEmail.includes("@")
    ) {
      toast({
        variant: "destructive",
        title: "×©×’×™××” ×‘×›×ª×•×‘×ª ××™×ž×™×™×œ",
        description: "×× × ×”×–×Ÿ ×›×ª×•×‘×ª ××™×ž×™×™×œ ×ª×§×™× ×” ×¢×‘×•×¨ ×”× ×ž×¢×Ÿ",
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
        t => t._id.toString() === bookingOptions.selectedTreatmentId
      )

      // âœ… Add validation for voucher/subscription redemption
      if (
        bookingOptions.source === "gift_voucher_redemption" &&
        bookingOptions.selectedGiftVoucherId
      ) {
        // Validate treatment matches for treatment vouchers
        if (voucher?.voucherType === "treatment" && voucher.treatmentId) {
          const voucherTreatmentId =
            typeof voucher.treatmentId === "object"
              ? (voucher.treatmentId as any)._id?.toString() ||
                (voucher.treatmentId as any).toString()
              : voucher.treatmentId.toString()

          if (voucherTreatmentId !== bookingOptions.selectedTreatmentId) {
            toast({
              variant: "destructive",
              title: "×©×’×™××” ×‘×‘×—×™×¨×ª ×˜×™×¤×•×œ",
              description: "×”×˜×™×¤×•×œ ×©× ×‘×—×¨ ×œ× ×ª×•×× ×œ×©×•×‘×¨ ×”×˜×™×¤×•×œ",
            })
            return null
          }
        }
      }

      if (
        bookingOptions.source === "subscription_redemption" &&
        bookingOptions.selectedUserSubscriptionId
      ) {
        // Validate treatment matches for subscriptions
        if (userSubscription?.treatmentId) {
          const subTreatmentId =
            typeof userSubscription.treatmentId === "object"
              ? (userSubscription.treatmentId as any)._id?.toString() ||
                (userSubscription.treatmentId as any).toString()
              : userSubscription.treatmentId.toString()

          if (subTreatmentId !== bookingOptions.selectedTreatmentId) {
            toast({
              variant: "destructive",
              title: "×©×’×™××” ×‘×‘×—×™×¨×ª ×˜×™×¤×•×œ",
              description: "×”×˜×™×¤×•×œ ×©× ×‘×—×¨ ×œ× ×ª×•×× ×œ×ž× ×•×™",
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
          bookingOptions.source === "subscription_redemption"
            ? bookingOptions.selectedUserSubscriptionId
            : undefined,
        redeemedGiftVoucherId:
          bookingOptions.source === "gift_voucher_redemption"
            ? bookingOptions.selectedGiftVoucherId
            : undefined,
        customAddressDetails: {
          fullAddress: `${guestAddress.street} ${guestAddress.streetNumber}, ${guestAddress.city}`,
          city: guestAddress.city || "",
          street: guestAddress.street || "",
          streetNumber: guestAddress.streetNumber || "",
          apartment: guestAddress.apartment || undefined,
          entrance: guestAddress.entrance,
          floor: guestAddress.floor,
          notes: guestAddress.notes,
          doorName: guestAddress.doorName,
          buildingName: guestAddress.buildingName,
          hotelName: guestAddress.hotelName,
          roomNumber: guestAddress.roomNumber,
          otherInstructions: guestAddress.otherInstructions,
          hasPrivateParking: guestAddress.hasPrivateParking || false,
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
          ? guestInfo.recipientName || ""
          : `${guestInfo.firstName} ${guestInfo.lastName}`,
        recipientEmail: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientEmail
          : guestInfo.email,
        recipientPhone: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientPhone!
          : guestInfo.phone,
        recipientBirthDate: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientBirthDate
          : guestInfo.birthDate,
        recipientGender: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientGender
          : guestInfo.gender,
        // Add notification preferences
        notificationMethods:
          guestInfo.bookerNotificationMethod === "both"
            ? ["email", "sms"]
            : guestInfo.bookerNotificationMethod === "sms"
              ? ["sms"]
              : ["email"],
        recipientNotificationMethods: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientNotificationMethods === "both"
            ? ["email", "sms"]
            : guestInfo.recipientNotificationMethods === "sms"
              ? ["sms"]
              : ["email"]
          : undefined,
        notificationLanguage: guestInfo.bookerNotificationLanguage || "he",
        // Add required fields for schema compatibility
        // treatmentCategory will be handled in the backend to convert to ObjectId
        consents: {
          customerAlerts: guestInfo.bookerNotificationMethod === "sms" ? "sms" : "email",
          patientAlerts: guestInfo.isBookingForSomeoneElse
            ? guestInfo.recipientNotificationMethods === "sms"
              ? "sms"
              : "email"
            : guestInfo.bookerNotificationMethod === "sms"
              ? "sms"
              : "email",
          marketingOptIn: true,
          termsAccepted: true,
        },
      } as CreateBookingPayloadType & { guestInfo: { name: string; email?: string; phone: string } }

      // Choose the correct function based on user type
      const result = currentUser
        ? await createBooking({
            ...payload,
            userId: currentUser.id, // Use actual user ID for registered users
            // Remove guestInfo for registered users as it's not needed
            guestInfo: undefined,
          })
        : await createGuestBooking(payload)

      if (result.success && result.booking) {
        // âœ… No longer tracking pending booking ID
        return String(result.booking._id)
      } else {
        toast({
          variant: "destructive",
          title:
            t(result.error || "bookings.errors.bookingFailedTitle") ||
            result.error ||
            "Booking failed",
          description: result.issues
            ? result.issues.map(issue => issue.message).join(", ")
            : t(result.error || "bookings.errors.bookingFailedTitle"),
        })
        return null
      }
    } catch (error) {
      console.error("ðŸ’¥ Booking creation error:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.unexpectedError"),
        description: t("bookings.errors.tryAgain"),
      })
      return null
    }
  }, [
    guestInfo,
    guestAddress,
    bookingOptions,
    calculatedPrice,
    guestUserId,
    toast,
    t,
    initialData.activeTreatments,
  ])

  // Handle final confirmation after successful payment
  const handleFinalSubmit = async () => {
    console.log("ðŸŽ¯ handleFinalSubmit called - creating final booking", {
      guestUserId,
      calculatedPrice: calculatedPrice?.finalAmount,
      currentStep,
    })

    setIsLoading(true)
    console.log("â³ Starting final booking creation...")

    try {
      // âœ… Create the booking directly with confirmed status
      const finalBookingId = await createFinalBooking()
      if (!finalBookingId) {
        console.error("âŒ Failed to create final booking")
        toast({
          variant: "destructive",
          title: "×©×’×™××” ×‘×™×¦×™×¨×ª ×”×”×–×ž× ×”",
          description: "×œ× × ×™×ª×Ÿ ×œ×™×¦×•×¨ ××ª ×”×”×–×ž× ×”. ×× × × ×¡×” ×©×•×‘.",
        })
        return
      }

      console.log("âœ… Final booking created successfully:", finalBookingId)

      // Clear saved form state on successful booking
      if (guestUserId) {
        localStorage.removeItem("guestUserId")
        console.log("ðŸ—‘ï¸ Cleared localStorage")
      }

      // Immediately redirect to confirmation page
      console.log("ðŸ”„ Redirecting to confirmation page")
      const confirmationUrl = `/bookings/confirmation?bookingId=${finalBookingId}&status=success`
      console.log("ðŸŽ¯ Redirecting to:", confirmationUrl)

      // Add a small delay to ensure state is updated
      setTimeout(() => {
        router.push(confirmationUrl)
      }, 100)

      toast({
        title: t("bookings.success.bookingCreated"),
        description: t("bookings.success.bookingCreatedDescription"),
      })
    } catch (error) {
      console.error("ðŸ’¥ Booking creation error:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.unexpectedError"),
        description: t("bookings.errors.tryAgain"),
      })
    } finally {
      console.log("ðŸ handleFinalSubmit completed, setting loading to false")
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
    if (
      guestInfo.isBookingForSomeoneElse &&
      guestInfo.recipientEmail &&
      !guestInfo.recipientEmail.includes("@")
    ) {
      toast({
        variant: "destructive",
        title: "×©×’×™××” ×‘×›×ª×•×‘×ª ××™×ž×™×™×œ",
        description: "×× × ×”×–×Ÿ ×›×ª×•×‘×ª ××™×ž×™×™×œ ×ª×§×™× ×” ×¢×‘×•×¨ ×”× ×ž×¢×Ÿ",
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
        t => t._id.toString() === bookingOptions.selectedTreatmentId
      )

      // âœ… Add validation for voucher/subscription redemption
      if (
        bookingOptions.source === "gift_voucher_redemption" &&
        bookingOptions.selectedGiftVoucherId
      ) {
        // Validate treatment matches for treatment vouchers
        if (voucher?.voucherType === "treatment" && voucher.treatmentId) {
          const voucherTreatmentId =
            typeof voucher.treatmentId === "object"
              ? (voucher.treatmentId as any)._id?.toString() ||
                (voucher.treatmentId as any).toString()
              : voucher.treatmentId.toString()

          if (voucherTreatmentId !== bookingOptions.selectedTreatmentId) {
            toast({
              variant: "destructive",
              title: "×©×’×™××” ×‘×‘×—×™×¨×ª ×˜×™×¤×•×œ",
              description: "×”×˜×™×¤×•×œ ×©× ×‘×—×¨ ×œ× ×ª×•×× ×œ×©×•×‘×¨ ×”×˜×™×¤×•×œ",
            })
            return null
          }
        }
      }

      if (
        bookingOptions.source === "subscription_redemption" &&
        bookingOptions.selectedUserSubscriptionId
      ) {
        // Validate treatment matches for subscriptions
        if (userSubscription?.treatmentId) {
          const subTreatmentId =
            typeof userSubscription.treatmentId === "object"
              ? (userSubscription.treatmentId as any)._id?.toString() ||
                (userSubscription.treatmentId as any).toString()
              : userSubscription.treatmentId.toString()

          if (subTreatmentId !== bookingOptions.selectedTreatmentId) {
            toast({
              variant: "destructive",
              title: "×©×’×™××” ×‘×‘×—×™×¨×ª ×˜×™×¤×•×œ",
              description: "×”×˜×™×¤×•×œ ×©× ×‘×—×¨ ×œ× ×ª×•×× ×œ×ž× ×•×™",
            })
            return null
          }
        }
      }

      // âœ… Generate transaction ID for successful payment
      const isProduction = process.env.NODE_ENV === "production"
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
          bookingOptions.source === "subscription_redemption"
            ? bookingOptions.selectedUserSubscriptionId
            : undefined,
        redeemedGiftVoucherId:
          bookingOptions.source === "gift_voucher_redemption"
            ? bookingOptions.selectedGiftVoucherId
            : undefined,
        customAddressDetails: {
          fullAddress: `${guestAddress.street} ${guestAddress.streetNumber}, ${guestAddress.city}`,
          city: guestAddress.city || "",
          street: guestAddress.street || "",
          streetNumber: guestAddress.streetNumber || "",
          apartment: guestAddress.apartment || undefined,
          entrance: guestAddress.entrance,
          floor: guestAddress.floor,
          notes: guestAddress.notes,
          doorName: guestAddress.doorName,
          buildingName: guestAddress.buildingName,
          hotelName: guestAddress.hotelName,
          roomNumber: guestAddress.roomNumber,
          otherInstructions: guestAddress.otherInstructions,
          hasPrivateParking: guestAddress.hasPrivateParking || false,
        },
        priceDetails: calculatedPrice!,
        paymentDetails: {
          paymentStatus: calculatedPrice!.finalAmount === 0 ? "not_required" : "paid", // âœ… Set as paid immediately
          transactionId: calculatedPrice!.finalAmount === 0 ? undefined : transactionId, // âœ… Add transaction ID
        },
        guestInfo: {
          name: `${guestInfo.firstName} ${guestInfo.lastName}`,
          email: guestInfo.email || undefined,
          phone: guestInfo.phone,
        },
        isBookingForSomeoneElse: Boolean(guestInfo.isBookingForSomeoneElse),
        recipientName: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientName || ""
          : `${guestInfo.firstName} ${guestInfo.lastName}`,
        recipientEmail: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientEmail
          : guestInfo.email,
        recipientPhone: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientPhone!
          : guestInfo.phone,
        recipientBirthDate: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientBirthDate
          : guestInfo.birthDate,
        recipientGender: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientGender
          : guestInfo.gender,
        // Add notification preferences
        notificationMethods:
          guestInfo.bookerNotificationMethod === "both"
            ? ["email", "sms"]
            : guestInfo.bookerNotificationMethod === "sms"
              ? ["sms"]
              : ["email"],
        recipientNotificationMethods: guestInfo.isBookingForSomeoneElse
          ? guestInfo.recipientNotificationMethods === "both"
            ? ["email", "sms"]
            : guestInfo.recipientNotificationMethods === "sms"
              ? ["sms"]
              : ["email"]
          : undefined,
        notificationLanguage: guestInfo.bookerNotificationLanguage || "he",
        // Add required fields for schema compatibility
        consents: {
          customerAlerts: guestInfo.bookerNotificationMethod === "sms" ? "sms" : "email",
          patientAlerts: guestInfo.isBookingForSomeoneElse
            ? guestInfo.recipientNotificationMethods === "sms"
              ? "sms"
              : "email"
            : guestInfo.bookerNotificationMethod === "sms"
              ? "sms"
              : "email",
          marketingOptIn: true,
          termsAccepted: true,
        },
      } as CreateBookingPayloadType & { guestInfo: { name: string; email?: string; phone: string } }

      // Choose the correct function based on user type
      const result = currentUser
        ? await createBooking({
            ...payload,
            userId: currentUser.id, // Use actual user ID for registered users
            // Remove guestInfo for registered users as it's not needed
            guestInfo: undefined,
          })
        : await createGuestBooking(payload)

      if (result.success && result.booking) {
        return String(result.booking._id)
      } else {
        toast({
          variant: "destructive",
          title:
            t(result.error || "bookings.errors.bookingFailedTitle") ||
            result.error ||
            "Booking failed",
          description: result.issues
            ? result.issues.map(issue => issue.message).join(", ")
            : t(result.error || "bookings.errors.bookingFailedTitle"),
        })
        return null
      }
    } catch (error) {
      console.error("ðŸ’¥ Final booking creation error:", error)
      toast({
        variant: "destructive",
        title: t("bookings.errors.unexpectedError"),
        description: t("bookings.errors.tryAgain"),
      })
      return null
    }
  }, [
    guestInfo,
    guestAddress,
    bookingOptions,
    calculatedPrice,
    guestUserId,
    toast,
    t,
    initialData.activeTreatments,
    currentUser,
    voucher,
    userSubscription,
  ])

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
            guestInfo={guestInfo as any}
            setGuestInfo={setGuestInfo}
            onConfirm={handleFinalSubmit}
            onPrev={prevStep}
            isLoading={isLoading}
            createPendingBooking={undefined} // âœ… No longer needed - we create final booking directly
            pendingBookingId={null} // âœ… No longer needed
            isRedeeming={Boolean(voucher || userSubscription)}
          />
        )
      case 7:
        return <GuestBookingConfirmation bookingResult={bookingResult} initialData={initialData} />
      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return t("bookings.steps.treatment.title") || "×‘×—×™×¨×ª ×˜×™×¤×•×œ"
      case 2:
        return t("bookings.steps.scheduling.title") || "×ª×–×ž×•×Ÿ ×”×˜×™×¤×•×œ"
      case 3:
        return currentUser ? "×¤×¨×˜×™× ××™×©×™×™×" : t("bookings.steps.guestInfo.title") || "×¤×¨×˜×™× ××™×©×™×™×"
      case 4:
        return t("bookings.addressStep.title") || "×›×ª×•×‘×ª ×”×˜×™×¤×•×œ"
      case 5:
        return t("bookings.steps.summary.title") || "×¡×™×›×•× ×”×”×–×ž× ×”"
      case 6:
        return t("bookings.steps.payment.title") || "×ª×©×œ×•×"
      case 7:
        return t("bookings.steps.confirmation.title") || "××™×©×•×¨ ×”×–×ž× ×”"
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
              ×©×—×–×•×¨ ×”×–×ž× ×”
            </DialogTitle>
            <DialogDescription>
              × ×ž×¦××” ×”×–×ž× ×” ×©×œ× ×”×•×©×œ×ž×” ×ž×”×™×•× ×”××—×¨×•×Ÿ. ×”×× ×ª×¨×¦×” ×œ×”×ž×©×™×š ×ž×”× ×§×•×“×” ×‘×” ×¢×¦×¨×ª ××• ×œ×”×ª×—×™×œ ×ž×—×“×©?
            </DialogDescription>
          </DialogHeader>

          {/* Debug info */}
          {abandonedBooking && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <div>×©×œ×‘: {abandonedBooking.formState?.currentStep || "×œ× ×™×“×•×¢"}</div>
              <div>
                × ×©×ž×¨:{" "}
                {abandonedBooking.formState?.savedAt
                  ? new Date(abandonedBooking.formState.savedAt).toLocaleString("he-IL")
                  : "×œ× ×™×“×•×¢"}
              </div>
              {abandonedBooking.formState?.guestInfo?.firstName && (
                <div>
                  ×©×: {abandonedBooking.formState.guestInfo.firstName}{" "}
                  {abandonedBooking.formState.guestInfo.lastName}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleStartFresh}>
              ×”×ª×—×œ ×ž×—×“×©
            </Button>
            <Button onClick={handleRecoverBooking}>×”×ž×©×š ×ž×”× ×§×•×“×” ×‘×” ×¢×¦×¨×ª×™</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{getStepTitle()}</span>
          <span>
            {currentStep} / {TOTAL_STEPS_WITH_PAYMENT}
          </span>
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


