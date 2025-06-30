"use client"

import { useState, useEffect } from "react"
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
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { PhoneInput } from "@/components/common/phone-input"
import {
  updateUser,
  resetUserPassword,
  type UserData,
  type UpdateUserData,
} from "@/app/dashboard/(user)/(roles)/admin/users/actions"

const updateUserSchema = z.object({
  name: z.string().min(2, "השם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת מייל לא תקינה").optional().or(z.literal("")),
  phone: z.string().min(10, "מספר טלפון לא תקין"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "יש לבחור מגדר",
  }),
  dateOfBirth: z.string().optional(),
  roles: z
    .array(z.enum(["admin", "professional", "member", "partner"]))
    .min(1, "יש לבחור לפחות תפקיד אחד"),
})

type UpdateUserFormData = z.infer<typeof updateUserSchema>

interface UserEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserData | null
  onSuccess: () => void
}

export default function UserEditDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserEditDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gender: "male",
      dateOfBirth: "",
      roles: ["member"],
    },
  })

  // Update form when user changes
  useEffect(() => {
    if (user && open) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "male",
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
        roles: user.roles || ["member"],
      })
    }
  }, [user, open, form])

  const onSubmit = async (data: UpdateUserFormData) => {
    if (!user) return

    setLoading(true)
    try {
      const userData: UpdateUserData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        roles: data.roles,
      }

      const result = await updateUser(user._id, userData)

      if (result.success) {
        toast({
          title: "הצלחה",
          description: "המשתמש עודכן בהצלחה",
        })
        onSuccess()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "אירעה שגיאה בעדכון המשתמש",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון המשתמש",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user) return

    setResettingPassword(true)
    try {
      const result = await resetUserPassword(user._id)
      if (result.success) {
        toast({
          title: "הצלחה",
          description: `הסיסמה אופסה ל: ${result.data.newPassword}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "אירעה שגיאה באיפוס הסיסמה",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה באיפוס הסיסמה",
      })
    } finally {
      setResettingPassword(false)
    }
  }

  const handleRoleChange = (role: string, checked: boolean) => {
    const currentRoles = form.getValues("roles")
    if (checked) {
      form.setValue("roles", [...currentRoles, role as any])
    } else {
      form.setValue(
        "roles",
        currentRoles.filter(r => r !== role)
      )
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת משתמש</DialogTitle>
          <DialogDescription>ערוך את פרטי המשתמש {user.name}</DialogDescription>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                      <Input type="email" placeholder="הכנס כתובת מייל" {...field} />
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
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      { value: "admin", label: "מנהל" },
                    ].map(role => (
                      <FormField
                        key={role.value}
                        control={form.control}
                        name="roles"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(role.value as any)}
                                onCheckedChange={checked =>
                                  handleRoleChange(role.value, checked as boolean)
                                }
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">{role.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* User Info Display */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">מידע נוסף</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <strong>תאריך הצטרפות:</strong>
                  <br />
                  {new Date(user.createdAt).toLocaleDateString("he-IL")}
                </div>
                <div>
                  <strong>עדכון אחרון:</strong>
                  <br />
                  {new Date(user.updatedAt).toLocaleDateString("he-IL")}
                </div>
                <div>
                  <strong>מייל מאומת:</strong>
                  <br />
                  {user.emailVerified ? "כן" : "לא"}
                </div>
                <div>
                  <strong>טלפון מאומת:</strong>
                  <br />
                  {user.phoneVerified ? "כן" : "לא"}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetPassword}
                disabled={loading || resettingPassword}
                className="w-full sm:w-auto"
              >
                {resettingPassword ? "מאפס..." : "איפוס סיסמה"}
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                >
                  ביטול
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
                  {loading ? "שומר..." : "שמור שינויים"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
