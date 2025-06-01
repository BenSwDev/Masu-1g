"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Eye, EyeOff } from "lucide-react"
import { UserRole, type IUser } from "@/lib/db/models/user"
import { createUser, updateUser } from "@/actions/user-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { toast } from "sonner"

const userFormSchema = z.object({
  name: z.string().min(2, "admin.users.validation.name_required"),
  email: z.string().email("admin.users.validation.email_invalid"),
  phone: z.string().optional(),
  password: z.string().min(8, "admin.users.validation.password_min").optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z.string().optional(),
  roles: z.array(z.nativeEnum(UserRole)).min(1, "admin.users.validation.roles_required"),
  activeRole: z.nativeEnum(UserRole),
})

type UserFormData = z.infer<typeof userFormSchema>

interface UserFormProps {
  initialData?: IUser | null
  onSuccess: () => void
  onCancel: () => void
}

export function UserForm({ initialData, onSuccess, onCancel }: UserFormProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isEditing = !!initialData

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      password: "",
      gender: initialData?.gender || undefined,
      dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split("T")[0] : "",
      roles: initialData?.roles || [UserRole.MEMBER],
      activeRole: initialData?.activeRole || UserRole.MEMBER,
    },
  })

  const watchedRoles = watch("roles")

  const onSubmit = async (data: UserFormData) => {
    setLoading(true)
    try {
      const result = isEditing ? await updateUser(initialData._id, data) : await createUser(data)

      if (result.success) {
        toast.success(
          t(result.message || (isEditing ? "admin.users.messages.updated" : "admin.users.messages.created")),
        )
        onSuccess()
      } else {
        toast.error(t(result.message || "admin.users.errors.save_failed"))
      }
    } catch (error) {
      toast.error(t("common.errors.something_went_wrong"))
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (role: UserRole, checked: boolean) => {
    const currentRoles = watchedRoles
    if (checked) {
      setValue("roles", [...currentRoles, role])
    } else {
      const newRoles = currentRoles.filter((r) => r !== role)
      setValue("roles", newRoles)
      // If removing the active role, set a new active role
      if (watch("activeRole") === role && newRoles.length > 0) {
        setValue("activeRole", newRoles[0])
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.users.form.profile_title")}</CardTitle>
          <CardDescription>{t("admin.users.form.profile_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.users.form.name")}</Label>
              <Input id="name" {...register("name")} placeholder={t("admin.users.form.name_placeholder")} />
              {errors.name && <p className="text-sm text-destructive">{t(errors.name.message!)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">{t("admin.users.form.gender")}</Label>
              <Select onValueChange={(value) => setValue("gender", value as "male" | "female" | "other")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.users.form.gender_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("common.gender.male")}</SelectItem>
                  <SelectItem value="female">{t("common.gender.female")}</SelectItem>
                  <SelectItem value="other">{t("common.gender.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">{t("admin.users.form.date_of_birth")}</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.users.form.account_title")}</CardTitle>
          <CardDescription>{t("admin.users.form.account_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("admin.users.form.email")}</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder={t("admin.users.form.email_placeholder")}
              />
              {errors.email && <p className="text-sm text-destructive">{t(errors.email.message!)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("admin.users.form.phone")}</Label>
              <Input id="phone" {...register("phone")} placeholder={t("admin.users.form.phone_placeholder")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {isEditing ? t("admin.users.form.new_password") : t("admin.users.form.password")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder={t("admin.users.form.password_placeholder")}
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
              {errors.password && <p className="text-sm text-destructive">{t(errors.password.message!)}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.users.form.roles_title")}</CardTitle>
          <CardDescription>{t("admin.users.form.roles_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.values(UserRole).map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={role}
                  checked={watchedRoles.includes(role)}
                  onCheckedChange={(checked) => handleRoleChange(role, checked as boolean)}
                />
                <Label htmlFor={role}>{t(`common.roles.${role}`)}</Label>
              </div>
            ))}
          </div>
          {errors.roles && <p className="text-sm text-destructive">{t(errors.roles.message!)}</p>}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="activeRole">{t("admin.users.form.active_role")}</Label>
            <Select value={watch("activeRole")} onValueChange={(value) => setValue("activeRole", value as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {watchedRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`common.roles.${role}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t("common.actions.saving") : t("common.actions.save")}
        </Button>
      </div>
    </form>
  )
}
