"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { PhoneInput } from "@/components/common/phone-input"
import { useToast } from "@/components/common/ui/use-toast"
import { createUserByAdmin, updateUserByAdmin } from "@/actions/admin-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"

export interface UserData {
  id: string
  name: string | null
  email: string | null
  phone?: string | null
  roles: string[]
  gender?: string | null
  dateOfBirth?: string | null
}

interface UserFormDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  initialData?: UserData | null
  onSuccess: () => void
}

const userFormSchema = z.object({
  name: z.string().min(2, { message: "שם חייב להיות לפחות 2 תווים" }),
  phone: z.string().min(10, { message: "מספר טלפון לא תקין" }),
  email: z.string().email({ message: "כתובת אימייל לא תקינה" }).optional().or(z.literal("")),
  password: z.string().min(8, { message: "סיסמה חייבת להיות לפחות 8 תווים" }).optional(),
  gender: z.enum(["male", "female", "other"]),
  roles: z.array(z.enum(["admin", "professional", "member", "partner"])).min(1, { message: "חובה לבחור לפחות תפקיד אחד" }),
  dateOfBirth: z.string().optional(),
})

type UserFormData = z.infer<typeof userFormSchema>

export function UserFormDialog({ isOpen, onOpenChange, initialData, onSuccess }: UserFormDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      password: "",
      gender: (initialData?.gender as "male" | "female" | "other") || "male",
      roles: initialData?.roles || ["member"] as any,
      dateOfBirth: initialData?.dateOfBirth ? format(new Date(initialData.dateOfBirth), "yyyy-MM-dd") : "",
    },
  })

  useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      password: "",
      gender: (initialData?.gender as "male" | "female" | "other") || "male",
      roles: initialData?.roles || ["member"] as any,
      dateOfBirth: initialData?.dateOfBirth ? format(new Date(initialData.dateOfBirth), "yyyy-MM-dd") : "",
    })
  }, [initialData, form])

  async function onSubmit(values: UserFormData) {
    try {
      setLoading(true)
      const data = new FormData()
      data.append("name", values.name)
      data.append("email", values.email || "")
      data.append("phone", values.phone ?? "")
      values.roles.forEach((r) => data.append("roles[]", r))
      data.append("gender", values.gender)
      if (values.dateOfBirth) data.append("dateOfBirth", values.dateOfBirth)
      if (!initialData && values.password) data.append("password", values.password)

      let result
      try {
        result = initialData
          ? await updateUserByAdmin(initialData.id, data)
          : await createUserByAdmin(data)
      } catch (apiError) {
        console.error("API Error:", apiError)
        toast({ 
          title: t("common.error"), 
          description: "Failed to communicate with server. Please try again.", 
          variant: "destructive" 
        })
        return
      }

      if (!result || !result.success) {
        console.error("Operation failed:", result)
        toast({ 
          title: t("common.error"), 
          description: result?.message || t("common.unknownError"), 
          variant: "destructive" 
        })
        return
      }

      toast({ title: t("common.success"), description: result.message })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Form submission error:", error)
      toast({ 
        title: t("common.error"), 
        description: "An unexpected error occurred. Please try again.", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? t("admin.users.editUserTitle") : t("admin.users.createUserTitle")}
          </DialogTitle>
          <DialogDescription>
            {initialData ? t("admin.users.editUserDescription") : t("admin.users.createUserDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.users.form.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} placeholder={t("admin.users.form.namePlaceholder") || ""} />
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
                  <FormLabel>{t("admin.users.form.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={loading} placeholder={t("admin.users.form.emailPlaceholder") || ""} />
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
                  <FormLabel>{t("admin.users.form.phone")}</FormLabel>
                  <FormControl>
                    <PhoneInput
                      fullNumberValue={field.value}
                      onPhoneChange={field.onChange}
                      placeholder={t("admin.users.form.phonePlaceholder") || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!initialData && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.users.form.password")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} disabled={loading} placeholder={t("admin.users.form.passwordPlaceholder") || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.users.form.gender")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={loading}>
                        <SelectValue placeholder={t("admin.users.form.genderPlaceholder") || ""} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t("admin.users.form.male")}</SelectItem>
                      <SelectItem value="female">{t("admin.users.form.female")}</SelectItem>
                      <SelectItem value="other">{t("admin.users.form.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Controller
              control={form.control}
              name="roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.users.form.roles")}</FormLabel>
                  <div className="flex flex-col space-y-2">
                    {["admin", "professional", "member", "partner"].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={role}
                          checked={field.value.includes(role as any)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, role])
                            } else {
                              field.onChange(field.value.filter((r: string) => r !== role))
                            }
                          }}
                          disabled={loading}
                        />
                        <label htmlFor={role} className="text-sm font-medium">
                          {t(`admin.users.form.${role}`)}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Controller
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.users.form.dateOfBirth")}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={loading}
                      placeholder={t("admin.users.form.dateOfBirthPlaceholder") || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? t("common.loading") : initialData ? t("common.saveChanges") : t("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
