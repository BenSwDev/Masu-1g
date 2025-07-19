"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { useToast } from "@/components/common/ui/use-toast"
import { User, Save, Loader2, AlertTriangle, CheckCircle, Calendar, Clock } from "lucide-react"
import { PhoneInput } from "@/components/common/phone-input"
import { useRouter } from "next/navigation"

interface ProfessionalProfileClientProps {
  professional: {
    _id: string
    userId: {
      _id: string
      name: string
      email: string
      phone: string
      gender: "male" | "female"
      dateOfBirth?: Date
    }
    status: string
    isActive: boolean
    genderPreference?: "no_preference" | "male_only" | "female_only"
    appliedAt?: Date
    lastActiveAt?: Date
    updatedAt?: Date
  }
}

export default function ProfessionalProfileClient({ professional }: ProfessionalProfileClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  
  const [userDetails, setUserDetails] = useState({
    name: professional.userId.name || "",
    email: professional.userId.email || "",
    phone: professional.userId.phone || "",
    gender: professional.userId.gender || "male",
    birthDate: professional.userId.dateOfBirth ? 
      new Date(professional.userId.dateOfBirth).toISOString().split('T')[0] : ""
  })
  
  const [professionalDetails, setProfessionalDetails] = useState({
    genderPreference: professional.genderPreference || "no_preference"
  })
  
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleUserDetailChange = useCallback((field: keyof typeof userDetails, value: string) => {
    setUserDetails(prev => {
      if (prev[field] === value) return prev
      return { ...prev, [field]: value }
    })
    setHasChanges(true)
  }, [])

  const handleProfessionalDetailChange = useCallback((field: keyof typeof professionalDetails, value: any) => {
    setProfessionalDetails(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    
    try {
      // Validate required fields
      if (!userDetails.name.trim() || !userDetails.email.trim()) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "שם ואימייל הם שדות חובה"
        })
        return
      }

      // Call API to update professional profile
      const response = await fetch(`/api/professional/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professionalId: professional._id,
          userDetails,
          professionalDetails
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setHasChanges(false)
        toast({
          title: "נשמר בהצלחה",
          description: "הפרופיל שלך עודכן בהצלחה",
          variant: "default"
        })
        
        // Refresh the page to get updated data
        router.refresh()
      } else {
        throw new Error(result.error || "שגיאה בעדכון הפרופיל")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error instanceof Error ? error.message : "שגיאה בשמירת הפרופיל"
      })
    } finally {
      setSaving(false)
    }
  }, [professional._id, userDetails, professionalDetails, toast, router])

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          מושהה
        </Badge>
      )
    }
    
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            פעיל
          </Badge>
        )
      case 'pending_admin_approval':
        return (
          <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800">
            <Clock className="w-3 h-3" />
            ממתין לאישור
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        )
    }
  }

  const formatDate = (date?: Date) => {
    if (!date) return "לא זמין"
    try {
      return new Date(date).toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return "לא זמין"
    }
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Status Alert */}
      {!professional.isActive && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            הפרופיל שלך אינו פעיל כרגע. פנה למנהל למידע נוסף.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              סטטוס הפרופיל
            </CardTitle>
            {getStatusBadge(professional.status, professional.isActive)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">תאריך הצטרפות:</span>
              <span className="font-medium">{formatDate(professional.appliedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">פעילות אחרונה:</span>
              <span className="font-medium">{formatDate(professional.lastActiveAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>פרטי משתמש</CardTitle>
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    שמור שינויים
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם מלא *</Label>
              <Input
                id="name"
                value={userDetails.name}
                onChange={(e) => handleUserDetailChange("name", e.target.value)}
                placeholder="הכנס שם מלא"
                className="text-right"
                dir={dir}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">כתובת אימייל *</Label>
              <Input
                id="email"
                type="email"
                value={userDetails.email}
                onChange={(e) => handleUserDetailChange("email", e.target.value)}
                placeholder="הכנס כתובת אימייל"
                className="text-right"
                dir={dir}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <PhoneInput
                id="phone"
                fullNumberValue={userDetails.phone}
                onPhoneChange={(value) => handleUserDetailChange("phone", value)}
                placeholder="הכנס מספר טלפון"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">מגדר</Label>
              <Select value={userDetails.gender} onValueChange={(value) => handleUserDetailChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר מגדר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">זכר</SelectItem>
                  <SelectItem value="female">נקבה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">תאריך לידה</Label>
              <Input
                id="birthDate"
                type="date"
                value={userDetails.birthDate}
                onChange={(e) => handleUserDetailChange("birthDate", e.target.value)}
                className="text-right"
                dir={dir}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>העדפות מטפל</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="genderPreference">העדפת מין מטופל</Label>
            <Select 
              value={professionalDetails.genderPreference} 
              onValueChange={(value: "no_preference" | "male_only" | "female_only") => handleProfessionalDetailChange("genderPreference", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_preference">אין העדפה</SelectItem>
                <SelectItem value="male_only">רק גברים</SelectItem>
                <SelectItem value="female_only">רק נשים</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              זה ישפיע על הצגת ההזמנות הפוטנציאליות שלך
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">עדכון פרטי הפרופיל:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>פרטים אישיים:</strong> ודא שהפרטים שלך מעודכנים ונכונים</li>
                <li>• <strong>העדפות:</strong> קבע את העדפות הטיפול שלך</li>
                <li>• <strong>שמירה:</strong> לחץ על "שמור שינויים" לעדכון הפרופיל</li>
                <li>• <strong>אישור:</strong> שינויים יופעלו לאחר בדיקה של המנהל</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 