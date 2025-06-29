"use client"

import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
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
import { createUserByAdmin, updateUserByAdmin, resetPasswordToDefault } from "@/actions/admin-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import type { UserData } from "./user-management"

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
      name: "",
      phone: "",
      email: "",
      password: "",
      gender: "male",
      roles: ["member"],
      dateOfBirth: "",
    },
  })

  useEffect(() => {
    // Only reset the form if initialData actually changed or if it's the first time
    if (!initialData) {
      form.reset({
        name: "",
        phone: "",
        email: "",
        password: "",
        gender: "male",
        roles: ["member"],
        dateOfBirth: "",
      })
      return
    }

    const getFormattedDate = (dateString?: string | null): string => {
      if (!dateString) return ""
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ""
        return format(date, "yyyy-MM-dd")
      } catch (error) {
        console.warn("Invalid date format:", dateString)
        return ""
      }
    }

    const getValidGender = (gender?: "male" | "female" | "other" | null): "male" | "female" | "other" => {
      if (gender && ["male", "female", "other"].includes(gender)) {
        return gender
      }
      return "male"
    }

    const getValidRoles = (roles?: ("admin" | "professional" | "member" | "partner")[]): ("admin" | "professional" | "member" | "partner")[] => {
      if (roles && Array.isArray(roles) && roles.length > 0) {
        return roles.filter(role => ["admin", "professional", "member", "partner"].includes(role))
      }
      return ["member"]
    }

    const newFormData = {
      name: initialData.name || "",
      phone: initialData.phone || "",
      email: initialData.email || "",
      password: "",
      gender: getValidGender(initialData.gender),
      roles: getValidRoles(initialData.roles),
      dateOfBirth: getFormattedDate(initialData.dateOfBirth),
    }

    // Only reset if the current form values are different
    const currentValues = form.getValues()
    const hasChanged = JSON.stringify(currentValues) !== JSON.stringify(newFormData)
    
    if (hasChanged) {
      form.reset(newFormData)
    }
  }, [initialData?.id, form]) // Only depend on the user ID, not the entire object

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

  async function handleResetPassword() {
    if (!initialData) return

    try {
      setLoading(true)
      const result = await resetPasswordToDefault(initialData.id)

      if (!result || !result.success) {
        console.error("Password reset failed:", result)
        toast({ 
          title: t("common.error"), 
          description: result?.message || "Failed to reset password", 
          variant: "destructive" 
        })
        return
      }

      toast({ 
        title: t("common.success"), 
        description: result.message,
        duration: 5000
      })
    } catch (error) {
      console.error("Password reset error:", error)
      toast({ 
        title: t("common.error"), 
        description: "An unexpected error occurred while resetting password.", 
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                {initialData && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    {loading ? t("common.loading") : "איפוס סיסמה ל-User123!"}
                  </Button>
                )}
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? t("common.loading") : initialData ? t("common.saveChanges") : t("common.create")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
