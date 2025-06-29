"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { PhoneInput } from "@/components/common/phone-input"
import { useToast } from "@/components/common/ui/use-toast"
import { updateUserByAdmin, resetPasswordToDefault } from "@/actions/admin-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { ArrowLeft, Key, Save } from "lucide-react"
import type { UserData } from "./user-management"

const userEditSchema = z.object({
  name: z.string().min(2, { message: "שם חייב להיות לפחות 2 תווים" }),
  phone: z.string().min(10, { message: "מספר טלפון לא תקין" }),
  email: z.string().email({ message: "כתובת אימייל לא תקינה" }),
  gender: z.enum(["male", "female", "other"]),
  roles: z.array(z.enum(["admin", "professional", "member", "partner"])).min(1, { message: "חובה לבחור לפחות תפקיד אחד" }),
  dateOfBirth: z.string().optional(),
})

type UserEditFormData = z.infer<typeof userEditSchema>

interface UserEditFormProps {
  user: UserData
}

export function UserEditForm({ user }: UserEditFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      email: user.email || "",
      gender: (user.gender as "male" | "female" | "other") || "male",
      roles: user.roles || ["member"],
      dateOfBirth: user.dateOfBirth ? format(new Date(user.dateOfBirth), "yyyy-MM-dd") : "",
    },
  })

  async function onSubmit(values: UserEditFormData) {
    try {
      setLoading(true)
      const data = new FormData()
      data.append("name", values.name)
      data.append("email", values.email)
      data.append("phone", values.phone)
      values.roles.forEach((r) => data.append("roles[]", r))
      data.append("gender", values.gender)
      if (values.dateOfBirth) data.append("dateOfBirth", values.dateOfBirth)

      const result = await updateUserByAdmin(user.id, data)

      if (!result || !result.success) {
        console.error("Operation failed:", result)
        toast({ 
          title: "שגיאה", 
          description: result?.message || "שגיאה לא ידועה", 
          variant: "destructive" 
        })
        return
      }

      toast({ 
        title: "הצלחה", 
        description: "המשתמש עודכן בהצלחה" 
      })
      
      router.push("/dashboard/admin/users")
    } catch (error) {
      console.error("Form submission error:", error)
      toast({ 
        title: "שגיאה", 
        description: "אירעה שגיאה לא צפויה", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    try {
      setResetPasswordLoading(true)
      const result = await resetPasswordToDefault(user.id)

      if (!result || !result.success) {
        console.error("Password reset failed:", result)
        toast({ 
          title: "שגיאה", 
          description: result?.message || "נכשל איפוס הסיסמה", 
          variant: "destructive" 
        })
        return
      }

      toast({ 
        title: "הצלחה", 
        description: "הסיסמה אופסה ל-User123! בהצלחה",
        duration: 5000
      })
    } catch (error) {
      console.error("Password reset error:", error)
      toast({ 
        title: "שגיאה", 
        description: "אירעה שגיאה באיפוס הסיסמה", 
        variant: "destructive" 
      })
    } finally {
      setResetPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => router.push("/dashboard/admin/users")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        חזרה לרשימת משתמשים
      </Button>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>פרטי המשתמש</CardTitle>
          <CardDescription>
            עריכת פרטי המשתמש במערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם מלא</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} placeholder="הכנס שם מלא" />
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
                      <FormLabel>כתובת אימייל</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled={loading} placeholder="הכנס כתובת אימייל" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מספר טלפון</FormLabel>
                      <FormControl>
                        <PhoneInput
                          fullNumberValue={field.value}
                          onPhoneChange={field.onChange}
                          placeholder="הכנס מספר טלפון"
                          disabled={loading}
                        />
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
                      <FormLabel>מגדר</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
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
                          disabled={loading}
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תפקידים במערכת</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      {[
                        { value: "admin", label: "מנהל" },
                        { value: "professional", label: "מטפל" },
                        { value: "member", label: "לקוח" },
                        { value: "partner", label: "שותף" }
                      ].map((role) => (
                        <div key={role.value} className="flex items-center space-x-2 rtl:space-x-reverse">
                          <Checkbox
                            id={role.value}
                            checked={field.value.includes(role.value as any)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, role.value])
                              } else {
                                field.onChange(field.value.filter((r: string) => r !== role.value))
                              }
                            }}
                            disabled={loading}
                          />
                          <label htmlFor={role.value} className="text-sm font-medium">
                            {role.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button 
                  type="submit" 
                  disabled={loading || resetPasswordLoading}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "שומר..." : "שמור שינויים"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleResetPassword}
                  disabled={loading || resetPasswordLoading}
                  className="flex items-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  {resetPasswordLoading ? "מאפס..." : "איפוס סיסמה ל-User123!"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* User Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>מידע נוסף</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">תאריך הצטרפות:</span>
              <span className="ml-2">{format(new Date(user.createdAt), "dd/MM/yyyy")}</span>
            </div>
            <div>
              <span className="font-medium">מזהה משתמש:</span>
              <span className="ml-2 font-mono">{user.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 