"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { ArrowLeft, UserPlus, Save } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import ProfessionalBasicInfoTabSimple from "./tabs/professional-basic-info-tab-simple"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

interface Professional {
  _id: string
  userId: IUser
  status: ProfessionalStatus
  isActive: boolean
  treatments: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
    treatmentName?: string
  }>
  workAreas: Array<{
    cityId: string
    cityName: string
    distanceRadius: "20km" | "40km" | "60km" | "80km" | "unlimited"
    coveredCities: string[]
  }>
  bankDetails?: {
    bankName: string
    branchNumber: string
    accountNumber: string
  }
  totalEarnings: number
  pendingPayments: number
  adminNotes?: string
  rejectionReason?: string
  appliedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  lastActiveAt?: Date
  createdAt: Date
  updatedAt: Date
}

export function ProfessionalCreatePage() {
  const { t, dir } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  
  const [isCreating, setIsCreating] = useState(false)

  // יצירת אובייקט מטפל ריק ליצירת חדש
  const newProfessional: Professional = {
    _id: "new",
    userId: {
      _id: "new",
      name: "",
      email: "",
      phone: "",
      gender: "male",
      roles: ["professional"],
      activeRole: "professional",
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as IUser,
    status: "pending_admin_approval",
    isActive: true,
    treatments: [],
    workAreas: [],
    totalEarnings: 0,
    pendingPayments: 0,
    adminNotes: "",
    rejectionReason: "",
    appliedAt: new Date(),
    approvedAt: undefined,
    rejectedAt: undefined,
    lastActiveAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const handleBack = () => {
    router.push("/dashboard/admin/professional-management")
  }

  const handleCreated = (createdProfessional: Professional) => {
    toast({
      title: "הצלחה",
      description: "המטפל נוצר בהצלחה"
    })
    // מעבר לעמוד העריכה של המטפל החדש
    router.push(`/dashboard/admin/professional-management/${createdProfessional._id}`)
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="w-6 h-6" />
              יצירת מטפל חדש
            </h1>
            <p className="text-sm text-muted-foreground">
              מלא את הפרטים הבסיסיים ליצירת מטפל חדש במערכת
            </p>
          </div>
        </div>
        
        <Badge variant="secondary" className="flex items-center gap-1">
          ממתין לאישור
        </Badge>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>פרטים בסיסיים</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfessionalBasicInfoTabSimple
            professional={newProfessional}
            onUpdate={() => {}} // לא נדרש עדכון במצב יצירה
            loading={isCreating}
            isCreatingNew={true}
            onCreated={handleCreated}
          />
        </CardContent>
      </Card>
    </div>
  )
} 