"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Textarea } from "@/components/common/ui/textarea"
import { Switch } from "@/components/common/ui/switch"
import { useToast } from "@/components/common/ui/use-toast"
import { User, Save, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import type { Professional, ProfessionalTabProps } from "@/lib/types/professional"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"
import { PhoneInput } from "@/components/common/phone-input"

interface ProfessionalProfileTabProps extends ProfessionalTabProps {}

export default function ProfessionalProfileTab({
  professional,
  onUpdate,
  loading,
  isCreatingNew = false,
  onCreated
}: ProfessionalProfileTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [userDetails, setUserDetails] = useState({
    name: typeof professional.userId === 'object' ? professional.userId.name || "" : "",
    email: typeof professional.userId === 'object' ? professional.userId.email || "" : "",
    phone: typeof professional.userId === 'object' ? professional.userId.phone || "" : "",
    gender: typeof professional.userId === 'object' ? (professional.userId.gender as "male" | "female") || "male" : "male",
    birthDate: typeof professional.userId === 'object' && professional.userId.dateOfBirth ? 
      (() => {
        try {
          return new Date(professional.userId.dateOfBirth).toISOString().split('T')[0]
        } catch {
          return ""
        }
      })() : ""
  })
  
  const [professionalDetails, setProfessionalDetails] = useState({
    status: professional.status,
    isActive: professional.isActive,
    adminNotes: professional.adminNotes || "",
    rejectionReason: professional.rejectionReason || ""
  })
  
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Sync state with props when professional changes
  useEffect(() => {
    setUserDetails({
      name: typeof professional.userId === 'object' ? professional.userId.name || "" : "",
      email: typeof professional.userId === 'object' ? professional.userId.email || "" : "",
      phone: typeof professional.userId === 'object' ? professional.userId.phone || "" : "",
      gender: typeof professional.userId === 'object' ? (professional.userId.gender as "male" | "female") || "male" : "male",
      birthDate: typeof professional.userId === 'object' && professional.userId.dateOfBirth ? 
        (() => {
          try {
            return new Date(professional.userId.dateOfBirth).toISOString().split('T')[0]
          } catch {
            return ""
          }
        })() : ""
    })
    
    setProfessionalDetails({
      status: professional.status,
      isActive: professional.isActive,
      adminNotes: professional.adminNotes || "",
      rejectionReason: professional.rejectionReason || ""
    })
    
    // Reset changes flag when syncing with new data
    setHasChanges(false)
  }, [professional._id]) // Only sync when professional ID changes

  const handleUserDetailChange = (field: keyof typeof userDetails, value: string) => {
    setUserDetails(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleProfessionalDetailChange = (field: keyof typeof professionalDetails, value: any) => {
    setProfessionalDetails(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
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

      // Import and call the update function
      const { updateProfessionalBasicInfo } = await import("@/app/dashboard/(user)/(roles)/admin/professional-management/actions")
      
      const result = await updateProfessionalBasicInfo(
        professional._id,
        userDetails,
        professionalDetails
      )

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון פרופיל המטפל"
        })
        return
      }

      // Update local state with the new data
      if (result.professional) {
        // Transform the result to match our Professional type
        const transformedProfessional: Partial<Professional> = {
          _id: result.professional._id?.toString() || professional._id,
          status: result.professional.status,
          isActive: result.professional.isActive,
          adminNotes: result.professional.adminNotes,
          rejectionReason: result.professional.rejectionReason,
          updatedAt: result.professional.updatedAt ? new Date(result.professional.updatedAt) : (professional.updatedAt || new Date('2024-01-01T00:00:00.000Z'))
        }
        
        // Update userId if it exists in the result
        if (result.professional.userId && typeof result.professional.userId === 'object') {
          transformedProfessional.userId = {
            _id: result.professional.userId._id?.toString() || (typeof professional.userId === 'object' ? professional.userId._id : ''),
            name: result.professional.userId.name || (typeof professional.userId === 'object' ? professional.userId.name : ''),
            email: result.professional.userId.email || (typeof professional.userId === 'object' ? professional.userId.email : ''),
            phone: result.professional.userId.phone || (typeof professional.userId === 'object' ? professional.userId.phone : ''),
            gender: (result.professional.userId.gender as "male" | "female") || (typeof professional.userId === 'object' ? professional.userId.gender : 'male'),
            dateOfBirth: result.professional.userId.dateOfBirth ? new Date(result.professional.userId.dateOfBirth) : (typeof professional.userId === 'object' ? professional.userId.dateOfBirth : undefined),
            createdAt: typeof professional.userId === 'object' ? professional.userId.createdAt : new Date('2024-01-01T00:00:00.000Z'),
            updatedAt: result.professional.userId.updatedAt ? new Date(result.professional.userId.updatedAt) : (typeof professional.userId === 'object' ? professional.userId.updatedAt : new Date('2024-01-01T00:00:00.000Z')),
            roles: typeof professional.userId === 'object' ? professional.userId.roles : ['member'],
            activeRole: typeof professional.userId === 'object' ? professional.userId.activeRole : 'member',
            isActive: typeof professional.userId === 'object' ? professional.userId.isActive : true,
            treatmentPreferences: typeof professional.userId === 'object' ? professional.userId.treatmentPreferences : undefined,
            notificationPreferences: typeof professional.userId === 'object' ? professional.userId.notificationPreferences : undefined
          } as IUser
        }
        
        onUpdate(transformedProfessional)
      }
      setHasChanges(false)
      
      toast({
        title: "הצלחה",
        description: "פרופיל המטפל עודכן בהצלחה"
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בשמירת פרופיל המטפל"
      })
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: ProfessionalStatus) => {
    switch (status) {
      case "active": return "text-green-600"
      case "pending_admin_approval": return "text-orange-600"
      case "pending_user_action": return "text-blue-600"
      case "rejected": return "text-red-600"
      case "suspended": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  const getStatusText = (status: ProfessionalStatus) => {
    switch (status) {
      case "active": return "פעיל"
      case "pending_admin_approval": return "ממתין לאישור אדמין"
      case "pending_user_action": return "ממתין לפעולת משתמש"
      case "rejected": return "נדחה"
      case "suspended": return "מושהה"
      default: return "לא ידוע"
    }
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return "-"
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString("he-IL")
    } catch {
      return "-"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            פרופיל המטפל
          </h3>
          <p className="text-sm text-muted-foreground">
            עריכת פרטי המשתמש וסטטוס המטפל
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
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

      {/* User Details */}
      <Card>
        <CardHeader>
          <CardTitle>פרטי משתמש</CardTitle>
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

      {/* Professional Status */}
      <Card>
        <CardHeader>
          <CardTitle>סטטוס מטפל</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">סטטוס</Label>
              <Select 
                value={professionalDetails.status} 
                onValueChange={(value: ProfessionalStatus) => handleProfessionalDetailChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="pending_admin_approval">ממתין לאישור אדמין</SelectItem>
                  <SelectItem value="pending_user_action">ממתין לפעולת משתמש</SelectItem>
                  <SelectItem value="rejected">נדחה</SelectItem>
                  <SelectItem value="suspended">מושהה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isActive" className="flex items-center gap-2">
                פעיל במערכת
              </Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={professionalDetails.isActive}
                  onCheckedChange={(checked) => handleProfessionalDetailChange("isActive", checked)}
                />
                <span className={professionalDetails.isActive ? "text-green-600" : "text-red-600"}>
                  {professionalDetails.isActive ? "פעיל" : "לא פעיל"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminNotes">הערות אדמין</Label>
            <Textarea
              id="adminNotes"
              value={professionalDetails.adminNotes}
              onChange={(e) => handleProfessionalDetailChange("adminNotes", e.target.value)}
              placeholder="הכנס הערות אדמין..."
              className="text-right min-h-[80px]"
              dir={dir}
            />
          </div>

          {professionalDetails.status === "rejected" && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">סיבת דחייה</Label>
              <Textarea
                id="rejectionReason"
                value={professionalDetails.rejectionReason}
                onChange={(e) => handleProfessionalDetailChange("rejectionReason", e.target.value)}
                placeholder="הכנס סיבת דחייה..."
                className="text-right min-h-[80px]"
                dir={dir}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Info Summary */}
      <Card>
        <CardHeader>
          <CardTitle>מידע כללי</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div>
                <span className="font-medium">תאריך הצטרפות:</span>
                <div className="text-muted-foreground">{formatDate(professional.appliedAt)}</div>
              </div>
              {professional.approvedAt && (
                <div>
                  <span className="font-medium">תאריך אישור:</span>
                  <div className="text-muted-foreground">{formatDate(professional.approvedAt)}</div>
                </div>
              )}
              {professional.rejectedAt && (
                <div>
                  <span className="font-medium">תאריך דחייה:</span>
                  <div className="text-muted-foreground">{formatDate(professional.rejectedAt)}</div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-medium">סטטוס נוכחי:</span>
                <div className={getStatusColor(professionalDetails.status)}>
                  {getStatusText(professionalDetails.status)}
                </div>
              </div>
              <div>
                <span className="font-medium">פעילות אחרונה:</span>
                <div className="text-muted-foreground">{formatDate(professional.lastActiveAt)}</div>
              </div>
              <div>
                <span className="font-medium">עודכן לאחרונה:</span>
                <div className="text-muted-foreground">{formatDate(professional.updatedAt)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 