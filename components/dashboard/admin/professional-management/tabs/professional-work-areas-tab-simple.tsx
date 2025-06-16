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
import { useToast } from "@/components/common/ui/use-toast"
import { MapPin, Save, Loader2 } from "lucide-react"

interface City {
  _id: string
  name: string
  isActive: boolean
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
  const [selectedCityId, setSelectedCityId] = useState<string>(
    professional?.workAreas?.[0]?.cityId || ""
  )
  const [distanceRadius, setDistanceRadius] = useState<string>(
    professional?.workAreas?.[0]?.distanceRadius || "20km"
  )
  const [coveredCities, setCoveredCities] = useState<string[]>(
    professional?.workAreas?.[0]?.coveredCities || []
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
          if (!selectedCityId && data.cities.length > 0) {
            setSelectedCityId(data.cities[0]._id)
          }
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
  }, [professional, toast, selectedCityId])

  // Load covered cities when selection changes
  useEffect(() => {
    const fetchCovered = async () => {
      if (!selectedCityId) return
      try {
        const city = allCities.find(c => c._id === selectedCityId)
        if (!city) return
        const params = new URLSearchParams({
          cityName: city.name,
          distanceRadius
        })
        const res = await fetch(`/api/cities/coverage?${params.toString()}`)
        const data = await res.json()
        if (data.success) {
          setCoveredCities(data.cities || [])
        } else {
          setCoveredCities([])
        }
      } catch (err) {
        console.error('Error fetching covered cities:', err)
        setCoveredCities([])
      }
    }

    fetchCovered()
  }, [selectedCityId, distanceRadius, allCities])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update professional's work areas
      const city = allCities.find(c => c._id === selectedCityId)
      const updatedAreas = [
        {
          cityId: selectedCityId,
          cityName: city?.name,
          distanceRadius,
          coveredCities
        }
      ]

      if (professional?._id) {
        const { updateProfessionalWorkAreas } = await import("@/actions/professional-actions")
        const result = await updateProfessionalWorkAreas(professional._id, updatedAreas)
        if (!result.success) {
          throw new Error(result.error || "Failed to update work areas")
        }
      }

      const updatedProfessional = {
        ...professional,
        workAreas: updatedAreas
      }

      onUpdate(updatedProfessional)
      
      toast({
        title: "הצלחה",
        description: "איזורי הפעילות עודכנו בהצלחה"
      })
    } catch (error) {
      console.error('Error saving work areas:', error)
      toast({
        variant: "destructive",
        title: "שגיאה", 
        description: "שגיאה בשמירת איזורי הפעילות"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="mr-2">טוען ערים...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              בחירת איזורי פעילות
            </CardTitle>
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
              שמור
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allCities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">אין ערים במערכת</h3>
              <p className="text-sm">צריך להוסיף ערים במערכת קודם</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">עיר מוצא</label>
                  <Select value={selectedCityId} onValueChange={setSelectedCityId}>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium block">טווח פעילות</label>
                  <Select value={distanceRadius} onValueChange={setDistanceRadius}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר טווח" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20km">20 ק"מ</SelectItem>
                      <SelectItem value="40km">40 ק"מ</SelectItem>
                      <SelectItem value="60km">60 ק"מ</SelectItem>
                      <SelectItem value="80km">80 ק"מ</SelectItem>
                      <SelectItem value="unlimited">ללא הגבלה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {coveredCities.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">ערים מכוסות:</h4>
                  <div className="text-sm text-green-700 flex flex-wrap gap-2">
                    {[allCities.find(c => c._id === selectedCityId)?.name, ...coveredCities].map((city, idx) => (
                      <span key={idx}>{city}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
