"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { formatPhoneForDisplay } from "@/lib/phone-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollText, Clock, Info } from "lucide-react"
import type { Professional } from "@/lib/types/professional"

interface ProfessionalContractTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
}

export default function ProfessionalContractTab({
  professional,
  onUpdate
}: ProfessionalContractTabProps) {
  const { t, dir } = useTranslation()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            הסכם מטפל
          </h3>
          <p className="text-sm text-muted-foreground">
            ניהול הסכם העבודה עם המטפל
          </p>
        </div>
      </div>

      {/* Development Status */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription className="text-center text-lg font-medium">
          בטיפול
        </AlertDescription>
      </Alert>

      {/* Placeholder Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            מידע כללי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <ScrollText className="h-16 w-16 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-muted-foreground">הסכם מטפל</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                מערכת ניהול הסכמי המטפלים נמצאת כרגע בפיתוח ותהיה זמינה בקרוב
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Features Preview */}
      <Card>
        <CardHeader>
          <CardTitle>תכונות עתידיות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>יצירת הסכמים אוטומטית</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>חתימה דיגיטלית</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>ניהול תנאי עבודה</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>מעקב אחר תוקף הסכמים</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>הסכמי חלוקת רווחים</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>ניהול SLA ודרישות שירות</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>מידע ליצירת קשר</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">שם המטפל:</span> {typeof professional.userId === 'object' ? professional.userId.name : 'לא זמין'}
            </p>
            {typeof professional.userId === 'object' && professional.userId.email && (
              <p>
                <span className="font-medium">אימייל:</span> {professional.userId.email}
              </p>
            )}
            {typeof professional.userId === 'object' && professional.userId.phone && (
              <p>
                <span className="font-medium">טלפון:</span> {formatPhoneForDisplay(professional.userId.phone || "")}
              </p>
            )}
            <p>
              <span className="font-medium">תאריך הצטרפות:</span>{" "}
              {new Date(professional.appliedAt).toLocaleDateString("he-IL")}
            </p>
            <p>
              <span className="font-medium">סטטוס:</span>{" "}
              <span className={`${
                professional.status === "active" ? "text-green-600" :
                professional.status === "pending_admin_approval" ? "text-orange-600" :
                "text-red-600"
              }`}>
                {professional.status === "active" ? "פעיל" :
                 professional.status === "pending_admin_approval" ? "ממתין לאישור" :
                 professional.status === "rejected" ? "נדחה" :
                 professional.status === "suspended" ? "מושהה" :
                 "ממתין למשתמש"}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
