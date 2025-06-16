"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  User, 
  Stethoscope, 
  MapPin, 
  Calendar, 
  DollarSign,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  Edit
} from "lucide-react"
import { updateProfessionalStatus } from "@/actions/professional-actions"
import ProfessionalBasicInfoTab from "./tabs/professional-basic-info-tab"
import ProfessionalTreatmentsTab from "./tabs/professional-treatments-tab"
import ProfessionalWorkAreasTab from "./tabs/professional-work-areas-tab"
import ProfessionalBookingsTab from "./tabs/professional-bookings-tab"
import ProfessionalFinancialTab from "./tabs/professional-financial-tab"
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
  treatments: any[]
  workAreas: any[]
  totalEarnings: number
  pendingPayments: number
  financialTransactions: any[]
  adminNotes?: string
  rejectionReason?: string
  appliedAt: string
  approvedAt?: string
  rejectedAt?: string
  lastActiveAt?: string
  bookings?: any[]
}

interface ProfessionalEditModalProps {
  professional: Professional
  open: boolean
  onClose: () => void
}

export default function ProfessionalEditModal({ 
  professional, 
  open, 
  onClose 
}: ProfessionalEditModalProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("basic")
  const [loading, setLoading] = useState(false)
  const [professionalData, setProfessionalData] = useState<Professional>(professional)

  // Update professional data when prop changes
  useEffect(() => {
    setProfessionalData(professional)
  }, [professional])

  const getStatusBadge = (status: ProfessionalStatus) => {
    const statusConfig = {
      active: { variant: "default" as const, icon: UserCheck, text: "פעיל", color: "text-green-600" },
      pending_admin_approval: { variant: "secondary" as const, icon: Clock, text: "ממתין לאישור", color: "text-orange-600" },
      pending_user_action: { variant: "outline" as const, icon: Clock, text: "ממתין למשתמש", color: "text-blue-600" },
      rejected: { variant: "destructive" as const, icon: UserX, text: "נדחה", color: "text-red-600" },
      suspended: { variant: "destructive" as const, icon: AlertTriangle, text: "מושהה", color: "text-red-600" }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const handleStatusChange = async (newStatus: ProfessionalStatus, adminNote?: string, rejectionReason?: string) => {
    setLoading(true)
    try {
      const result = await updateProfessionalStatus(
        professionalData._id,
        newStatus,
        adminNote,
        rejectionReason
      )

      if (result.success) {
        setProfessionalData(prev => ({
          ...prev,
          status: newStatus,
          adminNotes: adminNote,
          rejectionReason: newStatus === 'rejected' ? rejectionReason : undefined,
          approvedAt: newStatus === 'active' ? new Date().toISOString() : prev.approvedAt,
          rejectedAt: newStatus === 'rejected' ? new Date().toISOString() : prev.rejectedAt
        }))

        toast({
          title: "הצלחה",
          description: "סטטוס המטפל עודכן בהצלחה"
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון סטטוס המטפל"
        })
      }
    } catch (error) {
      console.error("Error updating professional status:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון סטטוס המטפל"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString()}`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden" dir={dir}>
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <DialogTitle className="text-xl">
                  {professionalData.userId.name}
                </DialogTitle>
              </div>
              {getStatusBadge(professionalData.status)}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              {professionalData.userId.email}
              <Separator orientation="vertical" className="h-4" />
              <Phone className="w-4 h-4" />
              {professionalData.userId.phone}
            </div>
          </div>
        </DialogHeader>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-sm text-muted-foreground">טיפולים</div>
                  <div className="font-semibold">{professionalData.treatments.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-sm text-muted-foreground">איזורי פעילות</div>
                  <div className="font-semibold">{professionalData.workAreas.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="text-sm text-muted-foreground">הזמנות</div>
                  <div className="font-semibold">{professionalData.bookings?.length || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <div>
                  <div className="text-sm text-muted-foreground">סה"כ רווחים</div>
                  <div className="font-semibold">{formatCurrency(professionalData.totalEarnings)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              פרטים בסיסיים
            </TabsTrigger>
            <TabsTrigger value="treatments" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              טיפולים
            </TabsTrigger>
            <TabsTrigger value="work-areas" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              איזורי פעילות
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              הזמנות
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              דוחות כספיים
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            <TabsContent value="basic" className="mt-0">
              <ProfessionalBasicInfoTab
                professional={professionalData}
                onUpdate={setProfessionalData}
                onStatusChange={handleStatusChange}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="treatments" className="mt-0">
              <ProfessionalTreatmentsTab
                professional={professionalData}
                onUpdate={setProfessionalData}
              />
            </TabsContent>

            <TabsContent value="work-areas" className="mt-0">
              <ProfessionalWorkAreasTab
                professional={professionalData}
                onUpdate={setProfessionalData}
              />
            </TabsContent>

            <TabsContent value="bookings" className="mt-0">
              <ProfessionalBookingsTab
                professional={professionalData}
              />
            </TabsContent>

            <TabsContent value="financial" className="mt-0">
              <ProfessionalFinancialTab
                professional={professionalData}
                onUpdate={setProfessionalData}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer with timestamps */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">הצטרף:</span>
              <div>{formatDate(professionalData.appliedAt)}</div>
            </div>
            {professionalData.approvedAt && (
              <div>
                <span className="font-medium">אושר:</span>
                <div>{formatDate(professionalData.approvedAt)}</div>
              </div>
            )}
            {professionalData.rejectedAt && (
              <div>
                <span className="font-medium">נדחה:</span>
                <div>{formatDate(professionalData.rejectedAt)}</div>
              </div>
            )}
            {professionalData.lastActiveAt && (
              <div>
                <span className="font-medium">פעיל לאחרונה:</span>
                <div>{formatDate(professionalData.lastActiveAt)}</div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 