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
import { UserCircle, LogIn, ShoppingCart, Calendar, ArrowLeft, User, Edit } from "lucide-react"
import { createGuestUser, type CreateGuestUserPayload, updateGuestUser } from "@/actions/guest-auth-actions"
import { signIn } from "next-auth/react"
import { useGuestSession } from "@/components/guest/guest-session-manager"
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"
import GuestSubscriptionClient from "@/components/guest/guest-subscription-client"
import GuestGiftVoucherClient from "@/components/guest/guest-gift-voucher-client"
import GuestUserEditModal from "@/components/guest/guest-user-edit-modal"
import GuestAbandonmentTracker, { type AbandonmentData } from "@/components/guest/guest-abandonment-tracker"

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
type PurchaseStep = "choice" | "guest-form" | "purchase-flow"

interface GuestPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseType: "booking" | "subscription" | "gift-voucher"
  initialData?: any // Data from the respective pages (treatments, subscriptions, etc.)
}

export default function GuestPurchaseModal({
  isOpen,
  onClose,
  purchaseType,
  initialData
}: GuestPurchaseModalProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState<PurchaseStep>("choice")
  const [isLoading, setIsLoading] = useState(false)
  const [guestUser, setGuestUser] = useState<any>(null)
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false)
  const { guestSession, updateGuestSession, hasActiveGuestSession } = useGuestSession()
  
  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gender: "other",
    },
  })

  // Track current form data for abandonment tracking
  const [currentFormData, setCurrentFormData] = useState<any>({})
  const formValues = form.watch()

  // Check if user has existing guest session and show edit option
  useEffect(() => {
    if (hasActiveGuestSession() && isOpen) {
      setStep("choice")
    }
  }, [hasActiveGuestSession, isOpen])

  // Update current form data for abandonment tracking
  useEffect(() => {
    setCurrentFormData({
      step,
      formValues,
      guestUser: guestUser ? {
        email: guestUser.email,
        name: guestUser.name,
        phone: guestUser.phone
      } : null,
      hasActiveSession: hasActiveGuestSession()
    })
  }, [step, formValues, guestUser, hasActiveGuestSession])

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

  const handleGuestCreated = async (guestUserId: string, shouldMerge?: boolean, existingUserId?: string) => {
    try {
      // Fetch guest user data and proceed to purchase flow
      const response = await fetch(`/api/guest-user/${guestUserId}`)
      if (response.ok) {
        const userData = await response.json()
        setGuestUser(userData.user)
        setStep("purchase-flow")
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("guest.fetchError"),
        variant: "destructive",
      })
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

        // Call onGuestCreated to proceed to purchase flow
        handleGuestCreated(
          result.guestUserId, 
          result.shouldMerge, 
          result.existingUserId
        )
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

  const handleContinueWithSession = () => {
    if (guestSession?.guestUserId) {
      handleGuestCreated(
        guestSession.guestUserId,
        false,
        guestSession.shouldMergeWith
      )
    }
  }

  const handleBackToChoice = () => {
    setStep("choice")
    setGuestUser(null)
  }

  const handleUserUpdate = (updatedUser: any) => {
    setGuestUser(updatedUser)
    setIsUserEditModalOpen(false)
  }

  const handleBookingComplete = (bookingId: string) => {
    // Handle booking completion
    toast({
      title: t("bookings.success"),
      description: t("bookings.successMessage"),
    })
    onClose()
  }

  const handleAbandonmentReport = async (abandonmentData: AbandonmentData) => {
    try {
      await fetch('/api/guest-abandonment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(abandonmentData)
      })
    } catch (error) {
      console.error('Failed to report abandonment:', error)
    }
  }

  const handleClose = () => {
    // Report modal close abandonment if user was in progress
    if ((window as any).reportGuestAbandonment) {
      (window as any).reportGuestAbandonment('modal_closed_manually')
    }
    
    setStep("choice")
    setGuestUser(null)
    form.reset()
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold flex items-center gap-3">
              {step === "purchase-flow" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToChoice}
                  className="absolute left-0 top-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              {getPurchaseTypeTitle()}
            </DialogTitle>
            <DialogDescription className="text-center">
              {step === "choice" 
                ? t("guest.modal.choiceDescription")
                : step === "guest-form"
                ? t("guest.modal.formDescription")
                : t("guest.modal.purchaseDescription")
              }
            </DialogDescription>
          </DialogHeader>

          {/* Guest Header for Purchase Flow */}
          {step === "purchase-flow" && guestUser && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-full p-2">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {t("guest.welcomeBack")}, {guestUser?.firstName || guestUser?.name?.split(' ')[0] || 'User'}!
                      </h3>
                                              <p className="text-gray-600 text-sm">{guestUser?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsUserEditModalOpen(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      {t("guest.editDetails")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleLoginClick}>
                      <LogIn className="w-4 h-4 mr-2" />
                      {t("guest.loginAsExisting")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                        onClick={handleContinueWithSession}>
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
                <div className="grid md:grid-cols-2 gap-4">
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
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("register.phone")}</FormLabel>
                        <FormControl>
                          <PhoneInput value={field.value} onChange={field.onChange} />
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
                            <SelectItem value="male">{t("common.male")}</SelectItem>
                            <SelectItem value="female">{t("common.female")}</SelectItem>
                            <SelectItem value="other">{t("register.preferNotToSay")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Date of Birth - Optional */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("register.dateOfBirth")} ({t("common.optional")})
                  </Label>
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
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
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
                    className="flex-1"
                  >
                    {isLoading ? t("common.loading") : t("guest.continueAsGuest")}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === "purchase-flow" && guestUser && (
            <div className="space-y-6">
              {purchaseType === "booking" && (
                <BookingWizard
                  initialData={initialData}
                  currentUser={guestUser}
                  isGuestMode={true}
                  onBookingComplete={handleBookingComplete}
                />
              )}
              
              {purchaseType === "subscription" && (
                <GuestSubscriptionClient
                  subscriptions={initialData?.subscriptions || []}
                  treatments={initialData?.treatments || []}
                  paymentMethods={initialData?.paymentMethods || []}
                  guestUser={guestUser}
                />
              )}
              
              {purchaseType === "gift-voucher" && (
                <GuestGiftVoucherClient
                  treatments={initialData?.treatments || []}
                  paymentMethods={initialData?.paymentMethods || []}
                  guestUser={guestUser}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Guest User Edit Modal */}
      <GuestUserEditModal
        isOpen={isUserEditModalOpen}
        onClose={() => setIsUserEditModalOpen(false)}
        guestUser={guestUser}
        onUserUpdated={handleUserUpdate}
      />

      {/* Guest Abandonment Tracker */}
      <GuestAbandonmentTracker
        isActive={isOpen}
        guestUserId={guestUser?._id || guestSession?.guestUserId}
        purchaseType={purchaseType}
        currentStep={step}
        formData={currentFormData}
        onAbandon={handleAbandonmentReport}
      />
    </>
  )
} 