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
import { Button } from "@/components/common/ui/button"
import { Checkbox } from "@/components/common/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { useToast } from "@/components/common/ui/use-toast"
import { PhoneInput } from "@/components/common/phone-input"
import { 
  updateUser, 
  resetUserPassword,
  type UserData, 
  type UpdateUserData 
} from "@/app/dashboard/(user)/(roles)/admin/users/actions"
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Calendar,
  Crown,
  Briefcase,
  Shield,
  Edit,
  Key,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UserX
} from "lucide-react"

const updateUserSchema = z.object({
  name: z.string()
    .min(2, "השם חייב להכיל לפחות 2 תווים")
    .max(50, "השם לא יכול להכיל יותר מ-50 תווים")
    .regex(/^[א-ת\s\-']+$|^[a-zA-Z\s\-']+$/, "השם יכול להכיל רק אותיות בעברית או אנגלית"),
  email: z.string()
    .email("כתובת מייל לא תקינה")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .min(10, "מספר טלפון לא תקין")
    .max(15, "מספר טלפון לא תקין"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "יש לבחור מגדר"
  }),
  dateOfBirth: z.string().optional(),
  roles: z.array(z.enum(["admin", "professional", "member", "partner"]))
    .min(1, "יש לבחור לפחות תפקיד אחד")
    .max(4, "לא ניתן לבחור יותר מ-4 תפקידים"),
  isActive: z.boolean().default(true)
}).refine((data) => {
  if (data.dateOfBirth) {
    const birthDate = new Date(data.dateOfBirth)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    return age >= 16 && age <= 120
  }
  return true
}, {
  message: "גיל חייב להיות בין 16 ל-120",
  path: ["dateOfBirth"]
})

type UpdateUserFormData = z.infer<typeof updateUserSchema>

interface UserEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserData | null
  onSuccess: () => void
}

const roleOptions = [
  { value: "member", label: "חבר", icon: User, description: "משתמש רגיל במערכת", color: "bg-blue-100 text-blue-800" },
  { value: "professional", label: "מטפל", icon: Briefcase, description: "מטפל מקצועי", color: "bg-emerald-100 text-emerald-800" },
  { value: "partner", label: "שותף", icon: Shield, description: "שותף עסקי", color: "bg-indigo-100 text-indigo-800" },
  { value: "admin", label: "מנהל", icon: Crown, description: "מנהל מערכת", color: "bg-amber-100 text-amber-800" }
]

export default function UserEditDialog({
  open,
  onOpenChange,
  user,
  onSuccess
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
      isActive: true
    }
  })

  const selectedRoles = form.watch("roles")
  const isActive = form.watch("isActive")

  // Update form when user changes
  useEffect(() => {
    if (user && open) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "male",
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
        roles: user.roles || ["member"],
        isActive: user.isActive !== false
      })
    }
  }, [user, open, form])

  const onSubmit = async (data: UpdateUserFormData) => {
    if (!user) return

    setLoading(true)
    try {
      const userData: UpdateUserData = {
        name: data.name.trim(),
        email: data.email?.trim() || undefined,
        phone: data.phone,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        roles: data.roles,
        isActive: data.isActive
      }

      const result = await updateUser(user._id, userData)
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "המשתמש עודכן בהצלחה",
          duration: 5000
        })
        onSuccess()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה בעדכון המשתמש",
          description: result.error || "אירעה שגיאה לא צפויה"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון המשתמש",
        description: "אירעה שגיאה בתקשורת עם השרת"
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
          duration: 10000
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה באיפוס הסיסמה",
          description: result.error || "אירעה שגיאה לא צפויה"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה באיפוס הסיסמה",
        description: "אירעה שגיאה בתקשורת עם השרת"
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
      const newRoles = currentRoles.filter(r => r !== role)
      // Ensure at least one role is selected
      if (newRoles.length === 0) {
        form.setValue("roles", ["member"])
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "חייב לבחור לפחות תפקיד אחד"
        })
      } else {
        form.setValue("roles", newRoles)
      }
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("he-IL")
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            עריכת משתמש - {user.name}
          </DialogTitle>
          <DialogDescription>
            ערוך את פרטי המשתמש. שדות עם * הם חובה.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* User Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  סטטוס משתמש
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {isActive ? (
                      <UserCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <UserX className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <h4 className="font-medium">
                        {isActive ? "משתמש פעיל" : "משתמש לא פעיל"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {isActive 
                          ? "המשתמש יכול להתחבר ולהשתמש במערכת" 
                          : "המשתמש לא יכול להתחבר למערכת"
                        }
                      </p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={user.roles.includes("admin")}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                {user.roles.includes("admin") && (
                  <p className="text-xs text-muted-foreground mt-2">
                    לא ניתן לבטל הפעלה של משתמש מנהל
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  מידע אישי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormDescription>
                        גיל מינימלי: 16 שנים
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* User Info */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    מידע נוסף
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">נוצר בתאריך:</span>
                      <span className="ml-2 font-medium">{formatDate(user.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">עודכן לאחרונה:</span>
                      <span className="ml-2 font-medium">{formatDate(user.updatedAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">מייל מאומת:</span>
                      <span className="ml-2">
                        {user.emailVerified ? (
                          <Badge className="text-xs bg-green-100 text-green-800">כן</Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-100 text-gray-800">לא</Badge>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">טלפון מאומת:</span>
                      <span className="ml-2">
                        {user.phoneVerified ? (
                          <Badge className="text-xs bg-green-100 text-green-800">כן</Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-100 text-gray-800">לא</Badge>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  פרטי קשר
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        <FormDescription>
                          אופציונלי - לקבלת הודעות מהמערכת
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Password Reset */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  ניהול סיסמה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">איפוס סיסמה</h4>
                    <p className="text-sm text-muted-foreground">
                      צור סיסמה חדשה אוטומטית עבור המשתמש
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" />
                    {resettingPassword ? "מאפס..." : "איפוס סיסמה"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  תפקידים במערכת
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="roles"
                  render={() => (
                    <FormItem>
                      <FormLabel>בחר תפקידים *</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {roleOptions.map((role) => {
                          const Icon = role.icon
                          const isSelected = selectedRoles.includes(role.value as any)
                          
                          return (
                            <div
                              key={role.value}
                              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-primary bg-primary/5 shadow-sm' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleRoleChange(role.value, !isSelected)}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => 
                                    handleRoleChange(role.value, checked as boolean)
                                  }
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Icon className="h-4 w-4" />
                                    <span className="font-medium">{role.label}</span>
                                    {isSelected && (
                                      <Badge className={`text-xs ${role.color}`}>
                                        נבחר
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {role.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <FormDescription>
                        ניתן לבחור מספר תפקידים. לפחות תפקיד אחד נדרש.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                ביטול
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    מעדכן משתמש...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    עדכן משתמש
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 