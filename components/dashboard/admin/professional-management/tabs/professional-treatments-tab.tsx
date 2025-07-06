"use client"

import { useState, memo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Stethoscope, Plus, Edit, Trash2 } from "lucide-react"
import type { ProfessionalTabProps } from "@/lib/types/professional"

function ProfessionalTreatmentsTab({
  professional,
  onUpdate,
  loading = false
}: ProfessionalTabProps) {
  console.log('🔥 TRACE: ProfessionalTreatmentsTab RENDER', {
    professionalId: professional._id,
    loading,
    timestamp: new Date().toISOString()
  })

  const { t, dir } = useTranslation()
  const [saving, setSaving] = useState(false)

  const treatments = professional.treatments || []

  return (
    <Card className="border-0 shadow-sm" dir={dir}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            טיפולים ותעריפים
          </CardTitle>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            הוסף טיפול
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {treatments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>לא הוגדרו טיפולים עדיין</p>
            <p className="text-sm">הוסף טיפולים כדי שהמטפל יוכל לקבל הזמנות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {treatments.map((treatment, index) => (
              <div
                key={treatment.treatmentId || `treatment-${index}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div>
                  <div className="font-medium">
                    {treatment.treatmentName || `טיפול ${index + 1}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    מחיר: ₪{treatment.professionalPrice}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">פעיל</Badge>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg">
          <strong>הערה:</strong> זהו קומפוננט placeholder. יש לפתח את הפונקציונליות המלאה לניהול טיפולים.
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(ProfessionalTreatmentsTab) 