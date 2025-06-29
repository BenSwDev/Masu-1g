"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { MapPin, Plus, Trash2, Save, Loader2, AlertTriangle } from "lucide-react"
import { updateProfessionalWorkAreas } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { Professional } from "@/lib/types/professional"

interface City {
  _id: string
  name: string
  region?: string
}

interface WorkArea {
  cityId: string
  cityName: string
  distanceRadius: "20km" | "40km" | "60km" | "80km" | "unlimited"
  coveredCities: string[]
}

interface ProfessionalWorkAreasTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
  disabled?: boolean
}

export default function ProfessionalWorkAreasTab({
  professional,
  onUpdate,
  disabled = false
}: ProfessionalWorkAreasTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [workAreas, setWorkAreas] = useState<WorkArea[]>(professional.workAreas || [])
  const [availableCities, setAvailableCities] = useState<City[]>([])
  const [loadingCities, setLoadingCities] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load available cities
  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await fetch('/api/cities')
        if (response.ok) {
          const data = await response.json()
          setAvailableCities(data.cities || [])
        } else {
          throw new Error('Failed to fetch cities')
        }
      } catch (error) {
        console.error("Error loading cities:", error)
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "שגיאה בטעינת רשימת הערים"
        })
      } finally {
        setLoadingCities(false)
      }
    }

    loadCities()
  }, [toast])

  const handleAddWorkArea = () => {
    const newWorkArea: WorkArea = {
      cityId: "",
      cityName: "",
      distanceRadius: "20km",
      coveredCities: []
    }
    setWorkAreas(prev => [...prev, newWorkArea])
    setHasChanges(true)
  }

  const handleRemoveWorkArea = (index: number) => {
    setWorkAreas(prev => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleWorkAreaChange = (index: number, field: keyof WorkArea, value: string) => {
    setWorkAreas(prev => prev.map((workArea, i) => {
      if (i === index) {
        const updated = { ...workArea, [field]: value }
        
        // If city changed, also update the name
        if (field === 'cityId') {
          const selectedCity = availableCities.find(c => c._id === value)
          updated.cityName = selectedCity?.name || ""
        }
        
        return updated
      }
      return workArea
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    // Validate work areas
    const validWorkAreas = workAreas.filter(w => w.cityId && w.cityName)

    if (validWorkAreas.length === 0) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נא להוסיף לפחות איזור עבודה אחד תקין"
      })
      return
    }

    setSaving(true)
    
    try {
      const result = await updateProfessionalWorkAreas(professional._id, validWorkAreas as any)

      if (result.success && result.professional) {
        // Update local state with the response from server (includes covered cities)
        const updatedWorkAreas = (result.professional.workAreas || []).map(w => ({
          cityId: w.cityId?.toString() || '',
          cityName: w.cityName || '',
          distanceRadius: w.distanceRadius,
          coveredCities: w.coveredCities || []
        }))
        
        setWorkAreas(updatedWorkAreas)
        onUpdate({ workAreas: updatedWorkAreas })
        setHasChanges(false)
        
        toast({
          title: "נשמר בהצלחה",
          description: `איזורי העבודה נשמרו בהצלחה. כיסוי: ${getAllCoveredCities(updatedWorkAreas).length} ערים`
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בשמירת איזורי העבודה"
        })
      }
    } catch (error) {
      console.error("Error saving work areas:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בשמירת איזורי העבודה"
      })
    } finally {
      setSaving(false)
    }
  }

  const isValidWorkArea = (workArea: WorkArea) => {
    return workArea.cityId && workArea.cityName
  }

  const getDistanceRadiusText = (radius: string) => {
    switch (radius) {
      case "20km": return "20 ק\"מ"
      case "40km": return "40 ק\"מ"
      case "60km": return "60 ק\"מ"
      case "80km": return "80 ק\"מ"
      case "unlimited": return "ללא הגבלה"
      default: return radius
    }
  }

  const getAllCoveredCities = (areas: WorkArea[]) => {
    const allCities = new Set<string>()
    areas.filter(isValidWorkArea).forEach(area => {
      if (area.coveredCities && area.coveredCities.length > 0) {
        area.coveredCities.forEach(city => allCities.add(city))
      } else {
        allCities.add(area.cityName)
      }
    })
    return Array.from(allCities).sort()
  }

  if (disabled) {
    return (
      <div className="p-6 space-y-6" dir={dir}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            יש ליצור את המטפל תחילה לפני הגדרת איזורי העבודה
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loadingCities) {
    return (
      <div className="p-6 space-y-6" dir={dir}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const validWorkAreas = workAreas.filter(isValidWorkArea)
  const allCoveredCities = getAllCoveredCities(workAreas)

  return (
    <div className="p-6 space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <h3 className="text-lg font-semibold">איזורי פעילות</h3>
          <Badge variant="secondary">{validWorkAreas.length} איזורים</Badge>
          {allCoveredCities.length > 0 && (
            <Badge variant="outline">{allCoveredCities.length} ערים מכוסות</Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleAddWorkArea}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            הוסף איזור
          </Button>
          
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          )}
        </div>
      </div>

      {/* Work Areas List */}
      {workAreas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">אין איזורי פעילות מוגדרים</h3>
            <p className="text-muted-foreground text-center mb-4">
              הוסף איזורי פעילות כדי שלקוחות באזורים אלה יוכלו להזמין טיפולים
            </p>
            <Button onClick={handleAddWorkArea} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              הוסף איזור ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workAreas.map((workArea, index) => {
            const isValid = isValidWorkArea(workArea)
            
            return (
              <Card key={index} className={isValid ? 'border-green-200' : 'border-orange-200'}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* City Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          עיר מרכזית *
                        </Label>
                        <Select
                          value={workArea.cityId}
                          onValueChange={(value) => handleWorkAreaChange(index, 'cityId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר עיר" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCities.map(c => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
                                {c.region && (
                                  <span className="text-muted-foreground text-xs mr-2">
                                    ({c.region})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Distance Radius */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          רדיוס פעילות
                        </Label>
                        <Select
                          value={workArea.distanceRadius}
                          onValueChange={(value) => handleWorkAreaChange(index, 'distanceRadius', value as WorkArea['distanceRadius'])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="20km">20 ק״מ</SelectItem>
                            <SelectItem value="40km">40 ק״מ</SelectItem>
                            <SelectItem value="60km">60 ק״מ</SelectItem>
                            <SelectItem value="80km">80 ק״מ</SelectItem>
                            <SelectItem value="unlimited">ללא הגבלה</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex items-center">
                      <Button
                        onClick={() => handleRemoveWorkArea(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Covered Cities Display */}
                  {isValid && workArea.coveredCities && workArea.coveredCities.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground mb-2">
                        ערים מכוסות ({workArea.coveredCities.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {workArea.coveredCities.slice(0, 10).map((city, cityIndex) => (
                          <Badge 
                            key={cityIndex} 
                            variant={city === workArea.cityName ? "default" : "outline"} 
                            className="text-xs"
                          >
                            {city}
                            {city === workArea.cityName && " (מרכזית)"}
                          </Badge>
                        ))}
                        {workArea.coveredCities.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{workArea.coveredCities.length - 10} נוספות
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {workAreas.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">סיכום:</span>
                <div className="flex gap-4">
                  <span className="text-green-600">
                    {validWorkAreas.length} איזורים תקינים
                  </span>
                  {workAreas.length > validWorkAreas.length && (
                    <span className="text-orange-600">
                      {workAreas.length - validWorkAreas.length} חסרים
                    </span>
                  )}
                </div>
              </div>
              
              {validWorkAreas.length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    נדרש לפחות איזור פעילות אחד תקין כדי שהמטפל יוכל לקבל הזמנות
                  </AlertDescription>
                </Alert>
              )}

              {allCoveredCities.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">
                    סה"כ ערים מכוסות: {allCoveredCities.length}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allCoveredCities.slice(0, 15).map((city, index) => {
                      const isMainCity = validWorkAreas.some(area => area.cityName === city)
                      return (
                        <Badge 
                          key={index} 
                          variant={isMainCity ? "default" : "outline"} 
                          className="text-xs"
                        >
                          {city}
                          {isMainCity && " ⭐"}
                        </Badge>
                      )
                    })}
                    {allCoveredCities.length > 15 && (
                      <Badge variant="outline" className="text-xs">
                        +{allCoveredCities.length - 15} נוספות
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
