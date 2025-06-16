"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { User, Stethoscope, MapPin } from "lucide-react"
import ProfessionalBasicInfoTab from "./tabs/professional-basic-info-tab-simple"
import ProfessionalTreatmentsTab from "./tabs/professional-treatments-tab-simple"
import ProfessionalWorkAreasTab from "./tabs/professional-work-areas-tab-simple"

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
  status: string
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
  isCreatingNew?: boolean
}

export default function ProfessionalEditModal({ 
  professional, 
  open, 
  onClose,
  isCreatingNew = false
}: ProfessionalEditModalProps) {
  const { t, dir } = useTranslation()
  
  const [activeTab, setActiveTab] = useState("basic")
  const [loading, setLoading] = useState(false)
  const [professionalData, setProfessionalData] = useState<Professional>(professional)

  // Update professional data when prop changes
  useEffect(() => {
    setProfessionalData(professional)
  }, [professional])

  const handleUpdateProfessional = (updatedProfessional: any) => {
    setProfessionalData(updatedProfessional)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden" dir={dir}>
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5" />
            {isCreatingNew ? "הוספת מטפל חדש" : `עריכת מטפל - ${professionalData.userId.name}`}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[70vh]">
            <TabsContent value="basic" className="mt-0">
              <ProfessionalBasicInfoTab
                professional={professionalData}
                onUpdate={handleUpdateProfessional}
                loading={loading}
                isCreatingNew={isCreatingNew}
              />
            </TabsContent>

            <TabsContent value="treatments" className="mt-0">
              <ProfessionalTreatmentsTab
                professional={professionalData}
                onUpdate={handleUpdateProfessional}
              />
            </TabsContent>

            <TabsContent value="work-areas" className="mt-0">
              <ProfessionalWorkAreasTab
                professional={professionalData}
                onUpdate={handleUpdateProfessional}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 