"use client"

import { useState, useMemo } from "react"
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
  // ➕ Enhanced Gift options (Step 3)
  isGift?: boolean
  giftGreeting?: string
  giftSendWhen?: "now" | Date
  giftHidePrice?: boolean
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
  showGiftOptions = true, // ➕ Always show gift options now
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
    email: z.string().email({ message: t("guestInfo.validation.emailInvalid") }),
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
    // ➕ Enhanced Gift functionality
    isGift: z.boolean().default(false),
    giftGreeting: z.string().optional(),
    giftSendWhen: z.union([z.literal("now"), z.date()]).optional(),
    giftHidePrice: z.boolean().default(false),
  }).refine((data) => {
    if (data.isBookingForSomeoneElse) {
      return (
        data.recipientFirstName &&
        data.recipientLastName &&
        data.recipientEmail &&
        data.recipientPhone &&
        (hideRecipientBirthGender ? true : data.recipientBirthDate) &&
        (hideRecipientBirthGender ? true : data.recipientGender)
      )
    }
    return true
  }, {
    message: t("guestInfo.validation.recipientDetailsRequired"),
    path: ["recipientFirstName"]
  }).refine((data) => {
    // Check age requirement for recipient
    if (!hideRecipientBirthGender && data.isBookingForSomeoneElse && data.recipientBirthDate) {
      return isAtLeast16YearsOld(data.recipientBirthDate)
    }
    // Check age requirement for booker when not booking for someone else
    if (!data.isBookingForSomeoneElse && data.birthDate) {
      return isAtLeast16YearsOld(data.birthDate)
    }
    return true
  }, {
    message: "גיל מינימלי הוא 16 שנים",
    path: ["recipientBirthDate"]
  })

  type GuestInfoFormData = z.infer<typeof guestInfoSchema>

  const form = useForm<GuestInfoFormData>({
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
      // ➕ Enhanced Gift values
      isGift: guestInfo.isGift || false,
      giftGreeting: guestInfo.giftGreeting || "",
      giftSendWhen: guestInfo.giftSendWhen || "now",
      giftHidePrice: guestInfo.giftHidePrice || false,
    },
  })

  const watchIsGift = form.watch("isGift")
  const watchGiftSendWhen = form.watch("giftSendWhen")
  // timeOptions removed as no longer needed

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
    <div className="space-y-6" dir={dir} lang={language}>
      <div className="text-center">
        <User className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("guestInfo.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("guestInfo.description")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-gray-100 rounded text-xs">
              <strong>Debug (DEV only):</strong>
              <div>Form values: {JSON.stringify(form.getValues(), null, 2)}</div>
              <div>Guest info prop: {JSON.stringify(guestInfo, null, 2)}</div>
              <div>Locked fields: {JSON.stringify(lockedFields, null, 2)}</div>
            </div>
          )}

          {/* Booking for Someone Else Checkbox */}
          {!hideBookingForSomeoneElse && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <Users className="h-5 w-5" />
                  {t("guestInfo.bookingType")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex items-center space-x-2 ${dir === "rtl" ? "space-x-reverse flex-row-reverse" : ""}`}>
                  <Checkbox
                    id="booking-for-someone-else"
                    checked={isBookingForSomeoneElse}
                    onCheckedChange={handleBookingForSomeoneElseChange}
                  />
                  <label htmlFor="booking-for-someone-else" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t("guestInfo.bookingForSomeoneElse")}
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booker Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                <User className="h-5 w-5" />
                {t("guestInfo.bookerDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${dir === "rtl" ? "md:grid-flow-col-dense" : ""}`}>
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
                          dir={dir}
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
                          dir={dir}
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
                    <FormLabel className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <Mail className="h-4 w-4" />
                      {t("guestInfo.email")} *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder={t("guestInfo.emailPlaceholder")} 
                        {...field} 
                        disabled={lockedFields.includes("email")}
                        dir={dir}
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
                    <FormLabel className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <Phone className="h-4 w-4" />
                      {t("guestInfo.phone")} *
                    </FormLabel>
                    <FormControl>
                      <PhoneInput 
                        value={field.value} 
                        onChange={field.onChange} 
                        disabled={lockedFields.includes("phone")}
                        dir={dir}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${dir === "rtl" ? "md:grid-flow-col-dense" : ""}`}>
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                        <CalendarIcon className="h-4 w-4" />
                        {t("guestInfo.birthDate")}
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                                dir === "rtl" && "text-right pr-3 pl-8"
                              )}
                              dir={dir}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: language === "he" ? he : undefined })
                              ) : (
                                <span>{t("guestInfo.selectBirthDate")}</span>
                              )}
                              <CalendarIcon className={`ml-auto h-4 w-4 opacity-50 ${dir === "rtl" ? "mr-auto ml-0" : ""}`} />
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
                            dir={dir}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger dir={dir}>
                            <SelectValue placeholder={t("guestInfo.selectGender")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent dir={dir}>
                          <SelectItem value="male">{t("guestInfo.genders.male")}</SelectItem>
                          <SelectItem value="female">{t("guestInfo.genders.female")}</SelectItem>
                          <SelectItem value="other">{t("guestInfo.genders.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <FileText className="h-4 w-4" />
                      {t("guestInfo.notes")}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t("guestInfo.notesPlaceholder")} 
                        className="resize-none" 
                        {...field} 
                        dir={dir}
                      />
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
                        {t("guestInfo.recipientEmail")} *
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

                {/* ➕ Gift Options Section - Always show for regular bookings */}
                <div className="space-y-4">
                  <div className={`flex items-center space-x-2 ${dir === "rtl" ? "flex-row-reverse space-x-reverse" : ""}`}>
                    <Checkbox
                      id="isGift"
                      checked={watchIsGift}
                      onCheckedChange={(checked) => form.setValue("isGift", checked as boolean)}
                    />
                    <label htmlFor="isGift" className="flex items-center gap-2 cursor-pointer">
                      זה מתנה?
                    </label>
                  </div>

                  {watchIsGift && (
                    <>
                      <FormField
                        control={form.control}
                        name="giftGreeting"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ברכה למתנה</FormLabel>
                            <FormControl>
                              <Textarea placeholder="כתוב ברכה אישית..." rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="giftSendWhen"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>מתי לשלוח המתנה?</FormLabel>
                              <div className="flex gap-2">
                                <Button 
                                  type="button" 
                                  variant={field.value === "now" ? "default" : "outline"} 
                                  onClick={() => field.onChange("now")} 
                                  className="flex-1"
                                >
                                  עכשיו
                                </Button>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button 
                                      type="button"
                                      variant={field.value !== "now" && field.value ? "default" : "outline"} 
                                      className="flex-1"
                                    >
                                      {field.value && field.value !== "now" ? 
                                        format(field.value as Date, "dd/MM/yyyy") : 
                                        "בתאריך"
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={field.value !== "now" ? field.value as Date : undefined}
                                      onSelect={(date) => field.onChange(date)}
                                      initialFocus
                                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="giftHidePrice"
                          render={({ field }) => (
                            <FormItem className="flex flex-col justify-end">
                              <div className={`flex items-center space-x-2 ${dir === "rtl" ? "flex-row-reverse space-x-reverse" : ""}`}>
                                <Checkbox
                                  id="giftHidePrice"
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                                <label htmlFor="giftHidePrice" className="text-sm cursor-pointer">
                                  הסתר מחיר במתנה
                                </label>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>
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