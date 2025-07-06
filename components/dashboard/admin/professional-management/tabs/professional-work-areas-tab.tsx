"use client"

import { useState, useEffect, memo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Label } from "@/components/common/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/common/ui/dialog"
import { useToast } from "@/components/common/ui/use-toast"
import { MapPin, Plus, Edit, Trash2, Target, Globe, CheckCircle, Loader2 } from "lucide-react"
import type { ProfessionalTabProps } from "@/lib/types/professional"
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
  distanceRadius: "20km" | "40km" | "60km" | "80km" | "unlimited"
  coveredCities: string[]
}

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
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([])
  const [loadingCities, setLoadingCities] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAreaIndex, setEditingAreaIndex] = useState<number | null>(null)
  const [newWorkArea, setNewWorkArea] = useState<Partial<WorkArea>>({
    cityId: '',
    cityName: '',
    distanceRadius: '20km',
    coveredCities: []
  })
  const [loadingCoverage, setLoadingCoverage] = useState(false)

  // Load cities
  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoadingCities(true)
        const response = await fetch('/api/cities')
        const data = await response.json()
        
        if (data.success) {
          setCities(data.cities)
        } else {
          toast({
            title: "שגיאה",
            description: "לא ניתן לטעון את רשימת הערים",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error loading cities:', error)
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את רשימת הערים",
          variant: "destructive"
        })
      } finally {
        setLoadingCities(false)
      }
    }

    loadCities()
  }, [toast])

  // Initialize professional's work areas
  useEffect(() => {
    if (professional?.workAreas) {
      const areas = professional.workAreas.map(area => ({
        cityId: area.cityId?.toString() || '',
        cityName: area.cityName || '',
        distanceRadius: area.distanceRadius || '20km',
        coveredCities: area.coveredCities || []
      }))
      setWorkAreas(areas)
    }
  }, [professional])

  const getDistanceLabel = (distance: string) => {
    switch (distance) {
      case '20km': return '20 ק"מ'
      case '40km': return '40 ק"מ'
      case '60km': return '60 ק"מ'
      case '80km': return '80 ק"מ'
      case 'unlimited': return 'כל מרחק'
      default: return distance
    }
  }

  const calculateCoverage = async (cityName: string, distanceRadius: string) => {
    if (!cityName || !distanceRadius) return []
    
    try {
      setLoadingCoverage(true)
      const response = await fetch('/api/cities/coverage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityName,
          distanceRadius
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        return data.coveredCities || []
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לחשב כיסוי ערים",
          variant: "destructive"
        })
        return []
      }
    } catch (error) {
      console.error('Error calculating coverage:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לחשב כיסוי ערים",
        variant: "destructive"
      })
      return []
    } finally {
      setLoadingCoverage(false)
    }
  }

  const handleAddWorkArea = async () => {
    if (!newWorkArea.cityId || !newWorkArea.cityName || !newWorkArea.distanceRadius) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות",
        variant: "destructive"
      })
      return
    }

    // Check if city already exists
    const existingArea = workAreas.find(area => area.cityId === newWorkArea.cityId)
    if (existingArea) {
      toast({
        title: "שגיאה",
        description: "העיר כבר קיימת ברשימת איזורי הפעילות",
        variant: "destructive"
      })
      return
    }

    // Calculate coverage
    const coveredCities = await calculateCoverage(
      newWorkArea.cityName!,
      newWorkArea.distanceRadius!
    )

    const workArea: WorkArea = {
      cityId: newWorkArea.cityId!,
      cityName: newWorkArea.cityName!,
      distanceRadius: newWorkArea.distanceRadius as any,
      coveredCities
    }

    setWorkAreas(prev => [...prev, workArea])
    setNewWorkArea({
      cityId: '',
      cityName: '',
      distanceRadius: '20km',
      coveredCities: []
    })
    setIsAddModalOpen(false)
    
    toast({
      title: "נוסף בהצלחה",
      description: `איזור פעילות נוסף: ${workArea.cityName}`,
      variant: "default"
    })
  }

  const handleEditWorkArea = async (index: number) => {
    const area = workAreas[index]
    if (!area) return

    // Calculate updated coverage
    const coveredCities = await calculateCoverage(area.cityName, area.distanceRadius)

    const updatedAreas = [...workAreas]
    updatedAreas[index] = {
      ...area,
      coveredCities
    }

    setWorkAreas(updatedAreas)
    setEditingAreaIndex(null)
    setIsEditModalOpen(false)
    
    toast({
      title: "עודכן בהצלחה",
      description: `איזור פעילות עודכן: ${area.cityName}`,
      variant: "default"
    })
  }

  const handleRemoveWorkArea = (index: number) => {
    const area = workAreas[index]
    setWorkAreas(prev => prev.filter((_, i) => i !== index))
    
    toast({
      title: "הוסר בהצלחה",
      description: `איזור פעילות הוסר: ${area.cityName}`,
      variant: "default"
    })
  }

  const handleDistanceChange = (index: number, newDistance: string) => {
    const updatedAreas = [...workAreas]
    updatedAreas[index] = {
      ...updatedAreas[index],
      distanceRadius: newDistance as any
    }
    setWorkAreas(updatedAreas)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Convert work areas to the format expected by the backend
      const areasToSave = workAreas.map(area => ({
        cityId: area.cityId, // Function expects string and will convert internally
        cityName: area.cityName,
        distanceRadius: area.distanceRadius,
        coveredCities: area.coveredCities
      }))

      // Call the specific action instead of generic onUpdate
      const result = await updateProfessionalWorkAreas(professional._id, areasToSave as any)
      
      if (result.success) {
        // The professional has been updated in the database
        // The parent component will refresh automatically
        
        toast({
          title: "נשמר בהצלחה",
          description: "איזורי הפעילות נשמרו בהצלחה",
          variant: "default"
        })
      } else {
        throw new Error(result.error || "שגיאה בשמירת איזורי הפעילות")
      }
    } catch (error) {
      console.error('Error saving work areas:', error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "לא ניתן לשמור את איזורי הפעילות",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCitySelect = (cityId: string) => {
    const selectedCity = cities.find(c => c._id === cityId)
    if (selectedCity) {
      setNewWorkArea(prev => ({
        ...prev,
        cityId: cityId,
        cityName: selectedCity.name
      }))
    }
  }

  if (loadingCities) {
    return (
      <Card className="border-0 shadow-sm" dir={dir}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            איזורי פעילות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">טוען ערים...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm" dir={dir}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            איזורי פעילות
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-4 h-4" />
              נבחרו: {workAreas.length} איזורים
            </Badge>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף איזור
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]" dir={dir}>
                <DialogHeader>
                  <DialogTitle>הוספת איזור פעילות</DialogTitle>
                  <DialogDescription>
                    בחר עיר ומרחק פעילות עבור המטפל
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="city">עיר</Label>
                    <Select
                      value={newWorkArea.cityId}
                      onValueChange={handleCitySelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר עיר" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city._id} value={city._id}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="distance">מרחק פעילות</Label>
                    <Select
                      value={newWorkArea.distanceRadius}
                      onValueChange={(value) => setNewWorkArea(prev => ({ ...prev, distanceRadius: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר מרחק" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20km">20 ק"מ</SelectItem>
                        <SelectItem value="40km">40 ק"מ</SelectItem>
                        <SelectItem value="60km">60 ק"מ</SelectItem>
                        <SelectItem value="80km">80 ק"מ</SelectItem>
                        <SelectItem value="unlimited">כל מרחק</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    ביטול
                  </Button>
                  <Button onClick={handleAddWorkArea} disabled={loadingCoverage}>
                    {loadingCoverage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        מחשב...
                      </>
                    ) : (
                      "הוסף"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={saving} variant="default">
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
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
                key={`${area.cityId}-${index}`}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <div className="font-medium">{area.cityName}</div>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-green-600" />
                      <Select
                        value={area.distanceRadius}
                        onValueChange={(value) => handleDistanceChange(index, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20km">20 ק"מ</SelectItem>
                          <SelectItem value="40km">40 ק"מ</SelectItem>
                          <SelectItem value="60km">60 ק"מ</SelectItem>
                          <SelectItem value="80km">80 ק"מ</SelectItem>
                          <SelectItem value="unlimited">כל מרחק</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Badge variant="outline">
                      {area.coveredCities.length} ערים מכוסות
                    </Badge>
                  </div>
                  {area.coveredCities && area.coveredCities.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <strong>ערים מכוסות:</strong> {area.coveredCities.slice(0, 5).join(", ")}
                      {area.coveredCities.length > 5 && ` ועוד ${area.coveredCities.length - 5}...`}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditWorkArea(index)}
                    disabled={loadingCoverage}
                  >
                    {loadingCoverage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Edit className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveWorkArea(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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