"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { useTranslation } from "@/lib/translations/i18n"
import ProfessionalBasicInfoTabSimple from "./tabs/professional-basic-info-tab-simple"
import ProfessionalTreatmentsTabSimple from "./tabs/professional-treatments-tab-simple"
import ProfessionalWorkAreasTabSimple from "./tabs/professional-work-areas-tab-simple"
import ProfessionalEarningsTab from "./tabs/professional-earnings-tab"

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
  treatments: any[]
  workAreas: any[]
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
  const [updatedProfessional, setUpdatedProfessional] = useState<Professional>(professional)

  const handleUpdate = (updatedData: Partial<Professional>) => {
    setUpdatedProfessional(prev => ({
      ...prev,
      ...updatedData
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreatingNew ? "יצירת מטפל חדש" : "עריכת מטפל"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} dir={dir}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
            <TabsTrigger value="treatments">טיפולים</TabsTrigger>
            <TabsTrigger value="workAreas">איזורי פעילות</TabsTrigger>
            <TabsTrigger value="earnings">הזמנות</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <ProfessionalBasicInfoTabSimple
              professional={updatedProfessional}
              onUpdate={handleUpdate}
              loading={false}
              isCreatingNew={isCreatingNew}
            />
          </TabsContent>

          <TabsContent value="treatments">
            <ProfessionalTreatmentsTabSimple
              professional={updatedProfessional}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="workAreas">
            <ProfessionalWorkAreasTabSimple
              professional={updatedProfessional}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="earnings">
            <ProfessionalEarningsTab professional={updatedProfessional} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 