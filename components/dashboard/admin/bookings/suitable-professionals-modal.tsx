"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Send,
  MessageSquare,
  Eye
} from "lucide-react"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import type { PopulatedBooking } from "@/types/booking"

interface SuitableProfessionalsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: PopulatedBooking
}

interface ProfessionalAnalysis {
  _id: string
  name: string
  email?: string
  phone?: string
  gender?: string
  profileId: string
  isSuitable: boolean
  criteriaMatch: {
    treatmentMatch: {
      matches: boolean
      details: string
    }
    cityMatch: {
      matches: boolean
      details: string
    }
    genderMatch: {
      matches: boolean
      details: string
    }
    durationMatch: {
      matches: boolean
      details: string
    }
  }
  notificationStatus: {
    sent: boolean
    lastSent: string | null
    status: string
    responseDate: string | null
  }
  notificationPreferences: {
    methods: string[]
    email: boolean
    sms: boolean
  }
  workAreas: Array<{
    cityName: string
    coveredCities: string[]
  }>
  treatments: Array<{
    treatmentId: string
    treatmentName: string
    durationId?: string
  }>
}

interface BookingCriteria {
  treatmentId: string
  treatmentName: string
  cityName: string
  genderPreference: string
  durationId?: string
  durationName: string
}

interface SuitableProfessionalsData {
  booking: {
    _id: string
    bookingNumber: string
    criteria: BookingCriteria
  }
  professionals: ProfessionalAnalysis[]
  summary: {
    total: number
    suitable: number
    notificationsSent: number
  }
}

export function SuitableProfessionalsModal({
  open,
  onOpenChange,
  booking
}: SuitableProfessionalsModalProps) {
  const { toast } = useToast()
  const [data, setData] = useState<SuitableProfessionalsData | null>(null)
  const [loading, setLoading] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (open && booking) {
      loadData()
    }
  }, [open, booking])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}/suitable-professionals-detailed`)
      const result = await response.json()
      
      if (result.success) {
        setData(result)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בטעינת נתוני המטפלים"
        })
      }
    } catch (error) {
      console.error("Error loading suitable professionals:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני המטפלים"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return "-"
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      not_sent: { variant: "secondary" as const, text: "לא נשלח", icon: AlertCircle },
      pending: { variant: "default" as const, text: "ממתין לתגובה", icon: Clock },
      accepted: { variant: "default" as const, text: "קיבל", icon: CheckCircle2 },
      declined: { variant: "destructive" as const, text: "דחה", icon: XCircle },
      expired: { variant: "secondary" as const, text: "פג תוקף", icon: AlertCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_sent
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const getCriteriaIcon = (matches: boolean) => {
    return matches ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    )
  }

  const getGenderText = (gender: string) => {
    return gender === "male" ? "זכר" : gender === "female" ? "נקבה" : "לא צוין"
  }

  const getPreferenceText = (preference: string) => {
    return preference === "male" ? "זכר" : preference === "female" ? "נקבה" : "ללא העדפה"
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>מטפלים מתאימים</DialogTitle>
            <DialogDescription>
              טוען נתוני מטפלים...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!data) {
    return null
  }

  const { booking: bookingData, professionals, summary } = data
  const suitableProfessionals = professionals.filter(p => p.isSuitable)
  const unsuitableProfessionals = professionals.filter(p => !p.isSuitable)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            מטפלים מתאימים - הזמנה #{bookingData.bookingNumber}
          </DialogTitle>
          <DialogDescription>
            ניתוח מפורט של מטפלים מתאימים וסטטוס התראות
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Criteria Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">קריטריוני ההזמנה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">טיפול</div>
                  <div className="text-sm">{bookingData.criteria.treatmentName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">עיר</div>
                  <div className="text-sm">{bookingData.criteria.cityName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">העדפת מין</div>
                  <div className="text-sm">{getPreferenceText(bookingData.criteria.genderPreference)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">משך זמן</div>
                  <div className="text-sm">{bookingData.criteria.durationName}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">סה"כ מטפלים</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{summary.suitable}</div>
                <div className="text-sm text-muted-foreground">מתאימים</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{summary.notificationsSent}</div>
                <div className="text-sm text-muted-foreground">התראות נשלחו</div>
              </CardContent>
            </Card>
          </div>

          {/* Professionals List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {/* Suitable Professionals */}
              {suitableProfessionals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-3">
                    מטפלים מתאימים ({suitableProfessionals.length})
                  </h3>
                  <div className="space-y-3">
                    {suitableProfessionals.map((professional) => (
                      <Card key={professional._id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-50 p-2 rounded-lg">
                                <User className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <div className="font-semibold">{professional.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {getGenderText(professional.gender)} • {professional.email || "אין אימייל"} • {formatPhoneForDisplay(professional.phone || "")}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(professional.notificationStatus.status)}
                            </div>
                          </div>

                          {/* Criteria Match */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {getCriteriaIcon(professional.criteriaMatch.treatmentMatch.matches)}
                              <span className="text-sm">{professional.criteriaMatch.treatmentMatch.details}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getCriteriaIcon(professional.criteriaMatch.cityMatch.matches)}
                              <span className="text-sm">{professional.criteriaMatch.cityMatch.details}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getCriteriaIcon(professional.criteriaMatch.genderMatch.matches)}
                              <span className="text-sm">{professional.criteriaMatch.genderMatch.details}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getCriteriaIcon(professional.criteriaMatch.durationMatch.matches)}
                              <span className="text-sm">{professional.criteriaMatch.durationMatch.details}</span>
                            </div>
                          </div>

                          {/* Notification Status */}
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm font-medium mb-2">סטטוס התראות</div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">העדפות: </span>
                                <span>{professional.notificationPreferences.methods.join(", ")}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">נשלח לאחרונה: </span>
                                <span>{formatDate(professional.notificationStatus.lastSent)}</span>
                              </div>
                              {professional.notificationStatus.responseDate && (
                                <div>
                                  <span className="text-muted-foreground">תאריך תגובה: </span>
                                  <span>{formatDate(professional.notificationStatus.responseDate)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Unsuitable Professionals */}
              {unsuitableProfessionals.length > 0 && (
                <div>
                  <Separator className="my-4" />
                  <h3 className="text-lg font-semibold text-red-600 mb-3">
                    מטפלים לא מתאימים ({unsuitableProfessionals.length})
                  </h3>
                  <div className="space-y-3">
                    {unsuitableProfessionals.map((professional) => (
                      <Card key={professional._id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-red-50 p-2 rounded-lg">
                                <User className="w-5 h-5 text-red-600" />
                              </div>
                              <div>
                                <div className="font-semibold">{professional.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {getGenderText(professional.gender)} • {professional.email || "אין אימייל"} • {formatPhoneForDisplay(professional.phone || "")}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Criteria Match */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              {getCriteriaIcon(professional.criteriaMatch.treatmentMatch.matches)}
                              <span className="text-sm">{professional.criteriaMatch.treatmentMatch.details}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getCriteriaIcon(professional.criteriaMatch.cityMatch.matches)}
                              <span className="text-sm">{professional.criteriaMatch.cityMatch.details}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getCriteriaIcon(professional.criteriaMatch.genderMatch.matches)}
                              <span className="text-sm">{professional.criteriaMatch.genderMatch.details}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getCriteriaIcon(professional.criteriaMatch.durationMatch.matches)}
                              <span className="text-sm">{professional.criteriaMatch.durationMatch.details}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 