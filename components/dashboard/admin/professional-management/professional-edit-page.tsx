"use client"

import { useState, useCallback, useEffect, useMemo, memo } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { useTranslation } from "@/lib/translations/i18n"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent } from "@/components/common/ui/card"
import { AlertTriangle, ArrowLeft, User, Stethoscope, MapPin, CreditCard, FileText, DollarSign, ScrollText, Save, Calendar } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import { formatDateSafe } from "./utils/professional-utils"
import ProfessionalProfileTab from "./tabs/professional-profile-tab"
import ProfessionalTreatmentsTab from "./tabs/professional-treatments-tab"
import ProfessionalWorkAreasTab from "./tabs/professional-work-areas-tab"
import ProfessionalBankDetailsTab from "./tabs/professional-bank-details-tab"
import ProfessionalDocumentsTab from "./tabs/professional-documents-tab"
import ProfessionalFinancialTab from "./tabs/professional-financial-tab"
import ProfessionalContractTab from "./tabs/professional-contract-tab"
import ProfessionalBookingsTab from "./tabs/professional-bookings-tab"
import ProfessionalAllCitiesTab from "./tabs/professional-all-cities-tab"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { Professional } from "@/lib/types/professional"

interface ProfessionalEditPageProps {
  professional: Professional
  isCreatingNew?: boolean
}

function ProfessionalEditPageComponent({ professional, isCreatingNew = false }: ProfessionalEditPageProps) {
  console.log('🔥 TRACE: ProfessionalEditPage RENDER START', professional._id)
  
  const { t, dir } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("profile")
  const [updatedProfessional, setUpdatedProfessional] = useState<Professional>(professional)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  console.log('🔥 TRACE: After state initialization', {
    professionalId: professional._id,
    updatedProfessionalId: updatedProfessional._id,
    timestamp: new Date().toISOString()
  })

  // Update state when professional prop changes (only when professional ID changes)
  useEffect(() => {
    console.log('🔥 TRACE: useEffect triggered', {
      professionalId: professional._id,
      updatedProfessionalId: updatedProfessional._id,
      willUpdate: professional._id !== updatedProfessional._id,
      timestamp: new Date().toISOString(),
      stack: new Error().stack?.split('\n').slice(1, 5)
    })

    // Prevent infinite loops by checking if the professional actually changed
    if (professional._id !== updatedProfessional._id) {
      console.log('🔥 TRACE: UPDATING updatedProfessional state!', {
        from: updatedProfessional._id,
        to: professional._id,
        timestamp: new Date().toISOString()
      })
    setUpdatedProfessional(professional)
      setHasUnsavedChanges(false)
    }
  }, [professional._id, updatedProfessional._id])

  // Stable reference for callbacks to prevent unnecessary re-renders
  const handleUpdate = useCallback((updatedData: Partial<Professional>) => {
    console.log('🔥 TRACE: handleUpdate called', {
      updatedData: Object.keys(updatedData || {}),
      updatedDataSample: updatedData ? Object.entries(updatedData).slice(0, 3) : 'empty',
      timestamp: new Date().toISOString(),
      stack: new Error().stack?.split('\n').slice(1, 5)
    })

    // Prevent empty updates that could cause infinite loops
    if (!updatedData || Object.keys(updatedData).length === 0) {
      console.log('🔥 TRACE: handleUpdate REJECTED - empty data')
      return
    }
    
    setUpdatedProfessional(prev => {
      console.log('🔥 TRACE: setUpdatedProfessional setter function called', {
        prevId: prev._id,
        timestamp: new Date().toISOString()
      })

      // Check if the update actually changes anything
      let hasChanges = false
      const changedFields: string[] = []
      for (const key in updatedData) {
        if (prev[key as keyof Professional] !== updatedData[key as keyof Professional]) {
          hasChanges = true
          changedFields.push(key)
        }
      }
      
      console.log('🔥 TRACE: Change detection result', {
        hasChanges,
        changedFields,
        timestamp: new Date().toISOString()
      })
      
      // Only update if there are actual changes
      if (hasChanges) {
        console.log('🔥 TRACE: APPLYING STATE CHANGE!', {
          changedFields,
          timestamp: new Date().toISOString()
        })
        return { ...prev, ...updatedData }
      }
      
      console.log('🔥 TRACE: NO CHANGE - returning prev state')
      return prev
    })
    
    setHasUnsavedChanges(true)
  }, [])

  // Create a throttled version to prevent rapid updates
  const stableProfessional = useMemo(() => {
    console.log('🔥 TRACE: stableProfessional useMemo recalculating', {
      updatedProfessionalId: updatedProfessional._id,
      status: updatedProfessional.status,
      timestamp: new Date().toISOString(),
      stack: new Error().stack?.split('\n').slice(1, 5)
    })
    return updatedProfessional
  }, [updatedProfessional._id, updatedProfessional.status])

  const handleBack = () => {
    console.log('🔥 TRACE: handleBack called', {
      hasUnsavedChanges,
      timestamp: new Date().toISOString()
    })

    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm("יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?")
      if (!confirmLeave) return
    }
            router.push("/dashboard/(user)/(roles)/admin/professional-management")
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

  // השתמש בפונקציה הבטוחה מהutils
  // const formatDate מיובא מהutils כ formatDateSafe

  console.log('🔥 TRACE: About to render ProfessionalEditPage', {
    professionalId: professional._id,
    updatedProfessionalId: updatedProfessional._id,
    stableProfessionalId: stableProfessional._id,
    propsEqual: professional._id === stableProfessional._id,
    timestamp: new Date().toISOString()
  })

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
              {isCreatingNew ? "יצירת מטפל חדש" : `עריכת מטפל - ${typeof updatedProfessional.userId === 'object' ? updatedProfessional.userId.name : 'טוען...'}`}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {getStatusBadge(updatedProfessional.status)}
              {!isCreatingNew && (
              <span className="text-sm text-muted-foreground">
                  הצטרף ב-{formatDateSafe(updatedProfessional.appliedAt)}
              </span>
              )}
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
          <Tabs value={activeTab} onValueChange={(value) => {
            console.log('🔥 TRACE: Tab changed', {
              from: activeTab,
              to: value,
              professionalId: professional._id,
              timestamp: new Date().toISOString()
            })
            setActiveTab(value)
          }} dir={dir} className="w-full">
            <TabsList className="grid w-full grid-cols-9 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2" key="tab-profile">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">פרופיל</span>
              </TabsTrigger>
              <TabsTrigger value="treatments" className="flex items-center gap-2" key="tab-treatments">
                <Stethoscope className="w-4 h-4" />
                <span className="hidden sm:inline">טיפולים</span>
              </TabsTrigger>
              <TabsTrigger value="workAreas" className="flex items-center gap-2" key="tab-workAreas">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">איזורי פעילות</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2" key="tab-bookings">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">הזמנות</span>
              </TabsTrigger>
              <TabsTrigger value="bankDetails" className="flex items-center gap-2" key="tab-bankDetails">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">חשבון בנק</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2" key="tab-documents">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">מסמכים</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2" key="tab-financial">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">כספים</span>
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-2" key="tab-contract">
                <ScrollText className="w-4 h-4" />
                <span className="hidden sm:inline">הסכמים</span>
              </TabsTrigger>
              <TabsTrigger value="allCities" className="flex items-center gap-2" key="tab-allCities">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">כל הערים</span>
              </TabsTrigger>
            </TabsList>

            <div className="min-h-[600px]">
              <TabsContent value="profile" className="m-0" key="content-profile">
                <ProfessionalProfileTab
                  professional={stableProfessional}
                  onUpdate={handleUpdate}
                  loading={false}
                  isCreatingNew={isCreatingNew}
                  onCreated={() => {}}
                />
              </TabsContent>

              <TabsContent value="treatments" className="m-0" key="content-treatments">
                <ProfessionalTreatmentsTab
                  professional={stableProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="workAreas" className="m-0" key="content-workAreas">
                <ProfessionalWorkAreasTab
                  professional={stableProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="bookings" className="m-0" key="content-bookings">
                <ProfessionalBookingsTab
                  professional={stableProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="bankDetails" className="m-0" key="content-bankDetails">
                <ProfessionalBankDetailsTab
                  professional={stableProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="documents" className="m-0" key="content-documents">
                <ProfessionalDocumentsTab
                  professional={stableProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="financial" className="m-0" key="content-financial">
                <ProfessionalFinancialTab
                  professional={stableProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="contract" className="m-0" key="content-contract">
                <ProfessionalContractTab
                  professional={stableProfessional}
                  onUpdate={handleUpdate}
                />
              </TabsContent>

              <TabsContent value="allCities" className="m-0" key="content-allCities">
                <ProfessionalAllCitiesTab
                  professional={stableProfessional}
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

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: ProfessionalEditPageProps, nextProps: ProfessionalEditPageProps) => {
  // Only re-render if the professional ID or creation state changes
  return (
    prevProps.professional._id === nextProps.professional._id &&
    prevProps.isCreatingNew === nextProps.isCreatingNew
  )
}

export const ProfessionalEditPage = memo(ProfessionalEditPageComponent, arePropsEqual) 