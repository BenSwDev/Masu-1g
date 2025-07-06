"use client"

import { useState, memo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { MapPin, Plus, Edit, Trash2 } from "lucide-react"
import type { ProfessionalTabProps } from "@/lib/types/professional"

function ProfessionalWorkAreasTab({
  professional,
  onUpdate,
  loading = false
}: ProfessionalTabProps) {
  console.log('🔥 TRACE: ProfessionalWorkAreasTab RENDER', {
    professionalId: professional._id,
    loading,
    timestamp: new Date().toISOString()
  })

  const { t, dir } = useTranslation()
  const [saving, setSaving] = useState(false)

  const workAreas = professional.workAreas || []

  return (
    <Card className="border-0 shadow-sm" dir={dir}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            איזורי פעילות
          </CardTitle>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            הוסף איזור
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workAreas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>לא הוגדרו איזורי פעילות עדיין</p>
            <p className="text-sm">הוסף איזורי פעילות כדי שהמטפל יוכל לקבל הזמנות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workAreas.map((area, index) => (
              <div
                key={area.cityId || `area-${index}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div>
                  <div className="font-medium">
                    {area.cityName || `איזור ${index + 1}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    רדיוס: {area.distanceRadius}
                  </div>
                  {area.coveredCities && area.coveredCities.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      כולל: {area.coveredCities.join(", ")}
                    </div>
                  )}
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
          <strong>הערה:</strong> זהו קומפוננט placeholder. יש לפתח את הפונקציונליות המלאה לניהול איזורי עבודה.
        </div>
      </CardContent>
    </Card>
  )
}

// Custom memo comparison function
const arePropsEqual = (prevProps: ProfessionalTabProps, nextProps: ProfessionalTabProps) => {
  // Only re-render if the professional ID changes
  const isEqual = prevProps.professional._id === nextProps.professional._id
  
  if (!isEqual) {
    console.log('🔥 TRACE: ProfessionalWorkAreasTab memo - props changed', {
      prevId: prevProps.professional._id,
      nextId: nextProps.professional._id,
      timestamp: new Date().toISOString()
    })
  }
  
  return isEqual
}

export default memo(ProfessionalWorkAreasTab, arePropsEqual) 