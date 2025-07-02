"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { useTranslation } from "@/lib/translations/i18n"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent } from "@/components/common/ui/card"
import { AlertTriangle, ArrowLeft, User, Stethoscope, MapPin, CreditCard, FileText, DollarSign, ScrollText, Save, Calendar } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import ProfessionalProfileTab from "./tabs/professional-profile-tab"
import ProfessionalTreatmentsTabSimple from "./tabs/professional-treatments-tab-simple"
import ProfessionalWorkAreasTabSimple from "./tabs/professional-work-areas-tab-simple"
import ProfessionalBankDetailsTab from "./tabs/professional-bank-details-tab"
import ProfessionalDocumentsTab from "./tabs/professional-documents-tab"
import ProfessionalFinancialTab from "./tabs/professional-financial-tab"
import ProfessionalContractTab from "./tabs/professional-contract-tab"
import ProfessionalBookingsTab from "./tabs/professional-bookings-tab"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { Professional } from "@/lib/types/professional"

interface ProfessionalEditPageProps {
  professional: Professional
}

export function ProfessionalEditPage({ professional }: ProfessionalEditPageProps) {
  const { t, dir } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("profile")
  const [updatedProfessional, setUpdatedProfessional] = useState<Professional>(professional)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleUpdate = useCallback((updatedData: Partial<Professional>) => {
    setUpdatedProfessional(prev => {
      // בדיקה אם יש שינוי אמיתי
      const hasActualChange = Object.keys(updatedData).some(key => {
        const newValue = updatedData[key as keyof Professional]
        const oldValue = prev[key as keyof Professional]
        return JSON.stringify(newValue) !== JSON.stringify(oldValue)
      })
      
      if (!hasActualChange) {
        return prev // אין שינוי אמיתי
      }
      
      return {
        ...prev,
        ...updatedData
      }
    })
    setHasUnsavedChanges(true)
  }, [])

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm("יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?")
      if (!confirmLeave) return
    }
    router.push("/dashboard/admin/professional-management")
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      // כאן ניתן להוסיף לוגיקה לשמירה כללית של כל השינויים
      toast({
        title: "הצלחה",
        description: "כל השינויים נשמרו בהצלחה"
      })
      setHasUnsavedChanges(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת השינויים"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = (status: ProfessionalStatus) => {
    const statusConfig = {
      active: { variant: "default" as const, text: "פעיל", color: "bg-green-100 text-green-800" },
      pending_admin_approval: { variant: "secondary" as const, text: "ממתין לאישור", color: "bg-orange-100 text-orange-800" },
      pending_user_action: { variant: "outline" as const, text: "ממתין למשתמש", color: "bg-blue-100 text-blue-800" },
      rejected: { variant: "destructive" as const, text: "נדחה", color: "bg-red-100 text-red-800" },
      suspended: { variant: "destructive" as const, text: "מושהה", color: "bg-red-100 text-red-800" }
    }

    const config = statusConfig[status]
    if (!config) return null

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.text}
      </Badge>
    )
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            חזור לרשימה
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">
              עריכת מטפל - {typeof updatedProfessional.userId === 'object' ? updatedProfessional.userId.name : 'טוען...'}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {getStatusBadge(updatedProfessional.status)}
              <span className="text-sm text-muted-foreground">
                הצטרף ב-{formatDate(updatedProfessional.appliedAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">שינויים לא נשמרו</span>
            </div>
          )}
          
          <Button 
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "שומר..." : "שמור הכל"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={dir} className="w-full">
            <TabsList className="grid w-full grid-cols-8 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">פרופיל</span>
              </TabsTrigger>
              <TabsTrigger value="treatments" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                <span className="hidden sm:inline">טיפולים</span>
              </TabsTrigger>
              <TabsTrigger value="workAreas" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">איזורי פעילות</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">הזמנות</span>
              </TabsTrigger>
              <TabsTrigger value="bankDetails" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">חשבון בנק</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">מסמכים</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">כספים</span>
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-2">
                <ScrollText className="w-4 h-4" />
                <span className="hidden sm:inline">הסכמים</span>
              </TabsTrigger>
            </TabsList>

            <div className="min-h-[600px]">
              <TabsContent value="profile" className="m-0">
                <ProfessionalProfileTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                  isCreatingNew={false}
                  onCreated={() => {}}
                />
              </TabsContent>

              <TabsContent value="treatments" className="m-0">
                <ProfessionalTreatmentsTabSimple
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="workAreas" className="m-0">
                <ProfessionalWorkAreasTabSimple
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="bookings" className="m-0">
                <ProfessionalBookingsTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="bankDetails" className="m-0">
                <ProfessionalBankDetailsTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="documents" className="m-0">
                <ProfessionalDocumentsTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="financial" className="m-0">
                <ProfessionalFinancialTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="contract" className="m-0">
                <ProfessionalContractTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 