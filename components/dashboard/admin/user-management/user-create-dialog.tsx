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
import { createUser, type CreateUserData } from "@/app/dashboard/(user)/(roles)/admin/users/actions"
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Calendar,
  Crown,
  Briefcase,
  Shield,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2
} from "lucide-react"

const createUserSchema = z.object({
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
  password: z.string()
    .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
    .max(50, "הסיסמה לא יכולה להכיל יותר מ-50 תווים")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "הסיסמה חייבת להכיל לפחות אות קטנה, אות גדולה ומספר"),
  confirmPassword: z.string()
    .min(8, "אישור הסיסמה חייב להכיל לפחות 8 תווים"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "יש לבחור מגדר"
  }),
  dateOfBirth: z.string().optional(),
  roles: z.array(z.enum(["admin", "professional", "member", "partner"]))
    .min(1, "יש לבחור לפחות תפקיד אחד")
    .max(4, "לא ניתן לבחור יותר מ-4 תפקידים")
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"]
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

type CreateUserFormData = z.infer<typeof createUserSchema>

interface UserCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const roleOptions = [
  { value: "member", label: "חבר", icon: User, description: "משתמש רגיל במערכת", color: "bg-blue-100 text-blue-800" },
  { value: "professional", label: "מטפל", icon: Briefcase, description: "מטפל מקצועי", color: "bg-emerald-100 text-emerald-800" },
  { value: "partner", label: "שותף", icon: Shield, description: "שותף עסקי", color: "bg-indigo-100 text-indigo-800" },
  { value: "admin", label: "מנהל", icon: Crown, description: "מנהל מערכת", color: "bg-amber-100 text-amber-800" }
]

export default function UserCreateDialog({
  open,
  onOpenChange,
  onSuccess
}: UserCreateDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  const selectedRoles = form.watch("roles")

  const onSubmit = async (data: CreateUserFormData) => {
    setLoading(true)
    try {
      const userData: CreateUserData = {
        name: data.name.trim(),
        email: data.email?.trim() || undefined,
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
          description: "המשתמש נוצר בהצלחה",
          duration: 5000
        })
        form.reset()
        onSuccess()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה ביצירת המשתמש",
          description: result.error || "אירעה שגיאה לא צפויה"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת המשתמש",
        description: "אירעה שגיאה בתקשורת עם השרת"
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

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    // Ensure at least one of each required character type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
    password += "0123456789"[Math.floor(Math.random() * 10)]
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)]
    
    // Fill the rest randomly
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword()
    form.setValue("password", newPassword)
    form.setValue("confirmPassword", newPassword)
    toast({
      title: "סיסמה נוצרה",
      description: "סיסמה חזקה נוצרה אוטומטית",
      duration: 3000
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            יצירת משתמש חדש
          </DialogTitle>
          <DialogDescription>
            צור משתמש חדש במערכת עם כל הפרטים הנדרשים. שדות עם * הם חובה.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  סיסמה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePassword}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    צור סיסמה חזקה
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    או הכנס סיסמה מותאמת אישית
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>סיסמה *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="הכנס סיסמה"
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute left-0 top-0 h-full px-3 py-2"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          לפחות 8 תווים, כולל אות גדולה, קטנה ומספר
                        </FormDescription>
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
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="הכנס סיסמה שוב"
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute left-0 top-0 h-full px-3 py-2"
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
                    יוצר משתמש...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    צור משתמש
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