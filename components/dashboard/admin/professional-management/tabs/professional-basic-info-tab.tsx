"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Label } from "@/components/common/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/ui/dialog"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Edit,
  Save,
  X
} from "lucide-react"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"

interface Professional {
  _id: string
  userId: {
    _id: string
    name: string
    email: string
    phone: string
    gender: string
    birthDate?: string
  }
  status: ProfessionalStatus
  specialization?: string
  experience?: string
  certifications?: string[]
  bio?: string
  adminNotes?: string
  rejectionReason?: string
  appliedAt: string
  approvedAt?: string
  rejectedAt?: string
  lastActiveAt?: string
}

interface ProfessionalBasicInfoTabProps {
  professional: Professional
  onUpdate: (professional: Professional) => void
  onStatusChange: (status: ProfessionalStatus, adminNote?: string, rejectionReason?: string) => Promise<void>
  loading: boolean
}

export default function ProfessionalBasicInfoTab({
  professional,
  onUpdate,
  onStatusChange,
  loading
}: ProfessionalBasicInfoTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<ProfessionalStatus>(professional.status)
  const [adminNote, setAdminNote] = useState(professional.adminNotes || "")
  const [rejectionReason, setRejectionReason] = useState(professional.rejectionReason || "")

  const getStatusConfig = (status: ProfessionalStatus) => {
    const configs = {
      active: { 
        icon: UserCheck, 
        text: "פעיל", 
        color: "text-green-600",
        bgColor: "bg-green-50",
        description: "המטפל פעיל ויכול לקבל הזמנות"
      },
      pending_admin_approval: { 
        icon: Clock, 
        text: "ממתין לאישור מנהל", 
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        description: "המטפל ממתין לאישור מנהל המערכת"
      },
      pending_user_action: { 
        icon: Clock, 
        text: "ממתין לפעולת משתמש", 
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        description: "המטפל צריך לבצע פעולה נוספת"
      },
      rejected: { 
        icon: UserX, 
        text: "נדחה", 
        color: "text-red-600",
        bgColor: "bg-red-50",
        description: "בקשת המטפל נדחתה"
      },
      suspended: { 
        icon: AlertTriangle, 
        text: "מושהה", 
        color: "text-red-600",
        bgColor: "bg-red-50",
        description: "המטפל מושהה זמנית"
      }
    }
    return configs[status]
  }

  const handleStatusUpdate = async () => {
    if (newStatus === professional.status && adminNote === professional.adminNotes) {
      setShowStatusDialog(false)
      return
    }

    try {
      await onStatusChange(newStatus, adminNote, rejectionReason)
      setShowStatusDialog(false)
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const currentStatusConfig = getStatusConfig(professional.status)
  const StatusIcon = currentStatusConfig.icon

  return (
    <div className="space-y-6" dir={dir}>
      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            פרטי המשתמש
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">שם מלא</Label>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{professional.userId.name}</span>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">מגדר</Label>
              <div className="mt-1">
                <Badge variant="outline">
                  {professional.userId.gender === 'male' ? 'זכר' : 'נקבה'}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">אימייל</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{professional.userId.email}</span>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">טלפון</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{professional.userId.phone}</span>
              </div>
            </div>
            
            {professional.userId.birthDate && (
              <div>
                <Label className="text-sm font-medium">תאריך לידה</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(professional.userId.birthDate)}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Professional Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${currentStatusConfig.color}`} />
              סטטוס מטפל
            </div>
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  עדכן סטטוס
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>עדכון סטטוס מטפל</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>סטטוס חדש</Label>
                    <Select value={newStatus} onValueChange={(value) => setNewStatus(value as ProfessionalStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">פעיל</SelectItem>
                        <SelectItem value="pending_admin_approval">ממתין לאישור מנהל</SelectItem>
                        <SelectItem value="pending_user_action">ממתין לפעולת משתמש</SelectItem>
                        <SelectItem value="rejected">נדחה</SelectItem>
                        <SelectItem value="suspended">מושהה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newStatus === 'rejected' && (
                    <div>
                      <Label>סיבת דחייה</Label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="הזן סיבת דחייה..."
                        rows={3}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>הערת מנהל</Label>
                    <Textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="הערות נוספות..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                      <X className="w-4 h-4 mr-2" />
                      ביטול
                    </Button>
                    <Button onClick={handleStatusUpdate} disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? "שומר..." : "שמור"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg ${currentStatusConfig.bgColor}`}>
            <div className="flex items-center gap-3 mb-2">
              <StatusIcon className={`w-5 h-5 ${currentStatusConfig.color}`} />
              <span className={`font-medium ${currentStatusConfig.color}`}>
                {currentStatusConfig.text}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentStatusConfig.description}
            </p>
          </div>
          
          {professional.rejectionReason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Label className="text-sm font-medium text-red-800">סיבת דחייה:</Label>
              <p className="text-sm text-red-700 mt-1">{professional.rejectionReason}</p>
            </div>
          )}
          
          {professional.adminNotes && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Label className="text-sm font-medium text-blue-800">הערות מנהל:</Label>
              <p className="text-sm text-blue-700 mt-1">{professional.adminNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle>פרטים מקצועיים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">התמחות</Label>
            <div className="mt-1">
              {professional.specialization ? (
                <Badge variant="secondary">{professional.specialization}</Badge>
              ) : (
                <span className="text-muted-foreground">לא צוין</span>
              )}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">ניסיון</Label>
            <div className="mt-1">
              {professional.experience ? (
                <p className="text-sm">{professional.experience}</p>
              ) : (
                <span className="text-muted-foreground">לא צוין</span>
              )}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">הסמכות</Label>
            <div className="mt-1">
              {professional.certifications && professional.certifications.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {professional.certifications.map((cert, index) => (
                    <Badge key={index} variant="outline">{cert}</Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">לא צוינו</span>
              )}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">תיאור</Label>
            <div className="mt-1">
              {professional.bio ? (
                <p className="text-sm">{professional.bio}</p>
              ) : (
                <span className="text-muted-foreground">לא צוין</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>ציר זמן</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <span className="text-sm font-medium">הצטרף למערכת</span>
                <div className="text-xs text-muted-foreground">
                  {formatDate(professional.appliedAt)}
                </div>
              </div>
            </div>
            
            {professional.approvedAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium">אושר כמטפל</span>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(professional.approvedAt)}
                  </div>
                </div>
              </div>
            )}
            
            {professional.rejectedAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium">נדחה</span>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(professional.rejectedAt)}
                  </div>
                </div>
              </div>
            )}
            
            {professional.lastActiveAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium">פעיל לאחרונה</span>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(professional.lastActiveAt)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 