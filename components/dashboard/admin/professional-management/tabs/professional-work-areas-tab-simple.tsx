"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { useToast } from "@/components/common/ui/use-toast"
import { MapPin, Save, Loader2, Plus, X } from "lucide-react"
import { updateProfessionalWorkAreas } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"

interface City {
  _id: string
  name: string
  isActive: boolean
  coordinates: {
    lat: number
    lng: number
  }
}

interface WorkArea {
  cityId: string
  cityName: string
  distanceRadius: string
  coveredCities: string[]
}

interface ProfessionalWorkAreasTabProps {
  professional: any
  onUpdate: (professional: any) => void
}

export default function ProfessionalWorkAreasTab({
  professional,
  onUpdate
}: ProfessionalWorkAreasTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [allCities, setAllCities] = useState<City[]>([])
  const [workAreas, setWorkAreas] = useState<WorkArea[]>(
    professional?.workAreas?.map((area: any) => ({
      cityId: area.cityId || "",
      cityName: area.cityName || "",
      distanceRadius: area.distanceRadius || "20km",
      coveredCities: area.coveredCities || []
    })) || []
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load all cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch('/api/cities')
        const data = await response.json()

        if (data.success) {
          setAllCities(data.cities || [])
        } else {
          toast({
            variant: "destructive",
            title: "שגיאה",
            description: "שגיאה בטעינת רשימת הערים"
          })
        }
      } catch (error) {
        console.error('Error fetching cities:', error)
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "שגיאה בטעינת רשימת הערים"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [toast])

  // Update covered cities when work area changes
  const updateCoveredCities = async (workAreaIndex: number) => {
    const workArea = workAreas[workAreaIndex]
    if (!workArea.cityName || !workArea.distanceRadius) return

    try {
      const params = new URLSearchParams({
        cityName: workArea.cityName,
        distanceRadius: workArea.distanceRadius
      })
      
      const response = await fetch(`/api/cities/coverage?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        const updatedWorkAreas = [...workAreas]
        updatedWorkAreas[workAreaIndex].coveredCities = data.cities || []
        setWorkAreas(updatedWorkAreas)
      }
    } catch (error) {
      console.error('Error fetching covered cities:', error)
    }
  }

  // Add new work area
  const addWorkArea = () => {
    setWorkAreas([...workAreas, {
      cityId: "",
      cityName: "",
      distanceRadius: "20km",
      coveredCities: []
    }])
  }

  // Remove work area
  const removeWorkArea = (index: number) => {
    const updated = workAreas.filter((_, i) => i !== index)
    setWorkAreas(updated)
  }

  // Update work area city
  const updateWorkAreaCity = (index: number, cityId: string) => {
    const city = allCities.find(c => c._id === cityId)
    if (!city) return

    const updated = [...workAreas]
    updated[index].cityId = cityId
    updated[index].cityName = city.name
    setWorkAreas(updated)

    // Update covered cities
    updateCoveredCities(index)
  }

  // Update work area distance radius
  const updateWorkAreaRadius = (index: number, radius: string) => {
    const updated = [...workAreas]
    updated[index].distanceRadius = radius
    setWorkAreas(updated)

    // Update covered cities
    updateCoveredCities(index)
  }

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate work areas
      const validWorkAreas = workAreas.filter(area => 
        area.cityId && area.cityName && area.distanceRadius
      )

      if (validWorkAreas.length === 0) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "יש להגדיר לפחות איזור עבודה אחד"
        })
        return
      }

      const result = await updateProfessionalWorkAreas(
        professional._id,
        validWorkAreas
      )

      if (result.success) {
        toast({
          title: "הצלחה",
          description: "איזורי העבודה עודכנו בהצלחה"
        })

        // Update parent component
        onUpdate({
          ...professional,
          workAreas: validWorkAreas
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "שגיאה בעדכון איזורי העבודה"
        })
      }
    } catch (error) {
      console.error('Error saving work areas:', error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בשמירת השינויים"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card dir={dir}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            איזורי עבודה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card dir={dir}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          איזורי עבודה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {workAreas.map((workArea, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">איזור עבודה {index + 1}</h4>
                {workAreas.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWorkArea(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    עיר מרכזית
                  </label>
                  <Select
                    value={workArea.cityId}
                    onValueChange={(value) => updateWorkAreaCity(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר עיר" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCities.map((city) => (
                        <SelectItem key={city._id} value={city._id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    טווח פעילות
                  </label>
                  <Select
                    value={workArea.distanceRadius}
                    onValueChange={(value) => updateWorkAreaRadius(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20km">עד 20 ק״מ</SelectItem>
                      <SelectItem value="40km">עד 40 ק״מ</SelectItem>
                      <SelectItem value="60km">עד 60 ק״מ</SelectItem>
                      <SelectItem value="80km">עד 80 ק״מ</SelectItem>
                      <SelectItem value="unlimited">ללא הגבלה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {workArea.coveredCities.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ערים מכוסות ({workArea.coveredCities.length + 1} ערים כולל {workArea.cityName})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{workArea.cityName}</Badge>
                    {workArea.coveredCities.slice(0, 10).map((city, cityIndex) => (
                      <Badge key={cityIndex} variant="secondary">
                        {city}
                      </Badge>
                    ))}
                    {workArea.coveredCities.length > 10 && (
                      <Badge variant="outline">
                        +{workArea.coveredCities.length - 10} נוספות
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={addWorkArea}
            disabled={workAreas.length >= 3} // Limit to 3 work areas
          >
            <Plus className="h-4 w-4 mr-2" />
            הוסף איזור עבודה
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            שמור שינויים
          </Button>
        </div>

        {workAreas.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">סיכום איזורי עבודה</h4>
            <div className="text-sm text-muted-foreground">
              <p>
                סה״כ ערים מכוסות: {' '}
                {workAreas.reduce((total, area) => 
                  total + area.coveredCities.length + 1, 0
                )} ערים
              </p>
              <p>
                איזורי עבודה פעילים: {workAreas.filter(area => 
                  area.cityId && area.cityName
                ).length}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
