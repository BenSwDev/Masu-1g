"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/common/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Badge } from "@/components/common/ui/badge"
import { UserRole } from "@/lib/db/models/user"
import { useTranslation } from "@/lib/translations/i18n"
import { createUser, updateUser } from "@/actions/user-actions"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff } from "lucide-react"
import type { UserColumn } from "./users-columns"

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().optional(),
  roles: z.array(z.enum([UserRole.MEMBER, UserRole.PROFESSIONAL, UserRole.PARTNER, UserRole.ADMIN])).min(1),
  activeRole: z.enum([UserRole.MEMBER, UserRole.PROFESSIONAL, UserRole.PARTNER, UserRole.ADMIN]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
})

type UserFormData = z.infer<typeof userFormSchema>

interface UserFormProps {
  user?: UserColumn
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
      gender: user?.gender || "male",
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
      roles: user?.roles || [UserRole.MEMBER],
      activeRole: user?.activeRole || UserRole.MEMBER,
      password: "",
    },
  })

  const watchedRoles = form.watch("roles")
  const watchedActiveRole = form.watch("activeRole")

  // Update active role if it's not in selected roles
  if (watchedActiveRole && !watchedRoles.includes(watchedActiveRole)) {
    form.setValue("activeRole", watchedRoles[0])
  }

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true)
    try {
      let result

      if (isEditing) {
        result = await updateUser({ ...data, id: user.id })
      } else {
        result = await createUser(data)
      }

      if (result.success) {
        toast.success(t(isEditing ? "users.messages.updateSuccess" : "users.messages.createSuccess"))
        onSuccess()
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = (role: string, checked: boolean) => {
    const currentRoles = form.getValues("roles")
    let newRoles: string[]

    if (checked) {
      newRoles = [...currentRoles, role]
    } else {
      newRoles = currentRoles.filter((r) => r !== role)
    }

    form.setValue("roles", newRoles)

    // If active role was removed, set to first available role
    const activeRole = form.getValues("activeRole")
    if (!newRoles.includes(activeRole!) && newRoles.length > 0) {
      form.setValue("activeRole", newRoles[0] as UserRole)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{isEditing ? t("users.editUser") : t("users.addUser")}</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("users.sections.personalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("users.fields.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("users.placeholders.name")} {...field} />
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
                      <FormLabel>{t("users.fields.gender")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("users.placeholders.gender")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">{t("users.gender.male")}</SelectItem>
                          <SelectItem value="female">{t("users.gender.female")}</SelectItem>
                          <SelectItem value="other">{t("users.gender.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.fields.dateOfBirth")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("users.sections.accountInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("users.fields.email")}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t("users.placeholders.email")} {...field} />
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
                      <FormLabel>{t("users.fields.phone")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("users.placeholders.phone")} {...field} />
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
                      {isEditing ? t("users.fields.newPassword") : t("users.fields.password")}
                      {isEditing && <span className="text-sm text-muted-foreground ml-2">({t("users.optional")})</span>}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("users.placeholders.password")}
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

          {/* Roles & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("users.sections.rolesPermissions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <FormLabel className="text-base">{t("users.fields.roles")}</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {Object.values(UserRole).map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        checked={watchedRoles.includes(role)}
                        onCheckedChange={(checked) => handleRoleChange(role, !!checked)}
                      />
                      <label
                        htmlFor={role}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t(`users.roles.${role}`)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="activeRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.fields.activeRole")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("users.placeholders.activeRole")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {watchedRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`users.roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-2">
                {watchedRoles.map((role) => (
                  <Badge key={role} variant={role === watchedActiveRole ? "default" : "outline"}>
                    {t(`users.roles.${role}`)}
                    {role === watchedActiveRole && " ★"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
