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
import type { UserData } from "./user-management" // Import UserData type

// Define Zod schema for form validation
const phoneRegex = new RegExp(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/)

const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().regex(phoneRegex, { message: "Invalid phone number." }),
  password: z.string().optional(), // Optional for schema, required conditionally in form
  role: z.string().min(1, { message: "Role is required." }),
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
  const { t, i18n } = useTranslation()
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
      role: "member", // Default role
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
        role: initialData.roles?.[0] || "member", // Assuming first role is primary
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
        role: "member",
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
    formData.append("role", values.role)
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
      <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("admin.users.editUserTitle") : t("admin.users.createUserTitle")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("admin.users.editUserDescription") : t("admin.users.createUserDescription")}
          </DialogDescription>
        </DialogHeader>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.users.form.role")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("admin.users.form.rolePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`roles.${role.toLowerCase()}`, role)}
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
            </div>
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
                            new Date(field.value).toLocaleDateString(i18n.language)
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
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("common.saving") : isEditing ? t("common.saveChanges") : t("common.createUser")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
