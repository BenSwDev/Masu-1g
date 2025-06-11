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
import { getBookingInitialData, createBooking } from "@/actions/booking-actions"
import { getSubscriptionsForSelection } from "@/actions/subscription-actions"
import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import { signIn } from "next-auth/react"
import { useGuestSession } from "@/components/guest/guest-session-manager"
import type { BookingInitialData } from "@/types/booking"
import type { IUser } from "@/lib/db/models/user"

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

  // Check if user has existing guest session
  useEffect(() => {
    if (hasActiveGuestSession() && isOpen) {
      setStep("choice")
    }
  }, [hasActiveGuestSession, isOpen])

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
    onClose()
    router.push("/auth/login")
  }

  const handleContinueWithExistingGuest = async () => {
    if (!guestSession.guestUserId) return
    
    setIsLoading(true)
    try {
      // Load guest data and proceed to purchase flow
      await loadGuestDataAndProceed(guestSession.guestUserId)
    } catch (error) {
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
    // Get the actual guest user profile
    const { getUserProfile } = await import("@/actions/profile-actions")
    const guestProfileResult = await getUserProfile(guestUserId)
    
    if (!guestProfileResult?.success || !guestProfileResult.user) {
      throw new Error("Failed to load guest profile")
    }
    
    const guestProfile = guestProfileResult.user

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
    
    // Load initial data based on purchase type
    let initialData: any = null
    
    if (purchaseType === "booking") {
      const result = await getBookingInitialData(guestUserId)
      if (result.success) {
        initialData = result.data
      }
    } else if (purchaseType === "subscription") {
      const [subscriptionsResult, treatmentsResult] = await Promise.all([
        getSubscriptionsForSelection(),
        getTreatmentsForSelection()
      ])
      if (subscriptionsResult.success && treatmentsResult.success) {
        initialData = { 
          subscriptions: subscriptionsResult.subscriptions,
          treatments: treatmentsResult.treatments,
          paymentMethods: [] // Guests don't have saved payment methods
        }
      }
    } else if (purchaseType === "gift-voucher") {
      const treatmentsResult = await getTreatmentsForSelection()
      if (treatmentsResult.success) {
        initialData = { 
          treatments: treatmentsResult.treatments,
          initialPaymentMethods: [] // Guests don't have saved payment methods
        }
      }
    }

    if (initialData) {
      setGuestUser(guestUser as IUser)
      setPurchaseData(initialData)
      setStep("purchase-flow")
    } else {
      throw new Error("Failed to load purchase data")
    }
  }

  const handleGuestFormSubmit = async (data: GuestFormValues) => {
    setIsLoading(true)
    try {
      const { name, email, phone, gender, day, month, year } = data

      // Parse date of birth if provided
      let dateOfBirth: Date | undefined
      if (day && month && year) {
        dateOfBirth = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
      }

      const payload: CreateGuestUserPayload = {
        name,
        email,
        phone,
        gender,
        dateOfBirth,
      }

      const result = await createGuestUser(payload)
      
      if (result.success && result.guestUserId) {
        // Update guest session
        updateGuestSession({
          guestUserId: result.guestUserId,
          guestSessionId: result.guestSessionId,
          shouldMergeWith: result.existingUserId,
        })

        // Load guest data and proceed to purchase flow
        await loadGuestDataAndProceed(result.guestUserId)
      } else {
        toast({
          title: t("common.error"),
          description: t(result.error || "guest.creation.failed"),
          variant: "destructive",
        })
      }
    } catch (error) {
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
    setCompletedPurchase(purchase)
    
    // Convert guest to real user
    if (guestSession.guestUserId) {
      try {
        const conversionResult = await convertGuestToRealUser(guestSession.guestUserId)
        if (conversionResult.success) {
          toast({
            title: t("guest.conversion.success"),
            description: t("guest.conversion.description"),
            variant: "default",
          })
        }
      } catch (error) {
        console.warn("Failed to convert guest to real user:", error)
      }
    }
    
    setStep("completion")
  }

  const handleBackToPurchaseChoice = () => {
    setStep("choice")
    setGuestUser(null)
    setPurchaseData(null)
  }

  const handleClose = () => {
    setStep("choice")
    setGuestUser(null)
    setPurchaseData(null)
    setCompletedPurchase(null)
    form.reset()
    onClose()
  }

  const renderPurchaseFlow = () => {
    if (!guestUser || !purchaseData) return null

    switch (purchaseType) {
      case "booking":
        return (
          <BookingWizard
            initialData={purchaseData}
            currentUser={guestUser}
            isGuestMode={true}
            onBookingComplete={handlePurchaseComplete}
          />
        )
             case "subscription":
         return (
           <PurchaseSubscriptionClient
             subscriptions={purchaseData.subscriptions}
             currentUser={guestUser}
             isGuestMode={true}
             onPurchaseComplete={handlePurchaseComplete}
           />
         )
             case "gift-voucher":
         return (
           <PurchaseGiftVoucherClient
             treatments={purchaseData.treatments}
             currentUser={guestUser}
             isGuestMode={true}
             onPurchaseComplete={handlePurchaseComplete}
           />
         )
      default:
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
      </DialogContent>
    </Dialog>
  )
} 