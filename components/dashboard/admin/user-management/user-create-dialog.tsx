"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Checkbox } from "@/components/common/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"
import { PhoneInput } from "@/components/common/phone-input"
import { createUser, type CreateUserData } from "@/app/dashboard/(user)/(roles)/admin/users/actions"

const createUserSchema = z.object({
  name: z.string().min(2, "השם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת מייל לא תקינה").optional().or(z.literal("")),
  phone: z.string().min(10, "מספר טלפון לא תקין"),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
  confirmPassword: z.string().min(6, "אישור הסיסמה חייב להכיל לפחות 6 תווים"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "יש לבחור מגדר"
  }),
  dateOfBirth: z.string().optional(),
  roles: z.array(z.enum(["admin", "professional", "member", "partner"])).min(1, "יש לבחור לפחות תפקיד אחד")
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"]
})

type CreateUserFormData = z.infer<typeof createUserSchema>

interface UserCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function UserCreateDialog({
  open,
  onOpenChange,
  onSuccess
}: UserCreateDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      gender: "male",
      dateOfBirth: "",
      roles: ["member"]
    }
  })

  const onSubmit = async (data: CreateUserFormData) => {
    setLoading(true)
    try {
      const userData: CreateUserData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        password: data.password,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        roles: data.roles
      }

      const result = await createUser(userData)
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "המשתמש נוצר בהצלחה"
        })
        form.reset()
        onSuccess()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "אירעה שגיאה ביצירת המשתמש"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת המשתמש"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (role: string, checked: boolean) => {
    const currentRoles = form.getValues("roles")
    if (checked) {
      form.setValue("roles", [...currentRoles, role as any])
    } else {
      form.setValue("roles", currentRoles.filter(r => r !== role))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>יצירת משתמש חדש</DialogTitle>
          <DialogDescription>
            צור משתמש חדש במערכת עם כל הפרטים הנדרשים
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם מלא *</FormLabel>
                    <FormControl>
                      <Input placeholder="הכנס שם מלא" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מגדר *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מגדר" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">זכר</SelectItem>
                        <SelectItem value="female">נקבה</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מספר טלפון *</FormLabel>
                    <FormControl>
                      <PhoneInput
                        fullNumberValue={field.value}
                        onPhoneChange={field.onChange}
                        placeholder="הכנס מספר טלפון"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כתובת מייל</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="הכנס כתובת מייל" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date of Birth */}
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תאריך לידה</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סיסמה *</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="הכנס סיסמה" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>אישור סיסמה *</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="אשר את הסיסמה" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Roles */}
            <FormField
              control={form.control}
              name="roles"
              render={() => (
                <FormItem>
                  <FormLabel>תפקידים *</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: "member", label: "חבר" },
                      { value: "professional", label: "מטפל" },
                      { value: "partner", label: "שותף" },
                      { value: "admin", label: "מנהל" }
                    ].map((role) => (
                      <FormField
                        key={role.value}
                        control={form.control}
                        name="roles"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(role.value as any)}
                                onCheckedChange={(checked) => 
                                  handleRoleChange(role.value, checked as boolean)
                                }
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {role.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "יוצר..." : "צור משתמש"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 