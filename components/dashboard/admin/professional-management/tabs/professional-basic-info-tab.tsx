"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
// import { useTranslation } from "@/hooks/use-translation"
import { User, Mail, Phone, Edit, Save, X, Clock, UserCheck, UserX, AlertTriangle } from "lucide-react"

type ProfessionalStatus = 
  | "active" 
  | "pending_admin_approval" 
  | "pending_user_action" 
  | "rejected" 
  | "suspended"

interface Professional {
  _id: string
  userId: {
    _id: string
    name: string
    email: string
    phone: string
    gender: "male" | "female"
    birthDate?: string
  }
  status: ProfessionalStatus
  profileImage?: string
  appliedAt: string
  approvedAt?: string
  rejectedAt?: string
  adminNotes?: string
  rejectionReason?: string
}

interface ProfessionalBasicInfoTabProps {
  professional: Professional
  onUpdate: (professional: Professional) => void
  loading?: boolean
  isCreatingNew?: boolean
}

export default function ProfessionalBasicInfoTab({
  professional,
  onUpdate,
  loading,
  isCreatingNew = false
}: ProfessionalBasicInfoTabProps) {
  const dir = "rtl" // Hebrew direction
  const { toast } = useToast()
  
  // Dialog states
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showUserEditDialog, setShowUserEditDialog] = useState(false)
  
  // Form states
  const [newStatus, setNewStatus] = useState<ProfessionalStatus>(professional.status)
  const [adminNote, setAdminNote] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  // Form state for creating new professional
  const [createFormData, setCreateFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "male" as "male" | "female",
    birthDate: ""
  })


  // Form state for editing user info
  const [userEditFormData, setUserEditFormData] = useState({
    name: professional.userId?.name || "",
    phone: professional.userId?.phone || "",
    gender: professional.userId?.gender || "male" as "male" | "female",
    birthDate: professional.userId?.birthDate || ""
  })

  const handleCreateProfessional = async () => {
    if (!createFormData.name || !createFormData.email || !createFormData.phone) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נא למלא את כל השדות הנדרשים"
      })
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("name", createFormData.name)
      formDataToSend.append("email", createFormData.email)
      formDataToSend.append("phone", createFormData.phone)
      formDataToSend.append("gender", createFormData.gender)
      if (createFormData.birthDate) {
        formDataToSend.append("birthDate", createFormData.birthDate)
      }

      const { createProfessional } = await import("@/actions/professional-actions")
      const result = await createProfessional(formDataToSend)
      
      if (result.success && result.professional) {
        toast({
          title: "הצלחה",
          description: "המטפל נוצר בהצלחה"
        })
        onUpdate(result.professional as unknown as Professional)
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
    }
  }


  const handleUpdateUserInfo = async () => {
    try {
      const { updateProfessionalUserInfo } = await import("@/actions/professional-actions")
      const result = await updateProfessionalUserInfo(professional.userId._id, userEditFormData)
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "פרטי המשתמש עודכנו בהצלחה"
        })
        // Update professional data locally
        const updatedProfessional = {
          ...professional,
          userId: {
            ...professional.userId,
            ...userEditFormData
          }
        }
        onUpdate(updatedProfessional)
        setShowUserEditDialog(false)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון פרטי המשתמש"
        })
      }
    } catch (error) {
      console.error("Error updating user info:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון פרטי המשתמש"
      })
    }
  }

  const handleStatusUpdate = async () => {
    try {
      const { updateProfessionalStatus } = await import("@/actions/professional-actions")
      const result = await updateProfessionalStatus(
        professional._id,
        newStatus,
        adminNote,
        newStatus === "rejected" ? rejectionReason : undefined
      )
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "סטטוס המטפל עודכן בהצלחה"
        })
        // Update professional status locally
        const updatedProfessional = {
          ...professional,
          status: newStatus,
          adminNotes: adminNote,
          rejectionReason: newStatus === "rejected" ? rejectionReason : professional.rejectionReason
        }
        onUpdate(updatedProfessional)
        setShowStatusDialog(false)
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
    }
  }

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
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        description: "המטפל ממתין לאישור מנהל"
      },
      pending_user_action: {
        icon: Clock,
        text: "ממתין לפעולת משתמש",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        description: "המטפל צריך להשלים פרטים"
      },
      rejected: {
        icon: UserX,
        text: "נדחה",
        color: "text-red-600",
        bgColor: "bg-red-50",
        description: "הבקשה נדחתה"
      },
      suspended: {
        icon: AlertTriangle,
        text: "מושהה",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        description: "המטפל מושהה זמנית"
      }
    }
    return configs[status]
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

  if (isCreatingNew) {
    return (
      <div className="space-y-6" dir={dir}>
        {/* Create Professional Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              יצירת מטפל חדש
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">שם מלא *</Label>
                <Input
                  id="name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="הכנס שם מלא"
                />
              </div>
              
              <div>
                <Label htmlFor="email">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="הכנס כתובת אימייל"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">טלפון *</Label>
                <Input
                  id="phone"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="הכנס מספר טלפון"
                />
              </div>
              
              
              <div>
                <Label htmlFor="gender">מגדר *</Label>
                <Select value={createFormData.gender} onValueChange={(value: "male" | "female") => setCreateFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">זכר</SelectItem>
                    <SelectItem value="female">נקבה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="birthDate">תאריך לידה</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={createFormData.birthDate}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                />
              </div>

            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={handleCreateProfessional}
                disabled={loading || !createFormData.name || !createFormData.email || !createFormData.phone}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                צור מטפל
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              פרטי המשתמש
            </div>
            
            <Dialog open={showUserEditDialog} onOpenChange={setShowUserEditDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  ערוך פרטים
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>עריכת פרטי משתמש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>שם מלא</Label>
                    <Input
                      value={userEditFormData.name}
                      onChange={(e) => setUserEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="הכנס שם מלא"
                    />
                  </div>
                  
                  <div>
                    <Label>טלפון</Label>
                    <Input
                      value={userEditFormData.phone}
                      onChange={(e) => setUserEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="הכנס מספר טלפון"
                    />
                  </div>
                  
                  <div>
                    <Label>מגדר</Label>
                    <Select value={userEditFormData.gender} onValueChange={(value: "male" | "female") => setUserEditFormData(prev => ({ ...prev, gender: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">זכר</SelectItem>
                        <SelectItem value="female">נקבה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>תאריך לידה</Label>
                    <Input
                      type="date"
                      value={userEditFormData.birthDate}
                      onChange={(e) => setUserEditFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowUserEditDialog(false)}>
                      <X className="w-4 h-4 mr-2" />
                      ביטול
                    </Button>
                    <Button onClick={handleUpdateUserInfo} disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? "שומר..." : "שמור"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
            
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">תאריך לידה</Label>
              <div className="mt-1 text-sm">
                {formatDate(professional.userId.birthDate)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              סטטוס המטפל
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

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>תאריכים חשובים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="font-medium">תאריך הגשת בקשה</Label>
              <div className="mt-1">{formatDate(professional.appliedAt)}</div>
            </div>
            
            {professional.approvedAt && (
              <div>
                <Label className="font-medium">תאריך אישור</Label>
                <div className="mt-1">{formatDate(professional.approvedAt)}</div>
              </div>
            )}
            
            {professional.rejectedAt && (
              <div>
                <Label className="font-medium">תאריך דחייה</Label>
                <div className="mt-1">{formatDate(professional.rejectedAt)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 