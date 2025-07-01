"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { PhoneInput } from "@/components/common/phone-input"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { User, Mail, Phone, FileText, Calendar as CalendarIcon, Users } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { cn } from "@/lib/utils/utils"

interface GuestInfo {
  firstName: string
  lastName: string
  email?: string
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
  // Gift options
  isGift?: boolean
  greetingMessage?: string
  sendOption?: "immediate" | "scheduled"
  sendDate?: Date
  sendTime?: string
}

interface GuestInfoStepProps {
  guestInfo: Partial<GuestInfo>
  setGuestInfo: (info: Partial<GuestInfo>) => void
  onNext: (info: Partial<GuestInfo>) => void
  onPrev?: () => void
  defaultBookingForSomeoneElse?: boolean
  hideRecipientBirthGender?: boolean
  showGiftOptions?: boolean
  lockedFields?: (keyof GuestInfo)[]
  hideBookingForSomeoneElse?: boolean
}

export function GuestInfoStep({
  guestInfo,
  setGuestInfo,
  onNext,
  onPrev,
  defaultBookingForSomeoneElse = false,
  hideRecipientBirthGender = false,
  showGiftOptions = false,
  lockedFields = [],
  hideBookingForSomeoneElse = false,
}: GuestInfoStepProps) {
  const { t, dir, language } = useTranslation()
  const [isBookingForSomeoneElse, setIsBookingForSomeoneElse] = useState(
    guestInfo.isBookingForSomeoneElse ?? defaultBookingForSomeoneElse
  )

  // Helper function to check if date is at least 16 years old
  const isAtLeast16YearsOld = (date: Date) => {
    const today = new Date()
    const birthDate = new Date(date)
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 16
    }
    return age >= 16
  }

  const guestInfoSchema = z.object({
    firstName: z.string().min(2, { message: t("guestInfo.validation.firstNameMin") }),
    lastName: z.string().min(2, { message: t("guestInfo.validation.lastNameMin") }),
    email: z.string().email({ message: t("guestInfo.validation.emailInvalid") }).optional(),
    phone: z.string().min(10, { message: t("guestInfo.validation.phoneMin") }),
    birthDate: z.date().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    notes: z.string().optional(),
    isBookingForSomeoneElse: z.boolean().default(false),
    recipientFirstName: z.string().optional(),
    recipientLastName: z.string().optional(),
    recipientEmail: z.string().optional(),
    recipientPhone: z.string().optional(),
    recipientBirthDate: z.date().optional(),
    recipientGender: z.enum(["male", "female", "other"]).optional(),
    isGift: z.boolean().default(false),
    greetingMessage: z.string().optional(),
    sendOption: z.enum(["immediate", "scheduled"]).optional(),
    sendDate: z.date().optional(),
    sendTime: z.string().optional(),
  }).refine((data) => {
    if (data.isBookingForSomeoneElse) {
      return (
        data.recipientFirstName &&
        data.recipientLastName &&
        data.recipientPhone &&
        (hideRecipientBirthGender ? true : data.recipientBirthDate && data.recipientGender)
      )
    }
    return true
  }, {
    message: t("guestInfo.validation.recipientDetailsRequired"),
    path: ["recipientFirstName"]
  }).refine((data) => {
    // Check age requirement for recipient when booking for someone else
    if (!hideRecipientBirthGender && data.isBookingForSomeoneElse && data.recipientBirthDate) {
      return isAtLeast16YearsOld(data.recipientBirthDate)
    }
    // Check age requirement for booker when not booking for someone else (only if provided)
    if (!data.isBookingForSomeoneElse && data.birthDate) {
      return isAtLeast16YearsOld(data.birthDate)
    }
    return true
  }, {
    message: "גיל מינימלי הוא 16 שנים",
    path: ["recipientBirthDate"]
  })

  type GuestInfoFormData = z.infer<typeof guestInfoSchema>

  const form = useForm({
    resolver: zodResolver(guestInfoSchema),
    values: {
      firstName: guestInfo.firstName || "",
      lastName: guestInfo.lastName || "",
      email: guestInfo.email || "",
      phone: guestInfo.phone || "",
      birthDate: guestInfo.birthDate || undefined,
      gender: guestInfo.gender || undefined,
      notes: guestInfo.notes || "",
      isBookingForSomeoneElse: guestInfo.isBookingForSomeoneElse || false,
      recipientFirstName: guestInfo.recipientFirstName || "",
      recipientLastName: guestInfo.recipientLastName || "",
      recipientEmail: guestInfo.recipientEmail || "",
      recipientPhone: guestInfo.recipientPhone || "",
      recipientBirthDate: guestInfo.recipientBirthDate || undefined,
      recipientGender: guestInfo.recipientGender || undefined,
      isGift: guestInfo.isGift || false,
      greetingMessage: guestInfo.greetingMessage || "",
      sendOption: guestInfo.sendOption || "immediate",
      sendDate: guestInfo.sendDate || undefined,
      sendTime: guestInfo.sendTime || "",
    },
  })

  const watchIsGift = form.watch("isGift")
  const watchSendOption = form.watch("sendOption")

  // אם showGiftOptions=true, תמיד isGift=true
  useEffect(() => {
    if (showGiftOptions) {
      form.setValue("isGift", true)
    }
  }, [showGiftOptions, form])

  const timeOptions = useMemo(() => {
    const opts = []
    for (let i = 8; i <= 23; i++) {
      opts.push(`${String(i).padStart(2, "0")}:00`)
    }
    opts.push("00:00")
    return opts
  }, [])

  const onSubmit = (data: GuestInfoFormData) => {
    setGuestInfo(data)
    onNext(data)
  }

  const handleBookingForSomeoneElseChange = (checked: boolean) => {
    setIsBookingForSomeoneElse(checked)
    form.setValue("isBookingForSomeoneElse", checked)
    
    // Clear recipient fields when unchecked
    if (!checked) {
      form.setValue("recipientFirstName", "")
      form.setValue("recipientLastName", "")
      form.setValue("recipientEmail", "")
      form.setValue("recipientPhone", "")
      form.setValue("recipientBirthDate", undefined)
      form.setValue("recipientGender", undefined)
      
      // Also clear from parent state to prevent stale data
      setGuestInfo({
        ...guestInfo,
        isBookingForSomeoneElse: checked,
        recipientFirstName: "",
        recipientLastName: "",
        recipientEmail: "",
        recipientPhone: "",
        recipientBirthDate: undefined,
        recipientGender: undefined,
      })
    } else {
      // When enabling booking for someone else, update parent state
      setGuestInfo({
        ...guestInfo,
        isBookingForSomeoneElse: checked,
      })
    }
  }

  // Date picker helper function
  const isDateDisabled = (date: Date) => {
    const today = new Date()
    const maxDate = new Date()
    maxDate.setFullYear(today.getFullYear() - 16) // Minimum age 16
    return date > maxDate || date < new Date(1900, 0, 1)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <User className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("guestInfo.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("guestInfo.description")}</p>
      </div>

      {/* Show locked fields notification */}
      {lockedFields.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">פרטים נעולים למימוש</h3>
                <p className="text-sm text-blue-600 mt-1">
                  הפרטים הבאים נעולים ולא ניתנים לשינוי כי הם קשורים למנוי או שובר שאתה מממש. 
                  זה מבטיח שרק הבעלים החוקי יכול להשתמש במנוי/שובר.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {lockedFields.map(field => (
                    <span key={field} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                      {field === 'firstName' && 'שם פרטי'}
                      {field === 'lastName' && 'שם משפחה'}
                      {field === 'email' && 'אימייל'}
                      {field === 'phone' && 'טלפון'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Booking For Someone Else Option - Hide when redeeming voucher/subscription */}
          {!hideBookingForSomeoneElse && (
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center space-x-2 ${dir === "rtl" ? "flex-row-reverse space-x-reverse" : ""}`}>
                  <Checkbox
                    id="isBookingForSomeoneElse"
                    checked={isBookingForSomeoneElse}
                    onCheckedChange={handleBookingForSomeoneElseChange}
                  />
                  <label htmlFor="isBookingForSomeoneElse" className={`flex items-center gap-2 cursor-pointer ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                    <Users className="h-4 w-4" />
                    <span>{t("guestInfo.bookingForSomeoneElse")}</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booker Details (Always required) */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                <User className="h-5 w-5" />
                {isBookingForSomeoneElse ? t("guestInfo.bookerDetails") : t("guestInfo.yourDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("guestInfo.firstName")} *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("guestInfo.firstNamePlaceholder")}
                          {...field}
                          disabled={lockedFields.includes("firstName")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("guestInfo.lastName")} *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("guestInfo.lastNamePlaceholder")}
                          {...field}
                          disabled={lockedFields.includes("lastName")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <Mail className="h-4 w-4" />
                      {t("guestInfo.email")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("guestInfo.emailPlaceholder")}
                        {...field}
                        disabled={lockedFields.includes("email")}
                      />
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
                    <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <Phone className="h-4 w-4" />
                      {t("guestInfo.phone")} *
                    </FormLabel>
                    <FormControl>
                      <PhoneInput
                        fullNumberValue={field.value}
                        onPhoneChange={field.onChange}
                        placeholder={t("guestInfo.phonePlaceholder")}
                        disabled={lockedFields.includes("phone")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Only show birth date and gender for booker if NOT booking for someone else */}
              {!isBookingForSomeoneElse && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                          <CalendarIcon className="h-4 w-4" />
                          {t("guestInfo.birthDate")}
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: language === "he" ? he : undefined })
                                ) : (
                                  <span>בחר תאריך לידה</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={isDateDisabled}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={1900}
                                toYear={new Date().getFullYear() - 16}
                              />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guestInfo.gender")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("guestInfo.genderPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">{t("guestInfo.genderMale")}</SelectItem>
                            <SelectItem value="female">{t("guestInfo.genderFemale")}</SelectItem>
                            <SelectItem value="other">{t("guestInfo.genderOther")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <FileText className="h-4 w-4" />
                      {t("guestInfo.notes")}
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("guestInfo.notesPlaceholder")} rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Recipient Details (Only when booking for someone else) */}
          {isBookingForSomeoneElse && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <Users className="h-5 w-5" />
                  {t("guestInfo.recipientDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recipientFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guestInfo.recipientFirstName")} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("guestInfo.firstNamePlaceholder")}
                            {...field}
                            disabled={lockedFields.includes("recipientFirstName")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recipientLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guestInfo.recipientLastName")} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("guestInfo.lastNamePlaceholder")}
                            {...field}
                            disabled={lockedFields.includes("recipientLastName")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                        <Mail className="h-4 w-4" />
                        {t("guestInfo.recipientEmail")}
                      </FormLabel>
                      <FormControl>
                      <Input
                        type="email"
                        placeholder={t("guestInfo.emailPlaceholder")}
                        {...field}
                        disabled={lockedFields.includes("recipientEmail")}
                      />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                        <Phone className="h-4 w-4" />
                        {t("guestInfo.recipientPhone")} *
                      </FormLabel>
                      <FormControl>
                        <PhoneInput
                          fullNumberValue={field.value}
                          onPhoneChange={field.onChange}
                          placeholder={t("guestInfo.phonePlaceholder")}
                          disabled={lockedFields.includes("recipientPhone")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!hideRecipientBirthGender && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="recipientBirthDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                            <CalendarIcon className="h-4 w-4" />
                            {t("guestInfo.recipientBirthDate")} *
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  disabled={lockedFields.includes("recipientBirthDate")}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: language === "he" ? he : undefined })
                                  ) : (
                                    <span>בחר תאריך לידה</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={isDateDisabled || lockedFields.includes("recipientBirthDate")}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={1900}
                                toYear={new Date().getFullYear() - 16}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recipientGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("guestInfo.recipientGender")} *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={lockedFields.includes("recipientGender")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("guestInfo.genderPlaceholder")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">{t("guestInfo.genderMale")}</SelectItem>
                              <SelectItem value="female">{t("guestInfo.genderFemale")}</SelectItem>
                              <SelectItem value="other">{t("guestInfo.genderOther")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {showGiftOptions && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800">
                        <span className="font-medium">שובר מתנה</span>
                        <span className="text-sm">(השובר יישלח למקבל המתנה)</span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="greetingMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("purchaseGiftVoucher.greetingMessage")}</FormLabel>
                          <FormControl>
                            <Textarea placeholder={t("purchaseGiftVoucher.greetingPlaceholder")} rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sendOption"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("purchaseGiftVoucher.sendDate")}</FormLabel>
                          <div className="flex gap-4">
                            <Button type="button" variant={field.value === "immediate" ? "default" : "outline"} onClick={() => field.onChange("immediate")} className="flex-1">
                              {t("purchaseGiftVoucher.sendNow")}
                            </Button>
                            <Button type="button" variant={field.value === "scheduled" ? "default" : "outline"} onClick={() => field.onChange("scheduled")} className="flex-1">
                              {t("purchaseGiftVoucher.sendOnDate")}
                            </Button>
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch("sendOption") === "scheduled" && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="sendDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("purchaseGiftVoucher.selectDate")}</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                      {field.value ? format(field.value, "PPP") : <span>{t("purchaseGiftVoucher.pickDate")}</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sendTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("purchaseGiftVoucher.selectTime")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder={t("purchaseGiftVoucher.selectTime")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className={`flex gap-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            {onPrev && (
              <Button type="button" variant="outline" onClick={onPrev} className="flex-1">
                {t("common.back")}
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {t("common.continue")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 