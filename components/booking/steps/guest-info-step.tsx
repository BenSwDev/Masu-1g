"use client"

import { useState } from "react"
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
import { User, Mail, Phone, FileText, Calendar, Users } from "lucide-react"

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
}

interface GuestInfoStepProps {
  guestInfo: Partial<GuestInfo>
  setGuestInfo: (info: Partial<GuestInfo>) => void
  onNext: () => void
}

export function GuestInfoStep({ guestInfo, setGuestInfo, onNext }: GuestInfoStepProps) {
  const { t, dir } = useTranslation()
  const [isBookingForSomeoneElse, setIsBookingForSomeoneElse] = useState(
    guestInfo.isBookingForSomeoneElse || false
  )

  const guestInfoSchema = z.object({
    firstName: z.string().min(2, { message: t("guestInfo.validation.firstNameMin") }),
    lastName: z.string().min(2, { message: t("guestInfo.validation.lastNameMin") }),
    email: z.string().email({ message: t("guestInfo.validation.emailInvalid") }),
    phone: z.string().min(10, { message: t("guestInfo.validation.phoneMin") }),
    birthDate: z.string().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    notes: z.string().optional(),
    isBookingForSomeoneElse: z.boolean().optional().default(false),
    recipientFirstName: z.string().optional(),
    recipientLastName: z.string().optional(),
    recipientEmail: z.string().optional(),
    recipientPhone: z.string().optional(),
    recipientBirthDate: z.string().optional(),
    recipientGender: z.enum(["male", "female", "other"]).optional(),
  }).refine((data) => {
    if (data.isBookingForSomeoneElse) {
      return (
        data.recipientFirstName &&
        data.recipientLastName &&
        data.recipientEmail &&
        data.recipientPhone &&
        data.recipientBirthDate &&
        data.recipientGender
      )
    }
    return true
  }, {
    message: t("guestInfo.validation.recipientDetailsRequired"),
    path: ["recipientFirstName"]
  })

  type GuestInfoFormData = z.infer<typeof guestInfoSchema>

  const form = useForm<GuestInfoFormData>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: {
      firstName: guestInfo.firstName || "",
      lastName: guestInfo.lastName || "",
      email: guestInfo.email || "",
      phone: guestInfo.phone || "",
      birthDate: guestInfo.birthDate ? guestInfo.birthDate.toISOString().split('T')[0] : "",
      gender: guestInfo.gender || undefined,
      notes: guestInfo.notes || "",
      isBookingForSomeoneElse: guestInfo.isBookingForSomeoneElse || false,
      recipientFirstName: guestInfo.recipientFirstName || "",
      recipientLastName: guestInfo.recipientLastName || "",
      recipientEmail: guestInfo.recipientEmail || "",
      recipientPhone: guestInfo.recipientPhone || "",
      recipientBirthDate: guestInfo.recipientBirthDate ? guestInfo.recipientBirthDate.toISOString().split('T')[0] : "",
      recipientGender: guestInfo.recipientGender || undefined,
    },
  })

  const onSubmit = (data: GuestInfoFormData) => {
    const processedData: Partial<GuestInfo> = {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      recipientBirthDate: data.recipientBirthDate ? new Date(data.recipientBirthDate) : undefined,
    }
    setGuestInfo(processedData)
    onNext()
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
      form.setValue("recipientBirthDate", "")
      form.setValue("recipientGender", undefined)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <User className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("guestInfo.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("guestInfo.description")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Booking For Someone Else Option */}
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
                        <Input placeholder={t("guestInfo.firstNamePlaceholder")} {...field} />
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
                        <Input placeholder={t("guestInfo.lastNamePlaceholder")} {...field} />
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
                      {t("guestInfo.email")} *
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t("guestInfo.emailPlaceholder")} {...field} />
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
                      <PhoneInput {...field} placeholder={t("guestInfo.phonePlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                        <Calendar className="h-4 w-4" />
                        {t("guestInfo.birthDate")}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                          <Input placeholder={t("guestInfo.firstNamePlaceholder")} {...field} />
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
                          <Input placeholder={t("guestInfo.lastNamePlaceholder")} {...field} />
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
                        <Input type="email" placeholder={t("guestInfo.emailPlaceholder")} {...field} />
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
                        <PhoneInput {...field} placeholder={t("guestInfo.phonePlaceholder")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recipientBirthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                          <Calendar className="h-4 w-4" />
                          {t("guestInfo.recipientBirthDate")} *
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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
              </CardContent>
            </Card>
          )}

          <div className={`flex gap-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <Button type="submit" className="flex-1">
              {t("common.continue")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 