"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { useTranslation } from "@/lib/translations/i18n"
import { updateProfessionalStatus } from "@/actions/professional-actions"
import { ProfessionalData } from "./professionals-management"
import { toast } from "sonner"

interface ProfessionalEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professional: ProfessionalData
  onClose: () => void
}

const statusOptions = [
  { value: "active", label: "פעיל", description: "המטפל פעיל ויכול לקבל הזמנות" },
  { value: "pending_admin_approval", label: "ממתין לאישור מנהל", description: "המטפל ממתין לאישור מנהל" },
  { value: "pending_user_action", label: "ממתין למשתמש", description: "המטפל צריך לבצע פעולה" },
  { value: "rejected", label: "נדחה", description: "הבקשה נדחתה" },
  { value: "suspended", label: "מושהה", description: "המטפל מושהה זמנית" },
]

const getStatusBadge = (status: string) => {
  const statusConfig = {
    active: { label: "פעיל", variant: "default" as const },
    pending_admin_approval: { label: "ממתין לאישור", variant: "secondary" as const },
    pending_user_action: { label: "ממתין למשתמש", variant: "outline" as const },
    rejected: { label: "נדחה", variant: "destructive" as const },
    suspended: { label: "מושהה", variant: "destructive" as const },
  }
  
  const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function ProfessionalEditModal({ 
  open, 
  onOpenChange, 
  professional, 
  onClose 
}: ProfessionalEditModalProps) {
  const { t, dir } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(professional.professionalProfile?.status || "")

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true)
    try {
      const result = await updateProfessionalStatus(professional.id, newStatus)
      if (result.success) {
        setCurrentStatus(newStatus)
        toast.success("סטטוס המטפל עודכן בהצלחה")
      } else {
        toast.error("שגיאה בעדכון סטטוס המטפל")
      }
    } catch (error) {
      toast.error("שגיאה בעדכון סטטוס המטפל")
    }
    setLoading(false)
  }

  const profile = professional.professionalProfile

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>פרופיל מטפל: {professional.name}</span>
            {profile && getStatusBadge(currentStatus)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
            <TabsTrigger value="treatments">טיפולים</TabsTrigger>
            <TabsTrigger value="areas">איזורי פעילות</TabsTrigger>
            <TabsTrigger value="bookings">הזמנות</TabsTrigger>
            <TabsTrigger value="financial">דוח כספי</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>פרטי המשתמש</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">שם מלא</label>
                    <p className="text-sm text-muted-foreground">{professional.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">אימייל</label>
                    <p className="text-sm text-muted-foreground">{professional.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">טלפון</label>
                    <p className="text-sm text-muted-foreground">{professional.phone || "לא צוין"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">מגדר</label>
                    <p className="text-sm text-muted-foreground">
                      {professional.gender === "male" ? "זכר" : 
                       professional.gender === "female" ? "נקבה" : 
                       professional.gender === "other" ? "אחר" : "לא צוין"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">תאריך הצטרפות</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(professional.createdAt).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>פרטי מטפל</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile ? (
                    <>
                      <div>
                        <label className="text-sm font-medium">מספר מטפל</label>
                        <p className="text-sm text-muted-foreground">{profile.professionalNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">סטטוס נוכחי</label>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(currentStatus)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">עדכון סטטוס</label>
                        <Select value={currentStatus} onValueChange={handleStatusUpdate} disabled={loading}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">{option.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">סה"כ רווחים</label>
                        <p className="text-sm text-muted-foreground">
                          ₪{profile.totalEarnings.toLocaleString()}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">אין פרופיל מטפל</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="treatments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>טיפולים שהמטפל מבצע</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.treatments && profile.treatments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>שם הטיפול</TableHead>
                        <TableHead>קטגוריה</TableHead>
                        <TableHead>מחיר למטפל</TableHead>
                        <TableHead>סטטוס</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.treatments.map((treatment) => (
                        <TableRow key={treatment.id}>
                          <TableCell className="font-medium">{treatment.treatmentName}</TableCell>
                          <TableCell>
                            {treatment.treatmentCategory === "massages" ? "עיסויים" : "טיפולי פנים"}
                          </TableCell>
                          <TableCell>₪{treatment.professionalPrice.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={treatment.isActive ? "default" : "secondary"}>
                              {treatment.isActive ? "פעיל" : "לא פעיל"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    אין טיפולים מוגדרים למטפל זה
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="areas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>איזורי פעילות</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.workAreas && profile.workAreas.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>עיר מוצא</TableHead>
                        <TableHead>טווח מקסימלי</TableHead>
                        <TableHead>ערים מכוסות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.workAreas.map((area) => (
                        <TableRow key={area.id}>
                          <TableCell className="font-medium">{area.cityName}</TableCell>
                          <TableCell>
                            {area.maxDistanceKm === 0 ? "ללא הגבלה" : `${area.maxDistanceKm} ק"מ`}
                          </TableCell>
                          <TableCell>
                            {area.coveredCities.length} ערים
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    אין איזורי פעילות מוגדרים למטפל זה
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>הזמנות שהמטפל משויך אליהן</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center py-8 text-muted-foreground">
                  רשימת ההזמנות תוצג כאן (בפיתוח)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>דוח כספי</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">₪{profile?.totalEarnings.toLocaleString() || "0"}</div>
                    <div className="text-sm text-muted-foreground">סה"כ רווחים</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">הזמנות השבוע</div>
                  </div>
                </div>
                <p className="text-center py-8 text-muted-foreground">
                  דוח מפורט יוצג כאן (בפיתוח)
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 