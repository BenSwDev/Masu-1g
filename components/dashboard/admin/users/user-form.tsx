"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/common/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { PhoneInput } from "@/components/common/phone-input"
import { CalendarIcon, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { format } from "date-fns"
import { createUser, updateUser } from "@/actions/user-actions"
import {
  CreateUserSchema,
  type CreateUserSchemaType,
  UpdateUserFormSchema,
  type UpdateUserFormSchemaType,
} from "@/lib/validation/user-schemas"
import type { IUser, UserRole } from "@/lib/db/models/user"
import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n" // Changed from useI18n
import { toast } from "sonner"

interface UserFormProps {
  initialData: IUser | null
  onSuccess: () => void
  onCancel: () => void
}

const availableRoles = ["admin", "member", "professional", "partner"] as const

export function UserForm({ initialData, onSuccess, onCancel }: UserFormProps) {
  const { t } = useTranslation() // Changed from useI18n
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const formSchema = initialData ? UpdateUserFormSchema : CreateUserSchema

  const form = useForm<CreateUserSchemaType | UpdateUserFormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          gender: initialData.gender || undefined,
          dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
          roles: initialData.roles || [],
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        }
      : {
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          gender: undefined,
          dateOfBirth: undefined,
          roles: [],
        },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        gender: initialData.gender || undefined,
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
        roles: initialData.roles || [],
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      })
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        gender: undefined,
        dateOfBirth: undefined,
        roles: [],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  const onSubmit = async (values: CreateUserSchemaType | UpdateUserFormSchemaType) => {
    setIsLoading(true)
    try {
      let result
      if (initialData) {
        result = await updateUser(initialData._id, values as UpdateUserFormSchemaType)
      } else {
        result = await createUser(values as CreateUserSchemaType)
      }

      if (result.success) {
        toast.success(
          t(
            result.message ||
              (initialData ? "admin.users.notifications.updateSuccess" : "admin.users.notifications.createSuccess"),
          ),
        )
        onSuccess()
      } else {
        toast.error(
          t(
            result.message ||
              (initialData ? "admin.users.notifications.updateError" : "admin.users.notifications.createError"),
          ),
        )
      }
    } catch (error) {
      toast.error(t("common.error.unexpected"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.users.form.nameLabel")}</FormLabel>
              <FormControl>
                <Input placeholder={t("admin.users.form.namePlaceholder")} {...field} disabled={isLoading} />
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
              <FormLabel>{t("admin.users.form.emailLabel")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t("admin.users.form.emailPlaceholder")}
                  {...field}
                  disabled={isLoading}
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
              <FormLabel>{t("admin.users.form.phoneLabel")}</FormLabel>
              <FormControl>
                <PhoneInput
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={t("admin.users.form.phonePlaceholder")}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!initialData && (
          <>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.users.form.passwordLabel")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("admin.users.form.passwordPlaceholder")}
                        {...field}
                        disabled={isLoading}
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.users.form.confirmPasswordLabel")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t("admin.users.form.confirmPasswordPlaceholder")}
                        {...field}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {initialData && (
          <>
            <FormDescription>{t("admin.users.form.passwordEditDescription")}</FormDescription>
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.users.form.newPasswordLabel")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("admin.users.form.newPasswordPlaceholder")}
                        {...field}
                        disabled={isLoading}
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
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.users.form.confirmNewPasswordLabel")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t("admin.users.form.confirmNewPasswordPlaceholder")}
                        {...field}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.users.form.genderLabel")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.users.form.genderPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">{t("gender.male")}</SelectItem>
                  <SelectItem value="female">{t("gender.female")}</SelectItem>
                  <SelectItem value="other">{t("gender.other")}</SelectItem>
                  <SelectItem value="prefer_not_to_say">{t("gender.prefer_not_to_say")}</SelectItem>
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
            <FormItem className="flex flex-col">
              <FormLabel>{t("admin.users.form.dateOfBirthLabel")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      disabled={isLoading}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>{t("admin.users.form.dateOfBirthPlaceholder")}</span>
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
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isLoading}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.users.form.rolesLabel")}</FormLabel>
              <FormDescription>{t("admin.users.form.rolesDescription")}</FormDescription>
              {availableRoles.map((role) => (
                <FormField
                  key={role}
                  control={form.control}
                  name="roles"
                  render={({ field: roleField }) => {
                    return (
                      <FormItem key={role} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={roleField.value?.includes(role as UserRole)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? roleField.onChange([...(roleField.value || []), role as UserRole])
                                : roleField.onChange((roleField.value || []).filter((value) => value !== role))
                            }}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{t(`roles.${role}`)}</FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("common.actions.saving") : t("common.actions.save")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
