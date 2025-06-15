"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { MapPin } from "lucide-react"

interface Professional {
  _id: string
  workAreas: any[]
}

interface ProfessionalWorkAreasTabProps {
  professional: Professional
  onUpdate: (professional: Professional) => void
}

export default function ProfessionalWorkAreasTab({
  professional,
  onUpdate
}: ProfessionalWorkAreasTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            איזורי פעילות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            טאב איזורי פעילות - בפיתוח
            <div className="text-sm mt-2">
              כאן יוצגו איזורי הפעילות של המטפל וטווחי המרחק
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 