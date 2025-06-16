"use client"

import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTranslation } from "@/lib/translations/i18n"
import { PhoneInput } from "@/components/common/phone-input"

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
})

interface ProfileFormProps {
  initialValues?: z.infer<typeof profileFormSchema>
  onSubmit: (values: z.infer<typeof profileFormSchema>) => void
}

export function ProfileForm({ initialValues, onSubmit }: ProfileFormProps) {
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialValues || {
      name: "",
      email: "",
      phone: "",
    },
    mode: "onChange",
  })

  function handleSubmit(values: z.infer<typeof profileFormSchema>) {
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("profile.name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("profile.namePlaceholder")} {...field} />
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
              <FormLabel>{t("profile.email")}</FormLabel>
              <FormControl>
                <Input placeholder={t("profile.emailPlaceholder")} {...field} />
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
              <FormLabel>{t("profile.phone")}</FormLabel>
              <FormControl>
                <PhoneInput
                  id="phone"
                  name={field.name}
                  placeholder={t("profile.phonePlaceholder")}
                  fullNumberValue={field.value || ""}
                  onPhoneChange={field.onChange}
                  ref={field.ref}
                  className="border-turquoise-200 focus-visible:ring-turquoise-500"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">{t("profile.saveChanges")}</Button>
      </form>
    </Form>
  )
}
