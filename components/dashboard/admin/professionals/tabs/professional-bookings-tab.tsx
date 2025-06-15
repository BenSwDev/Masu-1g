"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Calendar } from "lucide-react"

interface Professional {
  _id: string
  bookings?: any[]
}

interface ProfessionalBookingsTabProps {
  professional: Professional
}

export default function ProfessionalBookingsTab({
  professional
}: ProfessionalBookingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            הזמנות המטפל
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            טאב הזמנות - בפיתוח
            <div className="text-sm mt-2">
              כאן יוצגו כל ההזמנות של המטפל
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 