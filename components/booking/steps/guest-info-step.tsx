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
import { PhoneInput } from "@/components/common/phone-input"
import { User, Mail, Phone, FileText } from "lucide-react"

interface GuestInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes?: string
}

interface GuestInfoStepProps {
  guestInfo: Partial<GuestInfo>
  setGuestInfo: (info: Partial<GuestInfo>) => void
  onNext: () => void
}

const guestInfoSchema = z.object({
  firstName: z.string().min(2, { message: "שם פרטי חייב להכיל לפחות 2 תווים" }),
  lastName: z.string().min(2, { message: "שם משפחה חייב להכיל לפחות 2 תווים" }),
  email: z.string().email({ message: "כתובת אימייל לא תקינה" }),
  phone: z.string().min(10, { message: "מספר טלפון חייב להכיל לפחות 10 ספרות" }),
  notes: z.string().optional(),
})

type GuestInfoFormData = z.infer<typeof guestInfoSchema>

export function GuestInfoStep({ guestInfo, setGuestInfo, onNext }: GuestInfoStepProps) {
  const { t, dir } = useTranslation()

  const form = useForm<GuestInfoFormData>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: {
      firstName: guestInfo.firstName || "",
      lastName: guestInfo.lastName || "",
      email: guestInfo.email || "",
      phone: guestInfo.phone || "",
      notes: guestInfo.notes || "",
    },
  })

  const onSubmit = (data: GuestInfoFormData) => {
    setGuestInfo(data)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <User className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.guestInfo.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.steps.guestInfo.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("bookings.steps.guestInfo.personalDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t("common.firstName")}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("common.firstName")} {...field} />
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
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t("common.lastName")}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("common.lastName")} {...field} />
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
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("common.email")}
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t("common.email")} {...field} />
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
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t("common.phone")}
                    </FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder={t("common.phone")}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t("bookings.steps.guestInfo.notes")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("bookings.steps.guestInfo.notesPlaceholder")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" size="lg">
                  {t("common.continue")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 