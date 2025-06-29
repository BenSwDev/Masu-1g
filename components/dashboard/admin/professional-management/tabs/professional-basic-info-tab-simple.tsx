"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import { Textarea } from "@/components/common/ui/textarea"
import { Label } from "@/components/common/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { useToast } from "@/components/common/ui/use-toast"
import { User, Save, Loader2, CheckCircle, AlertTriangle, Mail, Phone, Calendar, UserCheck, Clock, UserX, Pencil, X, MapPin, Briefcase, Shield, Eye, EyeOff } from "lucide-react"
import { updateProfessionalStatus } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { Professional, ProfessionalTabProps } from "@/lib/types/professional"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"

interface ProfessionalBasicInfoTabProps extends ProfessionalTabProps {
  onLoadingChange?: (loading: boolean) => void
}

export default function ProfessionalBasicInfoTab({
  professional,
  onUpdate,
  loading,
  isCreatingNew = false,
  onCreated,
  onLoadingChange
}: ProfessionalBasicInfoTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  // Form state for creating new professional
  const [formData, setFormData] = useState({
    name: (typeof professional?.userId === 'object' && professional?.userId?.name) || "",
    email: (typeof professional?.userId === 'object' && professional?.userId?.email) || "",
    phone: (typeof professional?.userId === 'object' && professional?.userId?.phone) || "",
    gender: (typeof professional?.userId === 'object' && professional?.userId?.gender) || "male",
    birthDate: (typeof professional?.userId === 'object' && professional?.userId?.dateOfBirth) ? 
      new Date(professional.userId.dateOfBirth).toISOString().split('T')[0] : "",
  })

  // State for status management
  const [statusLoading, setStatusLoading] = useState(false)
  const [adminNotes, setAdminNotes] = useState(professional?.adminNotes || "")
  const [rejectionReason, setRejectionReason] = useState(professional?.rejectionReason || "")
  const [selectedStatus, setSelectedStatus] = useState<ProfessionalStatus>(professional?.status || "pending_admin_approval")

  // State for creation process
  const [creationLoading, setCreationLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim() || formData.name.length < 2) {
      errors.name = "שם חייב להכיל לפחות 2 תווים"
    }
    
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "כתובת אימייל לא תקינה"
    }
    
    if (!formData.phone.trim() || formData.phone.length < 10) {
      errors.phone = "מספר טלפון חייב להכיל לפחות 10 ספרות"
    }
    
    return errors
  }

  const handleCreateProfessional = async () => {
    const errors = validateForm()
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      toast({
        variant: "destructive",
        title: "שגיאות בטופס",
        description: "נא לתקן את השגיאות ולנסות שוב"
      })
      return
    }

    setCreationLoading(true)
    onLoadingChange?.(true)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("name", formData.name.trim())
      formDataToSend.append("email", formData.email.trim())
      formDataToSend.append("phone", formData.phone.trim())
      formDataToSend.append("gender", formData.gender)
      if (formData.birthDate) {
        formDataToSend.append("birthDate", formData.birthDate)
      }

      const { createProfessional } = await import("@/app/dashboard/(user)/(roles)/admin/professional-management/actions")
      const result = await createProfessional(formDataToSend)
      
      if (result.success && result.professional) {
        toast({
          title: "הצלחה",
          description: "המטפל נוצר בהצלחה"
        })
        
        // Transform to our Professional interface
        const transformedProfessional: Professional = {
          _id: result.professional._id.toString(),
          userId: result.professional.userId,
          status: result.professional.status,
          isActive: result.professional.isActive,
          specialization: result.professional.specialization,
          experience: result.professional.experience,
          certifications: result.professional.certifications,
          bio: result.professional.bio,
          profileImage: result.professional.profileImage,
          treatments: (result.professional.treatments || []).map(t => ({
            treatmentId: t.treatmentId?.toString() || '',
            durationId: t.durationId?.toString(),
            professionalPrice: t.professionalPrice || 0,
            treatmentName: (t as any).treatmentName
          })),
          workAreas: (result.professional.workAreas || []).map(w => ({
            cityId: w.cityId?.toString() || '',
            cityName: w.cityName || '',
            distanceRadius: w.distanceRadius,
            coveredCities: w.coveredCities || []
          })),
          totalEarnings: result.professional.totalEarnings || 0,
          pendingPayments: result.professional.pendingPayments || 0,
          adminNotes: result.professional.adminNotes,
          rejectionReason: result.professional.rejectionReason,
          appliedAt: result.professional.appliedAt,
          approvedAt: result.professional.approvedAt,
          rejectedAt: result.professional.rejectedAt,
          lastActiveAt: result.professional.lastActiveAt,
          createdAt: result.professional.createdAt,
          updatedAt: result.professional.updatedAt
        }
        
        onUpdate(transformedProfessional)
        if (onCreated) {
          onCreated(transformedProfessional)
        }
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה ביצירת המטפל"
        })
      }
    } catch (error) {
      console.error("Error creating professional:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה ביצירת המטפל"
      })
    } finally {
      setCreationLoading(false)
      onLoadingChange?.(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (selectedStatus === professional.status && !adminNotes && !rejectionReason) {
      toast({
        variant: "destructive",
        title: "אין שינויים",
        description: "לא בוצעו שינויים בסטטוס"
      })
      return
    }

    setStatusLoading(true)
    
    try {
      const result = await updateProfessionalStatus(
        professional._id,
        selectedStatus,
        adminNotes,
        rejectionReason
      )
      
      if (result.success && result.professional) {
        toast({
          title: "הצלחה",
          description: "סטטוס המטפל עודכן בהצלחה"
        })
        
        onUpdate({
          status: result.professional.status,
          adminNotes: result.professional.adminNotes,
          rejectionReason: result.professional.rejectionReason,
          approvedAt: result.professional.approvedAt,
          rejectedAt: result.professional.rejectedAt
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון הסטטוס"
        })
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון הסטטוס"
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const getStatusInfo = (status: ProfessionalStatus) => {
    const statusConfig = {
      active: { 
        variant: "default" as const, 
        icon: UserCheck, 
        text: "פעיל", 
        description: "המטפל פעיל במערכת ויכול לקבל הזמנות",
        color: "text-green-600"
      },
      pending_admin_approval: { 
        variant: "secondary" as const, 
        icon: Clock, 
        text: "ממתין לאישור מנהל", 
        description: "המטפל ממתין לאישור מנהל המערכת",
        color: "text-orange-600"
      },
      pending_user_action: { 
        variant: "outline" as const, 
        icon: Clock, 
        text: "ממתין לפעולת משתמש", 
        description: "נדרשת פעולה מצד המטפל",
        color: "text-blue-600"
      },
      rejected: { 
        variant: "destructive" as const, 
        icon: UserX, 
        text: "נדחה", 
        description: "הבקשה נדחתה על ידי מנהל המערכת",
        color: "text-red-600"
      },
      suspended: { 
        variant: "destructive" as const, 
        icon: AlertTriangle, 
        text: "מושהה", 
        description: "המטפל מושהה זמנית מהמערכת",
        color: "text-red-600"
      }
    }
    return statusConfig[status]
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return "-"
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString("he-IL", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return "-"
    }
  }

  if (isCreatingNew) {
    return (
      <div className="space-y-6 p-6" dir={dir}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              יצירת מטפל חדש
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                פרטים בסיסיים ליצירת חשבון משתמש. המערכת תיצור אוטומטית משתמש עם תפקיד מטפל וסיסמה זמנית: 123456
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  שם מלא *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                    if (validationErrors.name) {
                      setValidationErrors(prev => ({ ...prev, name: "" }))
                    }
                  }}
                  placeholder="הכנס שם מלא"
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-500">{validationErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  אימייל (אופציונלי)
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }))
                      if (validationErrors.email) {
                        setValidationErrors(prev => ({ ...prev, email: "" }))
                      }
                    }}
                    placeholder="example@domain.com (אופציונלי)"
                    className={`pr-10 ${validationErrors.email ? "border-red-500" : ""}`}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-red-500">{validationErrors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  טלפון *
                </Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, phone: e.target.value }))
                      if (validationErrors.phone) {
                        setValidationErrors(prev => ({ ...prev, phone: "" }))
                      }
                    }}
                    placeholder="050-1234567"
                    className={`pr-10 ${validationErrors.phone ? "border-red-500" : ""}`}
                  />
                </div>
                {validationErrors.phone && (
                  <p className="text-sm text-red-500">{validationErrors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium">
                  מגדר *
                </Label>
                <Select value={formData.gender} onValueChange={(value: "male" | "female" | "other") => setFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">זכר</SelectItem>
                    <SelectItem value="female">נקבה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="birthDate" className="text-sm font-medium">
                  תאריך לידה
                </Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="pr-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={handleCreateProfessional}
                disabled={creationLoading || loading || !formData.name || !formData.phone}
                className="flex items-center gap-2 min-w-[120px]"
              >
                {(creationLoading || loading) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {(creationLoading || loading) ? "יוצר..." : "צור מטפל"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Edit existing professional
  const statusInfo = getStatusInfo(professional.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-6 p-6" dir={dir}>
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              סטטוס נוכחי
            </div>
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusInfo.text}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{statusInfo.description}</p>
          
          {professional.approvedAt && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              אושר ב-{formatDate(professional.approvedAt)}
            </div>
          )}
          
          {professional.rejectedAt && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <UserX className="w-4 h-4" />
              נדחה ב-{formatDate(professional.rejectedAt)}
            </div>
          )}
          
          {professional.rejectionReason && (
            <Alert className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>סיבת דחייה:</strong> {professional.rejectionReason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Professional Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            פרטי המטפל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">שם מלא</Label>
              <p className="text-sm font-medium">{typeof professional.userId === 'object' ? professional.userId.name : 'לא זמין'}</p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">מגדר</Label>
              <p className="text-sm">{typeof professional.userId === 'object' && professional.userId.gender === 'male' ? 'זכר' : 'נקבה'}</p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">אימייל</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm">{typeof professional.userId === 'object' ? professional.userId.email : 'לא זמין'}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">טלפון</Label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm">{formatPhoneForDisplay(typeof professional.userId === 'object' ? professional.userId.phone || "" : "")}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">תאריך לידה</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm">
                  {typeof professional.userId === 'object' && professional.userId.dateOfBirth 
                    ? formatDate(professional.userId.dateOfBirth)
                    : 'לא צוין'
                  }
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">תאריך הצטרפות</Label>
              <p className="text-sm">{formatDate(professional.appliedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            ניהול סטטוס
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              סטטוס חדש
            </Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ProfessionalStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_admin_approval">ממתין לאישור מנהל</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="pending_user_action">ממתין לפעולת משתמש</SelectItem>
                <SelectItem value="rejected">נדחה</SelectItem>
                <SelectItem value="suspended">מושהה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminNotes" className="text-sm font-medium">
              הערות מנהל
            </Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="הוסף הערות מנהל..."
              rows={3}
            />
          </div>

          {selectedStatus === "rejected" && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason" className="text-sm font-medium">
                סיבת דחייה *
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="הסבר את הסיבה לדחיית הבקשה..."
                rows={3}
                className={selectedStatus === "rejected" && !rejectionReason ? "border-red-500" : ""}
              />
              {selectedStatus === "rejected" && !rejectionReason && (
                <p className="text-sm text-red-500">סיבת דחייה נדרשת</p>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleStatusUpdate}
              disabled={statusLoading || (selectedStatus === "rejected" && !rejectionReason)}
              className="flex items-center gap-2 min-w-[120px]"
            >
              {statusLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {statusLoading ? "מעדכן..." : "עדכן סטטוס"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 