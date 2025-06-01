"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/common/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Calendar } from "@/components/common/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils/utils" // Assuming cn is in utils
import { toast } from "@/components/common/ui/use-toast"
import { createUserByAdmin, updateUserByAdmin } from "@/actions/admin-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { Checkbox } from "@/components/common/ui/checkbox"
import type { UserData } from "./user-management" // Import UserData type

// Define Zod schema for form validation
const phoneRegex = new RegExp(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/)

const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().regex(phoneRegex, { message: "Invalid phone number." }),
  password: z.string().optional(), // Optional for schema, required conditionally in form
  roles: z.array(z.string()).min(1, { message: "At least one role is required." }),
  gender: z.string().min(1, { message: "Gender is required." }),
  dateOfBirth: z.date().optional().nullable(),
  image: z.string().url({ message: "Invalid URL." }).optional().or(z.literal("")),
})

// Conditional validation for password when creating a new user
const createUserFormSchema = userFormSchema.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

export type UserFormData = z.infer<typeof userFormSchema>

interface UserFormDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  initialData?: UserData | null
  onSuccess: () => void
}

export function UserFormDialog({ isOpen, onOpenChange, initialData, onSuccess }: UserFormDialogProps) {
  const { t, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!initialData

  const currentSchema = isEditing ? userFormSchema : createUserFormSchema

  const form = useForm<UserFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      roles: ["member"], // Default role
      gender: "",
      dateOfBirth: null,
      image: "",
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        password: "", // Password is not edited here
        roles: initialData.roles || ["member"], // Use all roles
        gender: initialData.gender || "",
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : null,
        image: initialData.image || "",
      })
    } else {
      form.reset({
        // Default values for new user
        name: "",
        email: "",
        phone: "",
        password: "",
        roles: ["member"],
        gender: "",
        dateOfBirth: null,
        image: "",
      })
    }
  }, [initialData, form, isOpen]) // Reset form when dialog opens or initialData changes

  const onSubmit = async (values: UserFormData) => {
    setIsLoading(true)
    const formData = new FormData()
    formData.append("name", values.name)
    formData.append("email", values.email)
    formData.append("phone", values.phone)

    // Append each role separately
    values.roles.forEach((role) => {
      formData.append("roles[]", role)
    })

    formData.append("gender", values.gender)
    if (values.dateOfBirth) {
      formData.append("dateOfBirth", values.dateOfBirth.toISOString())
    }
    if (values.image) {
      formData.append("image", values.image)
    }

    let result
    if (isEditing && initialData) {
      // No password change in edit form
      result = await updateUserByAdmin(initialData.id, formData)
    } else {
      if (values.password) {
        // Password is required for new user
        formData.append("password", values.password)
      } else {
        // This case should be caught by Zod schema for createUserFormSchema
        toast({
          title: t("common.error"),
          description: t("admin.users.passwordRequiredForNew"),
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      result = await createUserByAdmin(formData)
    }
    setIsLoading(false)

    if (result.success) {
      onSuccess() // Callback to refresh list and show success toast
      onOpenChange(false) // Close dialog
    } else {
      toast({
        title: t("common.error"),
        description: result.message ? t(result.message, result.message) : t("common.unexpectedError"), // Attempt to translate server message
        variant: "destructive",
      })
    }
  }

  const availableRoles = ["member", "professional", "partner", "admin"]
  const availableGenders = ["male", "female", "other"]

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? t("admin.users.editUserTitle") : t("admin.users.createUserTitle")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("admin.users.editUserDescription") : t("admin.users.createUserDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.users.form.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("admin.users.form.namePlaceholder")} {...field} />
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
                      <Input type="email" placeholder={t("admin.users.form.emailPlaceholder")} {...field} />
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
                      {/* Consider using a dedicated PhoneInput component if available */}
                      <Input type="tel" placeholder={t("admin.users.form.phonePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.users.form.password")}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t("admin.users.form.passwordPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Roles checkboxes */}
              <FormField
                control={form.control}
                name="roles"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">{t("admin.users.form.roles")}</FormLabel>
                      <FormDescription>{t("admin.users.form.rolesDescription")}</FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {availableRoles.map((role) => (
                        <FormField
                          key={role}
                          control={form.control}
                          name="roles"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={role}
                                className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(role)}
                                    onCheckedChange={(checked) => {
                                      const updatedRoles = checked
                                        ? [...field.value, role]
                                        : field.value?.filter((r) => r !== role)

                                      // Ensure at least one role is selected
                                      if (updatedRoles.length === 0) {
                                        toast({
                                          title: t("common.error"),
                                          description: t("admin.users.form.atLeastOneRole"),
                                          variant: "destructive",
                                        })
                                        return
                                      }

                                      field.onChange(updatedRoles)
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {t(`roles.${role.toLowerCase()}`, role)}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.users.form.gender")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("admin.users.form.genderPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableGenders.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {t(`gender.${gender.toLowerCase()}`, gender)}
                          </SelectItem>
                        ))}
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
                    <FormLabel>{t("admin.users.form.dateOfBirth")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-start font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" />
                            {field.value ? (
                              new Date(field.value).toLocaleDateString(language)
                            ) : (
                              <span>{t("admin.users.form.dateOfBirthPlaceholder")}</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
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
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.users.form.imageURL")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("admin.users.form.imageURLPlaceholder")} {...field} />
                    </FormControl>
                    <FormDescription>{t("admin.users.form.imageURLDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading} onClick={form.handleSubmit(onSubmit)}>
            {isLoading ? t("common.saving") : isEditing ? t("common.saveChanges") : t("common.createUser")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
