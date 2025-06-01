"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Calendar } from "@/components/common/ui/calendar"
import { CalendarIcon, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { format } from "date-fns"
import { UserRole } from "@/lib/db/models/user" // Assuming UserRole enum is exported
import { useTranslation } from "@/lib/translations/i18n"
import { useState, useMemo } from "react"

const availableRoles = Object.values(UserRole)

const profileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["male", "female", "other"], { required_error: "Gender is required." }),
  dateOfBirth: z.date().optional().nullable(),
})

const accountSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(9, { message: "Phone number is too short." }), // Basic validation
})

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"], // path to field that gets the error
  })

const rolesSchema = z.object({
  roles: z.array(z.string()).min(1, "At least one role must be selected."),
})

// Combined schema for creation
const createUserFormSchema = profileSchema.merge(accountSchema).merge(passwordSchema).merge(rolesSchema)

// Combined schema for editing (password is optional)
const editUserFormSchema = profileSchema.merge(accountSchema).merge(rolesSchema)
const editPasswordSchema = passwordSchema.optional()

export type UserFormValues = z.infer<typeof createUserFormSchema>
export type EditUserFormValues = z.infer<typeof editUserFormSchema>

interface UserFormProps {
  user?: Partial<UserFormValues & { id?: string; dateOfBirth?: string | Date | null }> // For editing
  onSubmit: (values: UserFormValues | EditUserFormValues, password?: string) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  isEditing?: boolean
}

export function UserForm({ user, onSubmit, onCancel, isLoading, isEditing = false }: UserFormProps) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSetNewPassword, setShowSetNewPassword] = useState(!isEditing) // For edit mode, password section is initially hidden

  const formSchema = isEditing ? editUserFormSchema : createUserFormSchema

  const defaultValues = useMemo(() => {
    let dob: Date | undefined | null = undefined
    if (user?.dateOfBirth) {
      if (typeof user.dateOfBirth === "string") dob = new Date(user.dateOfBirth)
      else if (user.dateOfBirth instanceof Date) dob = user.dateOfBirth
    }

    return {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      gender: user?.gender || undefined,
      dateOfBirth: dob,
      roles: user?.roles || [UserRole.MEMBER],
      password: "",
      confirmPassword: "",
    }
  }, [user])

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const handleSubmit = async (values: UserFormValues | EditUserFormValues) => {
    let finalPassword
    if (isEditing && showSetNewPassword) {
      const passwordResult = await passwordForm.trigger()
      if (!passwordResult) return // Don't submit if password validation fails
      finalPassword = passwordForm.getValues().password
    } else if (!isEditing) {
      finalPassword = (values as UserFormValues).password
    }
    await onSubmit(values, finalPassword)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return t("roles.admin")
      case "professional":
        return t("roles.professional")
      case "partner":
        return t("roles.partner")
      case "member":
        return t("roles.member")
      default:
        return role.charAt(0).toUpperCase() + role.slice(1)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <h3 className="text-lg font-medium text-turquoise-700">{t("admin.userForm.profileDetails")}</h3>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.userForm.name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("admin.userForm.namePlaceholder")} {...field} />
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
              <FormLabel>{t("admin.userForm.gender")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.userForm.genderPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">{t("admin.userForm.male")}</SelectItem>
                  <SelectItem value="female">{t("admin.userForm.female")}</SelectItem>
                  <SelectItem value="other">{t("admin.userForm.other")}</SelectItem>
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
              <FormLabel>{t("admin.userForm.dateOfBirth")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>{t("admin.userForm.dateOfBirthPlaceholder")}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => field.onChange(date)}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-medium text-turquoise-700">{t("admin.userForm.accountDetails")}</h3>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.userForm.email")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t("admin.userForm.emailPlaceholder")} {...field} />
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
              <FormLabel>{t("admin.userForm.phone")}</FormLabel>
              <FormControl>
                {/* Consider using a dedicated PhoneInput component if you have one */}
                <Input type="tel" placeholder={t("admin.userForm.phonePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSetNewPassword(!showSetNewPassword)}
            className="mb-4"
          >
            {showSetNewPassword ? t("admin.userForm.cancelSetPassword") : t("admin.userForm.setNewPassword")}
          </Button>
        )}

        {(showSetNewPassword || !isEditing) && (
          <Form {...passwordForm}>
            {" "}
            {/* Nest the password form */}
            <h3 className="text-lg font-medium text-turquoise-700">
              {isEditing ? t("admin.userForm.setNewPassword") : t("admin.userForm.password")}
            </h3>
            <FormField
              control={isEditing ? passwordForm.control : form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.userForm.password")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="********" {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
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
              control={isEditing ? passwordForm.control : form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.userForm.confirmPassword")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showConfirmPassword ? "text" : "password"} placeholder="********" {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
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
          </Form>
        )}

        <h3 className="text-lg font-medium text-turquoise-700">{t("admin.userForm.roles")}</h3>
        <FormField
          control={form.control}
          name="roles"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">{t("admin.userForm.assignRoles")}</FormLabel>
                <FormDescription>{t("admin.userForm.assignRolesDescription")}</FormDescription>
              </div>
              {availableRoles.map((role) => (
                <FormField
                  key={role}
                  control={form.control}
                  name="roles"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={role}
                        className="flex flex-row items-start space-x-3 space-y-0 rtl:space-x-reverse mb-2"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(role)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), role])
                                : field.onChange((field.value || []).filter((value) => value !== role))
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{getRoleLabel(role)}</FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isLoading} className="bg-turquoise-600 hover:bg-turquoise-700 text-white">
            {isLoading ? t("common.saving") : isEditing ? t("common.saveChanges") : t("admin.userForm.createUser")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
