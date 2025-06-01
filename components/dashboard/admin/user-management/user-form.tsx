"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/common/ui/dialog"
import { useTranslation } from "@/lib/translations/i18n"
import { toast } from "@/components/common/ui/use-toast"
import { adminAddUser, adminEditUser } from "@/actions/admin-actions"
import { UserRole } from "@/lib/db/models/user" // Assuming UserRole enum is exported

interface UserData {
  id?: string
  name: string
  email: string
  phone?: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: string // ISO string or Date object
  roles: string[]
  // No password here, handled separately
}

interface UserFormProps {
  userToEdit?: UserData | null
  onFormSubmit: () => void // Callback to refresh data or close modal
  setOpen: (open: boolean) => void
}

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 100 - 13 + 1 }, (_, i) => currentYear - 13 - i)
const days = Array.from({ length: 31 }, (_, i) => i + 1)

export function UserForm({ userToEdit, onFormSubmit, setOpen }: UserFormProps) {
  const { t, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const commonPasswordSchema = z.string().min(8, t("errors.weakPassword")).optional().or(z.literal(""))

  const userFormSchema = z
    .object({
      name: z.string().min(2, t("errors.nameRequired")),
      email: z.string().email(t("errors.invalidEmail")),
      phone: z
        .string()
        .optional()
        .refine((val) => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
          message: t("errors.invalidPhone"),
        }),
      password: userToEdit ? commonPasswordSchema : z.string().min(8, t("errors.weakPassword")),
      confirmPassword: userToEdit ? commonPasswordSchema : z.string().min(8, t("errors.weakPassword")),
      gender: z.enum(["male", "female", "other"]).optional(),
      day: z.string().optional(),
      month: z.string().optional(),
      year: z.string().optional(),
      roles: z.array(z.string()).min(1, t("errors.rolesRequired")),
    })
    .refine((data) => userToEdit || data.password === data.confirmPassword, {
      message: t("errors.passwordMismatch"),
      path: ["confirmPassword"],
    })
    .refine((data) => !userToEdit || !data.password || data.password === data.confirmPassword, {
      message: t("errors.passwordMismatch"),
      path: ["confirmPassword"],
    })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: userToEdit?.name || "",
      email: userToEdit?.email || "",
      phone: userToEdit?.phone || "",
      password: "",
      confirmPassword: "",
      gender: userToEdit?.gender || undefined,
      roles: userToEdit?.roles || [UserRole.MEMBER],
      day: userToEdit?.dateOfBirth ? new Date(userToEdit.dateOfBirth).getDate().toString() : "",
      month: userToEdit?.dateOfBirth ? (new Date(userToEdit.dateOfBirth).getMonth() + 1).toString() : "",
      year: userToEdit?.dateOfBirth ? new Date(userToEdit.dateOfBirth).getFullYear().toString() : "",
    },
  })

  const availableRoles = Object.values(UserRole)
  const selectedRoles = watch("roles", userToEdit?.roles || [UserRole.MEMBER])

  const months = [
    { value: "1", label: t("register.january") },
    { value: "2", label: t("register.february") },
    { value: "3", label: t("register.march") },
    { value: "4", label: t("register.april") },
    { value: "5", label: t("register.may") },
    { value: "6", label: t("register.june") },
    { value: "7", label: t("register.july") },
    { value: "8", label: t("register.august") },
    { value: "9", label: t("register.september") },
    { value: "10", label: t("register.october") },
    { value: "11", label: t("register.november") },
    { value: "12", label: t("register.december") },
  ]

  const onSubmit = async (values: z.infer<typeof userFormSchema>) => {
    setIsLoading(true)
    const formData = new FormData()
    formData.append("name", values.name)
    formData.append("email", values.email)
    if (values.phone) formData.append("phone", values.phone)
    if (values.password) formData.append("password", values.password) // Only append if provided
    if (values.gender) formData.append("gender", values.gender)
    if (values.day) formData.append("day", values.day)
    if (values.month) formData.append("month", values.month)
    if (values.year) formData.append("year", values.year)
    values.roles.forEach((role) => formData.append("roles", role))

    try {
      const result = userToEdit?.id ? await adminEditUser(userToEdit.id, formData) : await adminAddUser(formData)

      if (result.success) {
        toast({
          title: t(userToEdit ? "admin.users.userForm.userUpdatedSuccess" : "admin.users.userForm.userAddedSuccess"),
          variant: "default",
        })
        onFormSubmit()
        setOpen(false)
      } else {
        toast({
          title: t("errors.error"),
          description:
            t(result.message as any) ||
            t(userToEdit ? "admin.users.userForm.errorUpdatingUser" : "admin.users.userForm.errorAddingUser"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("errors.error"),
        description: t("errors.unknown"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[600px] bg-white text-gray-800" dir={language === "he" ? "rtl" : "ltr"}>
      <DialogHeader>
        <DialogTitle className="text-turquoise-700">
          {userToEdit ? t("admin.users.editUser") : t("admin.users.addUser")}
        </DialogTitle>
        <DialogDescription>
          {userToEdit ? t("admin.users.userForm.titleEditDesc") : t("admin.users.userForm.titleAddDesc")}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-2">
        {/* Profile Section */}
        <div className="space-y-4 p-4 border border-turquoise-200 rounded-md">
          <h3 className="text-lg font-semibold text-turquoise-600">{t("admin.users.userForm.profileSection")}</h3>
          <div>
            <Label htmlFor="name">{t("admin.users.userForm.nameLabel")}</Label>
            <Input id="name" {...register("name")} className="border-turquoise-200 focus-visible:ring-turquoise-500" />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>
          <div>
            <Label>{t("admin.users.userForm.genderLabel")}</Label>
            <RadioGroup
              defaultValue={userToEdit?.gender}
              onValueChange={(value) => setValue("gender", value as "male" | "female" | "other")}
              className="grid grid-cols-3 gap-3"
            >
              {(["male", "female", "other"] as const).map((g) => (
                <div key={g} className="relative">
                  <RadioGroupItem value={g} id={`gender-${g}`} className="peer sr-only" />
                  <Label
                    htmlFor={`gender-${g}`}
                    className="flex cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-turquoise-500 peer-data-[state=checked]:bg-turquoise-50 peer-data-[state=checked]:text-turquoise-700 [&:has([data-state=checked])]:border-turquoise-500"
                  >
                    {t(`register.${g}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label>{t("admin.users.userForm.dobLabel")}</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select defaultValue={watch("day")} onValueChange={(value) => setValue("day", value)}>
                <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500">
                  <SelectValue placeholder={t("admin.users.userForm.dayPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select defaultValue={watch("month")} onValueChange={(value) => setValue("month", value)}>
                <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500">
                  <SelectValue placeholder={t("admin.users.userForm.monthPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select defaultValue={watch("year")} onValueChange={(value) => setValue("year", value)}>
                <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500">
                  <SelectValue placeholder={t("admin.users.userForm.yearPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="space-y-4 p-4 border border-turquoise-200 rounded-md">
          <h3 className="text-lg font-semibold text-turquoise-600">{t("admin.users.userForm.accountSection")}</h3>
          <div>
            <Label htmlFor="email">{t("admin.users.userForm.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className="border-turquoise-200 focus-visible:ring-turquoise-500"
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">{t("admin.users.userForm.phoneLabel")}</Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              className="border-turquoise-200 focus-visible:ring-turquoise-500"
            />
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">{t("admin.users.userForm.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              className="border-turquoise-200 focus-visible:ring-turquoise-500"
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            {userToEdit && (
              <p className="text-xs text-gray-500 mt-1">{t("admin.users.userForm.passwordInstructions")}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmPassword">{t("admin.users.userForm.confirmPasswordLabel")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              className="border-turquoise-200 focus-visible:ring-turquoise-500"
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        {/* Roles Section */}
        <div className="space-y-4 p-4 border border-turquoise-200 rounded-md">
          <h3 className="text-lg font-semibold text-turquoise-600">{t("admin.users.userForm.rolesSection")}</h3>
          <div className="grid grid-cols-2 gap-4">
            {availableRoles.map((role) => (
              <div key={role} className="flex items-center space-x-2 rtl:space-x-reverse">
                <Checkbox
                  id={`role-${role}`}
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={(checked) => {
                    const newRoles = checked ? [...selectedRoles, role] : selectedRoles.filter((r) => r !== role)
                    setValue("roles", newRoles, { shouldValidate: true })
                  }}
                  className="border-turquoise-300 data-[state=checked]:bg-turquoise-500 data-[state=checked]:text-white"
                />
                <Label htmlFor={`role-${role}`} className="capitalize">
                  {t(`roles.${role}` as any)}
                </Label>
              </div>
            ))}
          </div>
          {errors.roles && <p className="text-red-500 text-sm">{errors.roles.message}</p>}
        </div>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="border-turquoise-500 text-turquoise-500 hover:bg-turquoise-50"
            >
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading} className="bg-turquoise-500 hover:bg-turquoise-600 text-white">
            {isLoading ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
