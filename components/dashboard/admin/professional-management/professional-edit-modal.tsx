"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { useTranslation } from "@/lib/translations/i18n"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { AlertTriangle, X, User, Stethoscope, MapPin, CreditCard, FileText, DollarSign, ScrollText } from "lucide-react"
import ProfessionalProfileTab from "./tabs/professional-profile-tab"
import ProfessionalTreatmentsTabNew from "./tabs/professional-treatments-tab-new"
import ProfessionalWorkAreasTabSimple from "./tabs/professional-work-areas-tab-simple"
import ProfessionalBankDetailsTab from "./tabs/professional-bank-details-tab"
import ProfessionalDocumentsTab from "./tabs/professional-documents-tab"
import ProfessionalFinancialTab from "./tabs/professional-financial-tab"
import ProfessionalContractTab from "./tabs/professional-contract-tab"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { Professional, ProfessionalEditModalProps } from "@/lib/types/professional"

export default function ProfessionalEditModal({ 
  professional, 
  open, 
  onClose,
  isCreatingNew = false
}: ProfessionalEditModalProps) {
  const { t, dir } = useTranslation()
  const [activeTab, setActiveTab] = useState("profile")
  const [updatedProfessional, setUpdatedProfessional] = useState<Professional>(professional)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const handleUpdate = (updatedData: Partial<Professional>) => {
    setUpdatedProfessional(prev => ({
      ...prev,
      ...updatedData
    }))
    if (!isCreatingNew) {
      setHasUnsavedChanges(true)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm("יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?")
      if (!confirmClose) return
    }
    setHasUnsavedChanges(false)
    onClose()
  }

  const getStatusBadge = (status: ProfessionalStatus) => {
    const statusConfig = {
      active: { variant: "default" as const, icon: User, text: "פעיל", color: "text-green-600" },
      pending_admin_approval: { variant: "secondary" as const, icon: AlertTriangle, text: "ממתין לאישור", color: "text-orange-600" },
      pending_user_action: { variant: "outline" as const, icon: AlertTriangle, text: "ממתין למשתמש", color: "text-blue-600" },
      rejected: { variant: "destructive" as const, icon: X, text: "נדחה", color: "text-red-600" },
      suspended: { variant: "destructive" as const, icon: AlertTriangle, text: "מושהה", color: "text-red-600" }
    }

    const config = statusConfig[status]
    if (!config) return null
    
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
      return dateObj.toLocaleDateString("he-IL")
    } catch {
      return "-"
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] !grid-rows-[auto_1fr] !grid !p-0">
        <div className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                {isCreatingNew ? "יצירת מטפל חדש" : `עריכת מטפל - ${updatedProfessional.userId.name}`}
              </DialogTitle>
              {!isCreatingNew && (
                <div className="flex items-center gap-3 mt-2">
                  {getStatusBadge(updatedProfessional.status)}
                  <span className="text-sm text-muted-foreground">
                    הצטרף ב-{formatDate(updatedProfessional.appliedAt)}
                  </span>
                </div>
              )}
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">שינויים לא נשמרו</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col min-h-0 p-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={dir} className="flex flex-col min-h-0 flex-1">
            <TabsList className="grid w-full grid-cols-7 flex-shrink-0 mb-4">
              <TabsTrigger value="profile" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">פרופיל</span>
                <span className="sm:hidden">פרופיל</span>
              </TabsTrigger>
              <TabsTrigger value="treatments" className="flex items-center gap-1">
                <Stethoscope className="w-4 h-4" />
                <span className="hidden sm:inline">טיפולים</span>
                <span className="sm:hidden">טיפולים</span>
              </TabsTrigger>
              <TabsTrigger value="workAreas" className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">איזורי פעילות</span>
                <span className="sm:hidden">איזורים</span>
              </TabsTrigger>
              <TabsTrigger value="bankDetails" className="flex items-center gap-1" disabled={isCreatingNew}>
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">חשבון בנק</span>
                <span className="sm:hidden">בנק</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-1" disabled={isCreatingNew}>
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">מסמכים</span>
                <span className="sm:hidden">מסמכים</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-1" disabled={isCreatingNew}>
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">כספים</span>
                <span className="sm:hidden">כספים</span>
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-1" disabled={isCreatingNew}>
                <ScrollText className="w-4 h-4" />
                <span className="hidden sm:inline">הסכמים</span>
                <span className="sm:hidden">הסכמים</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0">
              <TabsContent value="profile" className="h-full overflow-y-auto data-[state=active]:block m-0">
                <ProfessionalProfileTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                  isCreatingNew={isCreatingNew}
                  onCreated={(newProfessional) => {
                    setUpdatedProfessional(newProfessional)
                    setHasUnsavedChanges(false)
                  }}
                />
              </TabsContent>

              <TabsContent value="treatments" className="h-full overflow-y-auto data-[state=active]:block m-0">
                <ProfessionalTreatmentsTabNew
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                />
              </TabsContent>

              <TabsContent value="workAreas" className="h-full overflow-y-auto data-[state=active]:block m-0">
                <ProfessionalWorkAreasTabSimple
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                />
              </TabsContent>

              <TabsContent value="bankDetails" className="h-full overflow-y-auto data-[state=active]:block m-0">
                <ProfessionalBankDetailsTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                />
              </TabsContent>

              <TabsContent value="documents" className="h-full overflow-y-auto data-[state=active]:block m-0">
                <ProfessionalDocumentsTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                />
              </TabsContent>

              <TabsContent value="financial" className="h-full overflow-y-auto data-[state=active]:block m-0">
                <ProfessionalFinancialTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                />
              </TabsContent>

              <TabsContent value="contract" className="h-full overflow-y-auto data-[state=active]:block m-0">
                <ProfessionalContractTab
                  professional={updatedProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
} 