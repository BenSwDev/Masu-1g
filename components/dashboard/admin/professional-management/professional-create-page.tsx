"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { ArrowLeft, UserPlus } from "lucide-react"
import ProfessionalEditModal from "./professional-edit-modal"
import type { Professional } from "@/lib/types/professional"
import type { IUser } from "@/lib/db/models/user"

export function ProfessionalCreatePage() {
  const { t, dir } = useTranslation()
  const router = useRouter()
  const [showModal, setShowModal] = useState(true)

  // יצירת אובייקט מטפל ריק עם ערכים סטטיים
  const staticDate = new Date('2024-01-01T00:00:00.000Z')
  
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
      isActive: true,
      createdAt: staticDate,
      updatedAt: staticDate
    } as unknown as IUser,
    status: "pending_admin_approval",
    isActive: true,
    specialization: "",
    experience: "",
    certifications: [],
    bio: "",
    profileImage: "",
    treatments: [],
    workAreas: [],
    totalEarnings: 0,
    pendingPayments: 0,
    adminNotes: "",
    rejectionReason: "",
    appliedAt: staticDate,
    approvedAt: undefined,
    rejectedAt: undefined,
    lastActiveAt: staticDate,
    createdAt: staticDate,
    updatedAt: staticDate
  }

  const handleBack = () => {
    router.push("/dashboard/admin/professional-management")
  }

  const handleClose = () => {
    setShowModal(false)
    router.push("/dashboard/admin/professional-management")
  }

  if (!showModal) {
    return null
  }

  return (
    <div className="space-y-6" dir={dir}>
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
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>פרטי המטפל החדש</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            לחץ על הכפתור למטה כדי לפתוח את טופס יצירת המטפל החדש
          </p>
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            פתח טופס יצירה
          </Button>
        </CardContent>
      </Card>

      {/* Modal for creating new professional */}
      <ProfessionalEditModal
        professional={newProfessional}
        open={showModal}
        onClose={handleClose}
        isCreatingNew={true}
      />
    </div>
  )
} 