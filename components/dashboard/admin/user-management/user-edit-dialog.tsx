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
import { Switch } from "@/components/common/ui/switch"
import { Separator } from "@/components/common/ui/separator"
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
  UserX,
  Info
} from "lucide-react"

// Same schema as create but with optional email
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
  gender: z.enum(["male", "female"], {
    required_error: "יש לבחור מגדר"
  }),
  dateOfBirth: z.string().optional(),
  roles: z.array(z.enum(["admin", "professional", "member", "partner"]))
    .min(1, "יש לבחור לפחות תפקיד אחד"),
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
  { 
    value: "member", 
    label: "חבר", 
    icon: User, 
    description: "משתמש רגיל במערכת", 
    color: "bg-blue-100 text-blue-800" 
  },
  { 
    value: "professional", 
    label: "מטפל", 
    icon: Briefcase, 
    description: "מטפל מקצועי", 
    color: "bg-emerald-100 text-emerald-800" 
  },
  { 
    value: "partner", 
    label: "שותף", 
    icon: Shield, 
    description: "שותף עסקי", 
    color: "bg-indigo-100 text-indigo-800" 
  },
  { 
    value: "admin", 
    label: "מנהל", 
    icon: Crown, 
    description: "מנהל מערכת", 
    color: "bg-amber-100 text-amber-800" 
  }
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
        onOpenChange(false)
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
          description: "סיסמה אופסה בהצלחה. המשתמש יקבל סיסמה חדשה במייל",
          duration: 5000
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה באיפוס סיסמה",
          description: result.error || "אירעה שגיאה לא צפויה"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה באיפוס סיסמה",
        description: "אירעה שגיאה בתקשורת עם השרת"
      })
    } finally {
      setResettingPassword(false)
    }
  }

  const handleRoleChange = (role: string, checked: boolean) => {
    const currentRoles = form.getValues("roles")
    if (checked) {
      form.setValue("roles", [...currentRoles, role] as any)
    } else {
      form.setValue("roles", currentRoles.filter(r => r !== role) as any)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            עריכת משתמש: {user.name}
          </DialogTitle>
          <DialogDescription>
            ערוך את פרטי המשתמש והרשאותיו במערכת
          </DialogDescription>
        </DialogHeader>

        {/* User Info Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "פעיל" : "לא פעיל"}
                </Badge>
                <Badge variant="outline">
                  נוצר: {new Date(user.createdAt).toLocaleDateString('he-IL')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פרטים אישיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>שם מלא *</FormLabel>
                        <FormControl>
                          <Input placeholder="הזן שם מלא" {...field} />
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
                    <FormItem>
                      <FormLabel>תאריך לידה</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                <CardTitle className="text-lg">פרטי קשר</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>כתובת מייל</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="example@email.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        כתובת המייל תשמש להתחברות למערכת
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מספר טלפון *</FormLabel>
                      <FormControl>
                        <PhoneInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">תפקידים והרשאות</CardTitle>
                <FormDescription>
                  בחר את התפקידים של המשתמש במערכת
                </FormDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roleOptions.map((role) => {
                    const Icon = role.icon
                    const isSelected = selectedRoles.includes(role.value as any)
                    
                    return (
                      <div
                        key={role.value}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleRoleChange(role.value, !isSelected)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                          />
                          <Icon className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-medium">{role.label}</div>
                            <div className="text-sm text-gray-500">{role.description}</div>
                          </div>
                          {isSelected && (
                            <Badge className={role.color}>
                              נבחר
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Status & Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">סטטוס ופעולות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <FormLabel>משתמש פעיל</FormLabel>
                    <FormDescription>
                      האם המשתמש יכול להתחבר למערכת
                    </FormDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">איפוס סיסמה</div>
                    <div className="text-sm text-muted-foreground">
                      שלח למשתמש סיסמה חדשה במייל
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="gap-2"
                  >
                    <Key className="h-4 w-4" />
                    {resettingPassword ? "מאפס..." : "אפס סיסמה"}
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                {loading ? "שומר..." : "שמור שינויים"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 