"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { DollarSign, TrendingUp, CreditCard, Clock, AlertTriangle } from "lucide-react"
import type { Professional } from "@/lib/types/professional"

interface ProfessionalFinancialTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
}

export default function ProfessionalFinancialTab({
  professional,
  onUpdate
}: ProfessionalFinancialTabProps) {
  const { t, dir } = useTranslation()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            מידע כספי
          </h3>
          <p className="text-sm text-muted-foreground">
            צפייה במידע כספי ונתוני רווחיות של המטפל
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          בטיפול
        </Badge>
      </div>

      {/* Current Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              סה"כ רווחים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(professional.totalEarnings || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              מתחילת הפעילות
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-600" />
              תשלומים ממתינים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(professional.pendingPayments || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              לתשלום במחזור הבא
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Development Notice */}
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">תכונה בפיתוח</h3>
          <p className="text-muted-foreground text-center max-w-md">
            דוחות כספיים מפורטים, ניתוח רווחיות, והיסטוריית תשלומים יהיו זמינים בקרוב.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            <div className="mb-2">תכונות עתידיות:</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>דוחות רווחיות חודשיים ושנתיים</li>
              <li>היסטוריית תשלומים מפורטת</li>
              <li>ניתוח מגמות והשוואות</li>
              <li>ניהול עמלות ותעריפים</li>
              <li>יצוא דוחות לאקסל</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info Display */}
      <Card>
        <CardHeader>
          <CardTitle>מידע כספי בסיסי</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">סטטוס:</span>
                <span className={professional.isActive ? "text-green-600" : "text-red-600"}>
                  {professional.isActive ? "פעיל" : "לא פעיל"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">מספר טיפולים:</span>
                <span>{professional.treatments?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">איזורי פעילות:</span>
                <span>{professional.workAreas?.length || 0}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">פרטי בנק:</span>
                <span className={professional.bankDetails ? "text-green-600" : "text-red-600"}>
                  {professional.bankDetails ? "הוגדר" : "לא הוגדר"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">הצטרף:</span>
                <span>
                  {professional.appliedAt 
                    ? (() => {
                        const dateObj = new Date(professional.appliedAt)
                        const day = dateObj.getDate().toString().padStart(2, '0')
                        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
                        const year = dateObj.getFullYear()
                        return `${day}/${month}/${year}`
                      })()
                    : "-"
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">עודכן:</span>
                <span>
                  {professional.updatedAt 
                    ? (() => {
                        const dateObj = new Date(professional.updatedAt)
                        const day = dateObj.getDate().toString().padStart(2, '0')
                        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
                        const year = dateObj.getFullYear()
                        return `${day}/${month}/${year}`
                      })()
                    : "-"
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 