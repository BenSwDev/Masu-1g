"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Button } from "@/components/common/ui/button"
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
  const [selectedCities, setSelectedCities] = useState<string[]>([])
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
          // Set selected cities based on professional's current work areas
          const currentCityIds = professional?.workAreas?.map((area: any) => area.cityId || area._id) || []
          setSelectedCities(currentCityIds)
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
  }, [professional, toast])

  const handleCityToggle = (cityId: string, checked: boolean) => {
    setSelectedCities(prev => {
      if (checked) {
        return [...prev, cityId]
      } else {
        return prev.filter(id => id !== cityId)
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update professional's work areas
      const updatedProfessional = {
        ...professional,
        workAreas: selectedCities.map(cityId => {
          const city = allCities.find(c => c._id === cityId)
          return {
            cityId,
            cityName: city?.name
          }
        })
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
              <div className="text-sm text-muted-foreground mb-4">
                בחר את הערים בהן המטפל יכול לפעול ({selectedCities.length} נבחרו)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allCities.map((city) => (
                  <div 
                    key={city._id}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={city._id}
                      checked={selectedCities.includes(city._id)}
                      onCheckedChange={(checked) => 
                        handleCityToggle(city._id, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={city._id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 text-right"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {city.name}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              
              {selectedCities.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">איזורי פעילות נבחרים:</h4>
                  <div className="text-sm text-green-700">
                    {selectedCities.map(cityId => {
                      const city = allCities.find(c => c._id === cityId)
                      return city?.name
                    }).join(', ')}
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