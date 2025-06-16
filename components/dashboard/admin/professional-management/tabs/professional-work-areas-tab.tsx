"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { MapPin, Plus, Edit, Trash2, Navigation } from "lucide-react"

interface WorkArea {
  cityId: string
  cityName: string
  distanceRadius: string
  coveredCities: string[]
}

interface Professional {
  _id: string
  workAreas: WorkArea[]
}

interface ProfessionalWorkAreasTabProps {
  professional: Professional
  onUpdate: (professional: Professional) => void
}

export default function ProfessionalWorkAreasTab({
  professional,
  onUpdate
}: ProfessionalWorkAreasTabProps) {
  const { t, dir } = useTranslation()
  const [loading, setLoading] = useState(false)

  const getDistanceLabel = (radius: string) => {
    const labels: Record<string, string> = {
      "20km": "20 ק\"מ",
      "40km": "40 ק\"מ", 
      "60km": "60 ק\"מ",
      "80km": "80 ק\"מ",
      "unlimited": "ללא הגבלה"
    }
    return labels[radius] || radius
  }

  const getDistanceColor = (radius: string) => {
    const colors: Record<string, string> = {
      "20km": "bg-green-100 text-green-800",
      "40km": "bg-blue-100 text-blue-800",
      "60km": "bg-yellow-100 text-yellow-800", 
      "80km": "bg-orange-100 text-orange-800",
      "unlimited": "bg-purple-100 text-purple-800"
    }
    return colors[radius] || "bg-gray-100 text-gray-800"
  }

  const handleAddWorkArea = () => {
    // TODO: Implement add work area functionality
    console.log("Add work area clicked")
  }

  const handleEditWorkArea = (cityId: string) => {
    // TODO: Implement edit work area functionality
    console.log("Edit work area:", cityId)
  }

  const handleRemoveWorkArea = (cityId: string) => {
    // TODO: Implement remove work area functionality
    console.log("Remove work area:", cityId)
  }

  const totalCoveredCities = professional.workAreas.reduce(
    (total, area) => total + area.coveredCities.length + 1, // +1 for the main city
    0
  )

  return (
    <div className="space-y-6" dir={dir}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              איזורי פעילות
            </CardTitle>
            <Button onClick={handleAddWorkArea} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              הוסף איזור
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {professional.workAreas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">אין איזורי פעילות מוגדרים</h3>
              <p className="text-sm mb-4">המטפל עדיין לא הגדיר איזורי פעילות</p>
              <Button onClick={handleAddWorkArea} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                הוסף איזור ראשון
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  סה"כ {professional.workAreas.length} איזורי פעילות
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>עיר מרכזית</TableHead>
                    <TableHead>טווח פעילות</TableHead>
                    <TableHead>ערים מכוסות</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professional.workAreas.map((area) => (
                    <TableRow key={area.cityId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="font-medium">{area.cityName}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {area.cityId}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDistanceColor(area.distanceRadius)}>
                          {getDistanceLabel(area.distanceRadius)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {area.coveredCities.length + 1} ערים
                          </div>
                          {area.coveredCities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {area.coveredCities.slice(0, 3).map((city, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {city}
                                </Badge>
                              ))}
                              {area.coveredCities.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{area.coveredCities.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditWorkArea(area.cityId)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveWorkArea(area.cityId)}
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

      {/* Work Areas Statistics */}
      {professional.workAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>סטטיסטיקות איזורי פעילות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {professional.workAreas.length}
                </div>
                <div className="text-sm text-blue-600">איזורי פעילות</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {totalCoveredCities}
                </div>
                <div className="text-sm text-green-600">סה"כ ערים מכוסות</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {professional.workAreas.filter(area => area.distanceRadius === "unlimited").length}
                </div>
                <div className="text-sm text-purple-600">איזורים ללא הגבלה</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Details */}
      {professional.workAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>פירוט כיסוי גיאוגרפי</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {professional.workAreas.map((area) => (
                <div key={area.cityId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{area.cityName}</span>
                    </div>
                    <Badge className={getDistanceColor(area.distanceRadius)}>
                      {getDistanceLabel(area.distanceRadius)}
                    </Badge>
                  </div>
                  
                  {area.coveredCities.length > 0 ? (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">
                        ערים נוספות בטווח:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {area.coveredCities.map((city, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {city}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      אין ערים נוספות בטווח
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 