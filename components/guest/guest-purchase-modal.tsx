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
import { UserCircle, LogIn, ShoppingCart, Calendar } from "lucide-react"
import { createGuestUser, type CreateGuestUserPayload } from "@/actions/guest-auth-actions"
import { signIn } from "next-auth/react"
import { useGuestSession } from "@/components/guest/guest-session-manager"

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

export default function GuestPurchaseModal({
  isOpen,
  onClose,
  onGuestCreated,
  purchaseType
}: GuestPurchaseModalProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState<"choice" | "guest-form">("choice")
  const [isLoading, setIsLoading] = useState(false)
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

  // Check if user has existing guest session and show edit option
  useEffect(() => {
    if (hasActiveGuestSession() && isOpen) {
      // User has existing guest session - show choice to continue or edit
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

        // Show appropriate message based on conflict type
        let successMessage = t("guest.creation.successDescription")
        if (result.conflictType === "cross_match") {
          successMessage = t("guest.creation.crossConflictWarning")
        } else if (result.shouldMerge) {
          successMessage = t("guest.creation.willMergeDescription")
        }

        toast({
          title: t("guest.creation.success"),
          description: successMessage,
        })
        onGuestCreated(result.guestUserId, result.shouldMerge, result.existingUserId)
        onClose()
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

  const handleClose = () => {
    setStep("choice")
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            {getPurchaseTypeTitle()}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "choice" 
              ? t("guest.modal.choiceDescription")
              : t("guest.modal.formDescription")
            }
          </DialogDescription>
        </DialogHeader>

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
                      onClick={() => onGuestCreated(guestSession.guestUserId!, false, guestSession.shouldMergeWith)}>
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

              <div className="flex gap-2 pt-4">
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
                  {isLoading ? t("common.loading") : t("guest.modal.continue")}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
} 