"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { useTranslation } from "@/lib/translations/i18n"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import { getProfessionalById, updateProfessionalStatus } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import { User, UserCheck, Clock, UserX, AlertTriangle, Save, Loader2, Mail, Phone, Calendar } from "lucide-react"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

interface ProfessionalProfileDialogProps {
  professionalId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

interface ProfessionalDetails {
  _id: string
  userId: IUser
  status: ProfessionalStatus
  adminNotes?: string
  rejectionReason?: string
  appliedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  treatments: Array<{
    treatmentId: string
    treatmentName?: string
    professionalPrice: number
  }>
  workAreas: Array<{
    cityId: string
    cityName: string
    distanceRadius: string
  }>
  totalEarnings: number
  pendingPayments: number
}

export function ProfessionalProfileDialog({ 
  professionalId, 
  open, 
  onOpenChange,
  onUpdate 
}: ProfessionalProfileDialogProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [profile, setProfile] = useState<ProfessionalDetails | null>(null)
  const [status, setStatus] = useState<ProfessionalStatus>("pending_admin_approval")
  const [adminNotes, setAdminNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && professionalId) {
      loadProfessionalData()
    } else {
      resetForm()
    }
  }, [open, professionalId])

  const loadProfessionalData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await getProfessionalById(professionalId!)
      
      if (result.success && result.professional) {
        const prof = result.professional as any
        setProfile(prof)
        setStatus(prof.status)
        setAdminNotes(prof.adminNotes || "")
        setRejectionReason(prof.rejectionReason || "")
      } else {
        setError(result.error || "שגיאה בטעינת נתוני המטפל")
      }
    } catch (error) {
      console.error("Error loading professional:", error)
      setError("שגיאה בטעינת נתוני המטפל")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setProfile(null)
    setStatus("pending_admin_approval")
    setAdminNotes("")
    setRejectionReason("")
    setError(null)
  }

  const handleSave = async () => {
    if (!professionalId) return

    if (status === "rejected" && !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נדרשת סיבת דחייה"
      })
      return
    }

    setUpdating(true)
    
    try {
      const result = await updateProfessionalStatus(
        professionalId,
        status,
        adminNotes,
        rejectionReason
      )
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "סטטוס המטפל עודכן בהצלחה"
        })
        
        if (onUpdate) {
          onUpdate()
        }
        
        onOpenChange(false)
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
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: ProfessionalStatus) => {
    const statusConfig = {
      active: { variant: "default" as const, icon: UserCheck, text: "פעיל", color: "text-green-600" },
      pending_admin_approval: { variant: "secondary" as const, icon: Clock, text: "ממתין לאישור", color: "text-orange-600" },
      pending_user_action: { variant: "outline" as const, icon: Clock, text: "ממתין למשתמש", color: "text-blue-600" },
      rejected: { variant: "destructive" as const, icon: UserX, text: "נדחה", color: "text-red-600" },
      suspended: { variant: "destructive" as const, icon: AlertTriangle, text: "מושהה", color: "text-red-600" }
    }

    const config = statusConfig[status] || { variant: "outline" as const, icon: User, text: status, color: "text-gray-600" }
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {loading ? "טוען נתוני מטפל..." : profile ? `פרופיל מטפל - ${profile.userId.name}` : "פרופיל מטפל"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Separator />
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">פרטים אישיים</h3>
                {getStatusBadge(profile.status)}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">שם מלא</Label>
                  <p className="text-sm font-medium">{profile.userId.name}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">מגדר</Label>
                  <p className="text-sm">{profile.userId.gender === 'male' ? 'זכר' : 'נקבה'}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">אימייל</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{profile.userId.email}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">טלפון</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{formatPhoneForDisplay(profile.userId.phone || "")}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">תאריך הצטרפות</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{formatDate(profile.appliedAt)}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">מזהה מטפל</Label>
                  <p className="text-sm font-mono">{profile._id}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Professional Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">סיכום מקצועי</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{profile.treatments.length}</div>
                  <div className="text-sm text-muted-foreground">טיפולים</div>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{profile.workAreas.length}</div>
                  <div className="text-sm text-muted-foreground">איזורי פעילות</div>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">₪{profile.totalEarnings.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">סה"כ הכנסות</div>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">₪{profile.pendingPayments.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">תשלומים ממתינים</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">ניהול סטטוס</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">סטטוס</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as ProfessionalStatus)}>
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
                  <Label htmlFor="adminNotes" className="text-sm font-medium">הערות מנהל</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="הוסף הערות מנהל..."
                    rows={3}
                  />
                </div>

                {status === "rejected" && (
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
                      className={status === "rejected" && !rejectionReason ? "border-red-500" : ""}
                    />
                    {status === "rejected" && !rejectionReason && (
                      <p className="text-sm text-red-500">סיבת דחייה נדרשת</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Existing rejection reason display */}
            {profile.rejectionReason && profile.status === "rejected" && (
              <>
                <Separator />
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>סיבת דחייה קיימת:</strong> {profile.rejectionReason}
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updating}
              >
                ביטול
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={updating || (status === "rejected" && !rejectionReason)}
                className="flex items-center gap-2 min-w-[120px]"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {updating ? "מעדכן..." : "שמור שינויים"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">לא נמצא מטפל</h3>
            <p className="text-muted-foreground text-center">
              המטפל המבוקש לא נמצא או שאין לך הרשאה לצפות בו
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

