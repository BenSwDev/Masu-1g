"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { DollarSign } from "lucide-react"

interface Professional {
  _id: string
  totalEarnings: number
  pendingPayments: number
  financialTransactions: any[]
}

interface ProfessionalFinancialTabProps {
  professional: Professional
  onUpdate: (professional: Professional) => void
}

export default function ProfessionalFinancialTab({
  professional,
  onUpdate
}: ProfessionalFinancialTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            דוחות כספיים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            טאב דוחות כספיים - בפיתוח
            <div className="text-sm mt-2">
              כאן יוצגו הדוחות הכספיים של המטפל
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 