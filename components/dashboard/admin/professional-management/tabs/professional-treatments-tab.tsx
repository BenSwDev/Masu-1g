"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Stethoscope, Plus, Edit, Trash2 } from "lucide-react"

interface TreatmentPricing {
  treatmentId: string
  treatmentName?: string
  durationId?: string
  durationName?: string
  professionalPrice: number
}

interface Professional {
  _id: string
  treatments: TreatmentPricing[]
}

interface ProfessionalTreatmentsTabProps {
  professional: Professional
  onUpdate: (professional: Professional) => void
}

export default function ProfessionalTreatmentsTab({
  professional,
  onUpdate
}: ProfessionalTreatmentsTabProps) {
  const { t, dir } = useTranslation()
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString()}`
  }

  const handleAddTreatment = () => {
    // TODO: Implement add treatment functionality
    console.log("Add treatment clicked")
  }

  const handleEditTreatment = (treatmentId: string) => {
    // TODO: Implement edit treatment functionality
    console.log("Edit treatment:", treatmentId)
  }

  const handleRemoveTreatment = (treatmentId: string) => {
    // TODO: Implement remove treatment functionality
    console.log("Remove treatment:", treatmentId)
  }

  return (
    <div className="space-y-6" dir={dir}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              טיפולים ומחירים
            </CardTitle>
            <Button onClick={handleAddTreatment} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              הוסף טיפול
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {professional.treatments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">אין טיפולים מוגדרים</h3>
              <p className="text-sm mb-4">המטפל עדיין לא הגדיר טיפולים ומחירים</p>
              <Button onClick={handleAddTreatment} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                הוסף טיפול ראשון
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  סה"כ {professional.treatments.length} טיפולים
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם הטיפול</TableHead>
                    <TableHead>משך זמן</TableHead>
                    <TableHead>מחיר למטפל</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professional.treatments.map((treatment, index) => (
                    <TableRow key={`${treatment.treatmentId}-${treatment.durationId || 'default'}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {treatment.treatmentName || `טיפול ${index + 1}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {treatment.treatmentId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {treatment.durationName ? (
                          <Badge variant="outline">{treatment.durationName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">ברירת מחדל</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatCurrency(treatment.professionalPrice)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTreatment(treatment.treatmentId)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTreatment(treatment.treatmentId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment Statistics */}
      {professional.treatments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>סטטיסטיקות טיפולים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {professional.treatments.length}
                </div>
                <div className="text-sm text-blue-600">סה"כ טיפולים</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    Math.round(
                      professional.treatments.reduce((sum, t) => sum + t.professionalPrice, 0) / 
                      professional.treatments.length
                    )
                  )}
                </div>
                <div className="text-sm text-green-600">מחיר ממוצע</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    Math.max(...professional.treatments.map(t => t.professionalPrice))
                  )}
                </div>
                <div className="text-sm text-purple-600">מחיר מקסימלי</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 