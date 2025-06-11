"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTranslation } from "@/lib/translations/i18n"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { PhoneInput } from "@/components/common/phone-input"
import { useToast } from "@/components/common/ui/use-toast"
import { Separator } from "@/components/common/ui/separator"
import { UserCircle, LogIn, ShoppingCart, Calendar, ArrowLeft, X } from "lucide-react"
import { createGuestUser, convertGuestToRealUser, type CreateGuestUserPayload } from "@/actions/guest-auth-actions"
import { createBooking } from "@/actions/booking-actions"
import { getSubscriptionsForSelection } from "@/actions/subscription-actions"
import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import { signIn } from "next-auth/react"
import { useGuestSession } from "@/components/guest/guest-session-manager"
import type { BookingInitialData } from "@/types/booking"
import type { IUser } from "@/lib/db/models/user"
import { logger } from "@/lib/logs/logger"
import { QueryProvider } from "@/components/common/providers/query-provider"

// Import the existing purchase components
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"
import PurchaseSubscriptionClient from "@/components/dashboard/member/subscriptions/purchase-subscription-client"
import PurchaseGiftVoucherClient from "@/components/dashboard/member/gift-vouchers/purchase-gift-voucher-client"

const guestFormSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().min(10, "מספר טלפון לא תקין").optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  day: z.string().optional(),
  month: z.string().optional(),
  year: z.string().optional(),
})

type GuestFormValues = z.infer<typeof guestFormSchema>

interface GuestPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onGuestCreated: (guestUserId: string, shouldMerge?: boolean, existingUserId?: string) => void
  purchaseType: "booking" | "subscription" | "gift-voucher"
}

type ModalStep = "choice" | "guest-form" | "purchase-flow" | "completion"

export default function GuestPurchaseModal({
  isOpen,
  onClose,
  onGuestCreated,
  purchaseType
}: GuestPurchaseModalProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState<ModalStep>("choice")
  const [isLoading, setIsLoading] = useState(false)
  const { guestSession, updateGuestSession, hasActiveGuestSession } = useGuestSession()
  
  // Guest user and purchase data
  const [guestUser, setGuestUser] = useState<IUser | null>(null)
  const [purchaseData, setPurchaseData] = useState<any>(null)
  const [completedPurchase, setCompletedPurchase] = useState<any>(null)

  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gender: "other",
    },
  })

  // Check if user has existing guest session - only run when modal opens
  useEffect(() => {
    if (isOpen) {
      logger.info("🔓 Guest purchase modal opened", {
        purchaseType,
        hasActiveGuestSession: hasActiveGuestSession(),
        guestUserId: guestSession.guestUserId,
        step
      })
      
      // Only set initial step when modal first opens
      if (hasActiveGuestSession()) {
        logger.info("👤 Found existing guest session", {
          guestUserId: guestSession.guestUserId,
          guestSessionId: guestSession.guestSessionId,
          shouldMergeWith: guestSession.shouldMergeWith
        })
        // Don't override step if we're already in a flow
        setStep(prevStep => prevStep === "choice" ? "choice" : prevStep)
      }
    }
  }, [isOpen])

  // Generate years, months, days for date of birth
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 13 - i)
  const months = [
    { value: "1", label: t("register.january") },
    { value: "2", label: t("register.february") },
    { value: "3", label: t("register.march") },
    { value: "4", label: t("register.april") },
    { value: "5", label: t("register.may") },
    { value: "6", label: t("register.june") },
    { value: "7", label: t("register.july") },
    { value: "8", label: t("register.august") },
    { value: "9", label: t("register.september") },
    { value: "10", label: t("register.october") },
    { value: "11", label: t("register.november") },
    { value: "12", label: t("register.december") },
  ]
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  const getPurchaseTypeTitle = () => {
    switch (purchaseType) {
      case "booking":
        return t("landing.bookTreatment")
      case "subscription":
        return t("landing.bookSubscription")
      case "gift-voucher":
        return t("landing.bookGiftVoucher")
      default:
        return t("guest.purchase.title")
    }
  }

  const handleLoginClick = () => {
    logger.info("🔐 User chose to login instead of guest", {
      purchaseType,
      currentStep: step
    })
    
    onClose()
    router.push("/auth/login")
  }

  const handleContinueWithExistingGuest = async () => {
    logger.info("🚀 Starting guest purchase flow with existing guest", {
      guestUserId: guestSession.guestUserId,
      purchaseType,
      hasGuestSession: hasActiveGuestSession()
    })
    
    if (!guestSession.guestUserId) {
      logger.error("❌ No guest user ID in session", { guestSession })
      return
    }
    
    setIsLoading(true)
    try {
      logger.info("📥 Loading guest data and proceeding to purchase flow", {
        guestUserId: guestSession.guestUserId,
        purchaseType
      })
      
      // Load guest data and proceed to purchase flow
      await loadGuestDataAndProceed(guestSession.guestUserId)
      
      logger.info("✅ Successfully loaded guest data and proceeded to purchase flow")
    } catch (error) {
      logger.error("❌ Failed to load guest data", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        guestUserId: guestSession.guestUserId,
        purchaseType
      })
      
      toast({
        title: t("common.error"),
        description: t("guest.load.failed"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadGuestDataAndProceed = async (guestUserId: string) => {
    logger.info("📊 Loading guest data and purchase data", {
      guestUserId,
      purchaseType,
      step: "start"
    })
    
    try {
      // Get the actual guest user profile
      logger.info("👤 Loading guest profile", { guestUserId })
      const { getUserProfile } = await import("@/actions/profile-actions")
      const guestProfileResult = await getUserProfile(guestUserId)
      
      logger.info("📋 Guest profile result", {
        success: guestProfileResult?.success,
        hasUser: !!guestProfileResult?.user,
        userData: guestProfileResult?.user ? {
          hasId: !!(guestProfileResult.user._id || guestProfileResult.user.id),
          hasName: !!guestProfileResult.user.name,
          hasEmail: !!guestProfileResult.user.email,
          isGuest: guestProfileResult.user.isGuest
        } : null
      })
      
      if (!guestProfileResult?.success || !guestProfileResult.user) {
        logger.error("❌ Failed to load guest profile", {
          guestUserId,
          profileResult: guestProfileResult
        })
        throw new Error("Failed to load guest profile")
      }
      
      const guestProfile = guestProfileResult.user
      logger.info("✅ Guest profile loaded successfully")

      // Create user session for the guest with real data
      const guestUser: any = {
        id: guestProfile._id || guestProfile.id,
        name: guestProfile.name || "",
        email: guestProfile.email || "",
        roles: ["member"],
        phone: guestProfile.phone,
        gender: guestProfile.gender,
        dateOfBirth: guestProfile.dateOfBirth,
        address: guestProfile.address,
        isGuest: true
      }
      
      logger.info("👤 Created guest user session", {
        hasId: !!guestUser.id,
        hasName: !!guestUser.name,
        hasEmail: !!guestUser.email,
        isGuest: guestUser.isGuest
      })
      
      // Load initial data based on purchase type
      let initialData: any = null
      
      logger.info("📦 Loading purchase data", { purchaseType })
      
      if (purchaseType === "booking") {
        logger.info("🏥 Loading booking data...")
        const { getBookingInitialDataForGuest } = await import("@/actions/booking-actions")
        const result = await getBookingInitialDataForGuest(guestUserId)
        logger.info("📋 Booking data result", {
          success: result.success,
          hasData: !!result.data,
          error: result.error
        })
        if (result.success) {
          initialData = result.data
          logger.info("✅ Booking data loaded", {
            hasTreatments: !!result.data?.activeTreatments,
            treatmentCount: result.data?.activeTreatments?.length,
            hasSubscriptions: !!result.data?.activeUserSubscriptions,
            subscriptionCount: result.data?.activeUserSubscriptions?.length
          })
        }
      } else if (purchaseType === "subscription") {
        logger.info("📅 Loading subscription data...")
        const [subscriptionsResult, treatmentsResult] = await Promise.all([
          getSubscriptionsForSelection(),
          getTreatmentsForSelection()
        ])
        
        logger.info("📋 Subscription loading results", {
          subscriptionsSuccess: subscriptionsResult.success,
          subscriptionsCount: subscriptionsResult.subscriptions?.length,
          subscriptionsError: subscriptionsResult.error,
          treatmentsSuccess: treatmentsResult.success,
          treatmentsCount: treatmentsResult.treatments?.length,
          treatmentsError: treatmentsResult.error
        })
        
        if (subscriptionsResult.success && treatmentsResult.success) {
          initialData = { 
            subscriptions: subscriptionsResult.subscriptions,
            treatments: treatmentsResult.treatments,
            paymentMethods: [] // Guests don't have saved payment methods
          }
          logger.info("✅ Subscription data loaded", {
            subscriptionCount: initialData.subscriptions?.length,
            treatmentCount: initialData.treatments?.length
          })
        }
      } else if (purchaseType === "gift-voucher") {
        logger.info("🎁 Loading gift voucher data...")
        const treatmentsResult = await getTreatmentsForSelection()
        
        logger.info("📋 Gift voucher treatments result", {
          success: treatmentsResult.success,
          treatmentCount: treatmentsResult.treatments?.length,
          error: treatmentsResult.error
        })
        
        if (treatmentsResult.success) {
          initialData = { 
            treatments: treatmentsResult.treatments,
            initialPaymentMethods: [] // Guests don't have saved payment methods
          }
          logger.info("✅ Gift voucher data loaded", {
            treatmentCount: initialData.treatments?.length
          })
        }
      }

      logger.info("📊 Final data loading result", {
        hasInitialData: !!initialData,
        dataType: purchaseType,
        dataKeys: initialData ? Object.keys(initialData) : []
      })

      if (initialData) {
        logger.info("🚀 Proceeding to purchase flow", {
          step: "purchase-flow",
          hasGuestUser: !!guestUser,
          hasInitialData: !!initialData
        })
        
        setGuestUser(guestUser as IUser)
        setPurchaseData(initialData)
        setStep("purchase-flow")
        
        logger.info("✅ Successfully set guest user and purchase data, moved to purchase flow")
      } else {
        logger.error("❌ No initial data loaded", {
          purchaseType,
          guestUserId
        })
        throw new Error("Failed to load purchase data")
      }
    } catch (error) {
      logger.error("❌ Exception in loadGuestDataAndProceed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        guestUserId,
        purchaseType
      })
      throw error
    }
  }

  const handleGuestFormSubmit = async (data: GuestFormValues) => {
    logger.info("🆕 Creating new guest user", {
      formData: { ...data, phone: data.phone ? "***" : undefined }, // Hide phone for privacy
      purchaseType
    })
    
    setIsLoading(true)
    try {
      const { name, email, phone, gender, day, month, year } = data

      // Parse date of birth if provided
      let dateOfBirth: Date | undefined
      if (day && month && year) {
        dateOfBirth = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
        logger.debug("📅 Parsed date of birth", { day, month, year, dateOfBirth })
      }

      const payload: CreateGuestUserPayload = {
        name,
        email,
        phone,
        gender,
        dateOfBirth,
      }

      logger.info("🔄 Calling createGuestUser API", {
        hasName: !!payload.name,
        hasEmail: !!payload.email,
        hasPhone: !!payload.phone,
        hasGender: !!payload.gender,
        hasDateOfBirth: !!payload.dateOfBirth
      })

      const result = await createGuestUser(payload)
      
      logger.info("📋 Guest user creation result", {
        success: result.success,
        hasGuestUserId: !!result.guestUserId,
        hasGuestSessionId: !!result.guestSessionId,
        hasExistingUserId: !!result.existingUserId,
        shouldMerge: result.shouldMerge,
        error: result.error
      })
      
      if (result.success && result.guestUserId) {
        logger.info("✅ Guest user created successfully, updating session", {
          guestUserId: result.guestUserId,
          guestSessionId: result.guestSessionId,
          shouldMergeWith: result.existingUserId
        })
        
        // Update guest session
        updateGuestSession({
          guestUserId: result.guestUserId,
          guestSessionId: result.guestSessionId,
          shouldMergeWith: result.existingUserId,
        })

        logger.info("🔄 Proceeding to load guest data and start purchase flow")
        
        // Load guest data and proceed to purchase flow
        await loadGuestDataAndProceed(result.guestUserId)
      } else {
        logger.error("❌ Guest user creation failed", {
          result,
          payload: { ...payload, email: "***", phone: "***" } // Hide sensitive data
        })
        
        toast({
          title: t("common.error"),
          description: t(result.error || "guest.creation.failed"),
          variant: "destructive",
        })
      }
    } catch (error) {
      logger.error("❌ Exception during guest user creation", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        purchaseType
      })
      
      toast({
        title: t("common.error"),
        description: t("guest.creation.failed"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurchaseComplete = async (purchase: any) => {
    logger.info("🎉 Purchase completed by guest!", {
      purchaseType,
      guestUserId: guestSession.guestUserId,
      purchaseData: purchase ? {
        hasId: !!purchase._id || !!purchase.id,
        type: purchase.type || "unknown"
      } : null
    })
    
    setCompletedPurchase(purchase)
    
    // Convert guest to real user
    if (guestSession.guestUserId) {
      try {
        logger.info("🔄 Converting guest to real user", {
          guestUserId: guestSession.guestUserId
        })
        
        const conversionResult = await convertGuestToRealUser(guestSession.guestUserId)
        
        logger.info("📋 Guest conversion result", {
          success: conversionResult.success,
          error: conversionResult.error
        })
        
        if (conversionResult.success) {
          logger.info("✅ Guest converted to real user successfully")
          toast({
            title: t("guest.conversion.success"),
            description: t("guest.conversion.description"),
            variant: "default",
          })
        } else {
          logger.warn("⚠️ Guest conversion failed but purchase was successful", {
            error: conversionResult.error
          })
        }
      } catch (error) {
        logger.error("❌ Exception during guest conversion", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          guestUserId: guestSession.guestUserId
        })
      }
    } else {
      logger.warn("⚠️ No guest user ID found for conversion", {
        guestSession
      })
    }
    
    logger.info("✅ Moving to completion step")
    setStep("completion")
  }

  const handleBackToPurchaseChoice = () => {
    logger.info("⬅️ User going back to purchase choice", {
      currentStep: step,
      purchaseType
    })
    
    setStep("choice")
    setGuestUser(null)
    setPurchaseData(null)
  }

  const handleClose = () => {
    logger.info("❌ Closing guest purchase modal", {
      currentStep: step,
      purchaseType,
      hadGuestUser: !!guestUser,
      hadPurchaseData: !!purchaseData,
      hadCompletedPurchase: !!completedPurchase
    })
    
    setStep("choice")
    setGuestUser(null)
    setPurchaseData(null)
    setCompletedPurchase(null)
    form.reset()
    onClose()
  }

    const renderPurchaseFlow = () => {
    logger.debug("🔄 Rendering purchase flow", {
      purchaseType,
      hasGuestUser: !!guestUser,
      hasPurchaseData: !!purchaseData,
      guestUserId: guestUser?.id,
      step
    })
    
    if (!guestUser || !purchaseData) {
      logger.warn("⚠️ Cannot render purchase flow - missing data", {
        hasGuestUser: !!guestUser,
        hasPurchaseData: !!purchaseData,
        purchaseType
      })
      return null
    }

    logger.info("🎨 Rendering purchase component", {
      purchaseType,
      componentData: {
        booking: purchaseType === "booking" ? {
          hasInitialData: !!purchaseData,
          dataKeys: purchaseData ? Object.keys(purchaseData) : []
        } : null,
        subscription: purchaseType === "subscription" ? {
          subscriptionCount: purchaseData.subscriptions?.length,
          treatmentCount: purchaseData.treatments?.length
        } : null,
        giftVoucher: purchaseType === "gift-voucher" ? {
          treatmentCount: purchaseData.treatments?.length
        } : null
      }
    })

    switch (purchaseType) {
      case "booking":
        logger.info("🏥 Rendering BookingWizard component")
        
        // Validate data before passing to BookingWizard
        if (!purchaseData?.activeTreatments || !purchaseData?.workingHoursSettings) {
          logger.error("❌ Invalid booking data for BookingWizard", {
            hasActiveTreatments: !!purchaseData?.activeTreatments,
            hasWorkingHoursSettings: !!purchaseData?.workingHoursSettings,
            purchaseDataKeys: purchaseData ? Object.keys(purchaseData) : []
          })
          return (
            <div className="p-4 text-center">
              <p className="text-red-600">{t("common.error")}: נתוני הזמנה לא תקינים</p>
            </div>
          )
        }
        
        if (!guestUser?.id || !guestUser?.name || !guestUser?.email) {
          logger.error("❌ Invalid guest user data for BookingWizard", {
            hasId: !!guestUser?.id,
            hasName: !!guestUser?.name,
            hasEmail: !!guestUser?.email
          })
          return (
            <div className="p-4 text-center">
              <p className="text-red-600">{t("common.error")}: נתוני משתמש אורח לא תקינים</p>
            </div>
          )
        }
        
        logger.info("✅ BookingWizard data validation passed", {
          treatmentCount: purchaseData.activeTreatments?.length,
          hasWorkingHours: !!purchaseData.workingHoursSettings,
          guestUserId: guestUser.id
        })
        
        try {
          return (
            <BookingWizard
              initialData={purchaseData}
              currentUser={guestUser}
              isGuestMode={true}
              onBookingComplete={handlePurchaseComplete}
            />
          )
        } catch (error) {
          logger.error("❌ Error rendering BookingWizard", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          })
          return (
            <div className="p-4 text-center">
              <p className="text-red-600">{t("common.error")}: שגיאה בטעינת אשף ההזמנה</p>
              <p className="text-sm text-gray-600 mt-2">נא לנסות שוב או ליצור קשר עם התמיכה</p>
            </div>
          )
        }
      case "subscription":
        logger.info("📅 Rendering PurchaseSubscriptionClient component")
        return (
          <PurchaseSubscriptionClient
            subscriptions={purchaseData.subscriptions}
            treatments={purchaseData.treatments}
            paymentMethods={purchaseData.paymentMethods}
            currentUser={guestUser}
            isGuestMode={true}
            onPurchaseComplete={handlePurchaseComplete}
          />
        )
      case "gift-voucher":
        logger.info("🎁 Rendering PurchaseGiftVoucherClient component")
        return (
          <PurchaseGiftVoucherClient
            treatments={purchaseData.treatments}
            initialPaymentMethods={purchaseData.initialPaymentMethods}
            currentUser={guestUser}
            isGuestMode={true}
            onPurchaseComplete={handlePurchaseComplete}
          />
        )
      default:
        logger.error("❌ Unknown purchase type", { purchaseType })
        return null
    }
  }

  const modalSize = step === "purchase-flow" ? "max-w-7xl w-full h-[90vh]" : "sm:max-w-md md:max-w-lg"

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={modalSize}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            {step === "purchase-flow" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToPurchaseChoice}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
              </Button>
            )}
            <DialogTitle className="text-center text-xl font-bold flex-1">
              {step === "completion" ? t("guest.purchase.completed") : getPurchaseTypeTitle()}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-center">
            {step === "choice" 
              ? t("guest.modal.choiceDescription")
              : step === "guest-form"
              ? t("guest.modal.formDescription")
              : step === "completion"
              ? t("guest.modal.completionDescription")
              : t("guest.modal.purchaseDescription")
            }
          </DialogDescription>
        </DialogHeader>

        <QueryProvider>
          <div className={step === "purchase-flow" ? "overflow-y-auto flex-1" : ""}>
            {step === "choice" && (
            <div className="space-y-4">
              <Card className="cursor-pointer hover:shadow-md transition-all" onClick={handleLoginClick}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <LogIn className="h-5 w-5 text-turquoise-600" />
                    {t("guest.modal.login")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {t("guest.modal.loginDescription")}
                  </p>
                </CardContent>
              </Card>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t("common.or")}
                  </span>
                </div>
              </div>

              {hasActiveGuestSession() ? (
                <>
                  <Card className="cursor-pointer hover:shadow-md transition-all border-turquoise-200 bg-turquoise-50" 
                        onClick={handleContinueWithExistingGuest}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3 text-base">
                        <ShoppingCart className="h-5 w-5 text-turquoise-600" />
                        {t("guest.modal.continueWithSession")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {t("guest.modal.continueWithSessionDescription")}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setStep("guest-form")}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3 text-base">
                        <UserCircle className="h-5 w-5 text-turquoise-600" />
                        {t("guest.modal.editGuestDetails")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {t("guest.modal.editGuestDetailsDescription")}
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setStep("guest-form")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-base">
                      <UserCircle className="h-5 w-5 text-turquoise-600" />
                      {t("guest.modal.continueAsGuest")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {t("guest.modal.guestDescription")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === "guest-form" && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGuestFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("register.fullName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("register.fullNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("register.email")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("register.emailPlaceholder")} type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("register.phone")}</FormLabel>
                      <FormControl>
                        <PhoneInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("register.gender")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("register.selectGender")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">{t("register.male")}</SelectItem>
                          <SelectItem value="female">{t("register.female")}</SelectItem>
                          <SelectItem value="other">{t("register.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>{t("register.dateOfBirth")} ({t("register.optional")})</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="day"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("register.day")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {days.map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("register.month")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {months.map((month) => (
                                <SelectItem key={month.value} value={month.value}>
                                  {month.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("register.year")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("choice")}
                    className="flex-1"
                  >
                    {t("common.back")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-turquoise-600 hover:bg-turquoise-700"
                  >
                    {isLoading ? t("common.loading") : t("guest.modal.continueAsGuest")}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === "purchase-flow" && renderPurchaseFlow()}

          {step === "completion" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("guest.purchase.completed")}
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  {t("guest.purchase.completedDescription")}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  {t("common.close")}
                </Button>
                <Button
                  onClick={() => {
                    handleClose()
                    router.push("/dashboard")
                  }}
                  className="flex-1 bg-turquoise-600 hover:bg-turquoise-700"
                >
                  {t("guest.goToDashboard")}
                </Button>
              </div>
            </div>
          )}
          </div>
        </QueryProvider>
      </DialogContent>
    </Dialog>
  )
} 