"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { useTranslation } from "@/lib/translations/i18n"
import { UserRole } from "@/lib/db/models/user"
import { createUser, updateUser, type UserFormData } from "@/actions/user-management-actions"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  password: z.string().optional(),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().optional(),
  roles: z.array(z.string()).min(1, "At least one role is required"),
  activeRole: z.string().optional(),
})

interface UserFormProps {
  user?: any
  onSuccess: () => void
  onCancel: () => void
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isEditing = !!user

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      password: "",
      gender: user?.gender || "male",
      dateOfBirth: user?.dateOfBirth || "",
      roles: user?.roles || [UserRole.MEMBER],
      activeRole: user?.activeRole || UserRole.MEMBER,
    },
  })

  const watchedRoles = form.watch("roles")
  const watchedActiveRole = form.watch("activeRole")

  // Update active role when roles change
  useEffect(() => {
    if (watchedRoles.length > 0 && !watchedRoles.includes(watchedActiveRole || "")) {
      form.setValue("activeRole", watchedRoles[0])
    }
  }, [watchedRoles, watchedActiveRole, form])

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true)
    try {
      const result = isEditing ? await updateUser(user._id, data) : await createUser(data)

      if (result.success) {
        toast.success(t(isEditing ? "admin.users.messages.updated" : "admin.users.messages.created"))
        onSuccess()
      } else {
        toast.error(t(result.error || "common.errors.something_went_wrong"))
      }
    } catch (error) {
      toast.error(t("common.errors.something_went_wrong"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = (role: string, checked: boolean) => {
    const currentRoles = form.getValues("roles")
    if (checked) {
      form.setValue("roles", [...currentRoles, role])
    } else {
      const newRoles = currentRoles.filter((r) => r !== role)
      if (newRoles.length === 0) {
        newRoles.push(UserRole.MEMBER)
      }
      form.setValue("roles", newRoles)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {isEditing ? t("admin.users.form.edit_title") : t("admin.users.form.create_title")}
        </h2>
        <p className="text-muted-foreground">
          {isEditing ? t("admin.users.form.edit_description") : t("admin.users.form.create_description")}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.users.form.profile_section")}</CardTitle>
              <CardDescription>{t("admin.users.form.profile_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.users.form.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("admin.users.form.name_placeholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.users.form.gender")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("admin.users.form.gender_placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">{t("common.gender.male")}</SelectItem>
                          <SelectItem value="female">{t("common.gender.female")}</SelectItem>
                          <SelectItem value="other">{t("common.gender.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.users.form.date_of_birth")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.users.form.account_section")}</CardTitle>
              <CardDescription>{t("admin.users.form.account_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.users.form.email")}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t("admin.users.form.email_placeholder")} {...field} />
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
                        <Input placeholder={t("admin.users.form.phone_placeholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditing ? t("admin.users.form.new_password") : t("admin.users.form.password")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={
                            isEditing
                              ? t("admin.users.form.new_password_placeholder")
                              : t("admin.users.form.password_placeholder")
                          }
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.users.form.roles_section")}</CardTitle>
              <CardDescription>{t("admin.users.form.roles_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(UserRole).map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={role}
                      checked={watchedRoles.includes(role)}
                      onCheckedChange={(checked) => handleRoleChange(role, checked as boolean)}
                    />
                    <Label
                      htmlFor={role}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t(`common.roles.${role}`)}
                    </Label>
                  </div>
                ))}
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="activeRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.users.form.active_role")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("admin.users.form.active_role_placeholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {watchedRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`common.roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t("common.actions.saving")
                : isEditing
                  ? t("common.actions.update")
                  : t("common.actions.create")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
