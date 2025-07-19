"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/common/ui/dialog"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  Globe, 
  CheckCircle, 
  Loader2,
  AlertTriangle,
  Building,
  Users,
  X,
  Save
} from "lucide-react"
import { useRouter } from "next/navigation"

interface City {
  _id: string
  name: string
  isActive: boolean
  coordinates?: {
    lat: number
    lng: number
  }
}

interface WorkArea {
  cityId?: string
  cityName: string
  distanceRadius: "20km" | "40km" | "60km" | "80km" | "unlimited"
  coveredCities?: string[]
}

interface ProfessionalWorkAreasClientProps {
  professional: {
    _id: string
    userId: string
    workAreas?: WorkArea[]
    status: string
    isActive: boolean
  }
}

export default function ProfessionalWorkAreasClient({ professional }: ProfessionalWorkAreasClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  
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
    if (!newWorkArea.cityName || !newWorkArea.distanceRadius) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות הנדרשים",
        variant: "destructive"
      })
      return
    }

    // Calculate covered cities
    const coveredCities = await calculateCoverage(
      newWorkArea.cityName,
      newWorkArea.distanceRadius
    )

    const areaToAdd: WorkArea = {
      cityId: newWorkArea.cityId || '',
      cityName: newWorkArea.cityName,
      distanceRadius: newWorkArea.distanceRadius,
      coveredCities
    }

    setWorkAreas(prev => [...prev, areaToAdd])
    setNewWorkArea({
      cityId: '',
      cityName: '',
      distanceRadius: '20km',
      coveredCities: []
    })
    setIsAddModalOpen(false)

    toast({
      title: "אזור נוסף",
      description: `אזור פעילות ${newWorkArea.cityName} נוסף בהצלחה`,
    })
  }

  const handleEditWorkArea = (index: number) => {
    const area = workAreas[index]
    setNewWorkArea({
      cityId: area.cityId,
      cityName: area.cityName,
      distanceRadius: area.distanceRadius,
      coveredCities: area.coveredCities
    })
    setEditingAreaIndex(index)
    setIsEditModalOpen(true)
  }

  const handleUpdateWorkArea = async () => {
    if (editingAreaIndex === null || !newWorkArea.cityName || !newWorkArea.distanceRadius) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות הנדרשים",
        variant: "destructive"
      })
      return
    }

    // Calculate covered cities
    const coveredCities = await calculateCoverage(
      newWorkArea.cityName,
      newWorkArea.distanceRadius
    )

    const updatedArea: WorkArea = {
      cityId: newWorkArea.cityId || '',
      cityName: newWorkArea.cityName,
      distanceRadius: newWorkArea.distanceRadius,
      coveredCities
    }

    setWorkAreas(prev => 
      prev.map((area, index) => 
        index === editingAreaIndex ? updatedArea : area
      )
    )

    setNewWorkArea({
      cityId: '',
      cityName: '',
      distanceRadius: '20km',
      coveredCities: []
    })
    setEditingAreaIndex(null)
    setIsEditModalOpen(false)

    toast({
      title: "אזור עודכן",
      description: `אזור פעילות ${updatedArea.cityName} עודכן בהצלחה`,
    })
  }

  const handleDeleteWorkArea = (index: number) => {
    const area = workAreas[index]
    setWorkAreas(prev => prev.filter((_, i) => i !== index))
    
    toast({
      title: "אזור נמחק",
      description: `אזור פעילות ${area.cityName} נמחק`,
    })
  }

  const handleSaveChanges = async () => {
    try {
      setSaving(true)

      const response = await fetch(`/api/professional/work-areas`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professionalId: professional._id,
          workAreas: workAreas
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "נשמר בהצלחה",
          description: "איזורי הפעילות שלך נשמרו בהצלחה",
          variant: "default"
        })
        
        // Refresh the page to get updated data
        router.refresh()
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

  const handleCityChange = async (cityName: string) => {
    const city = cities.find(c => c.name === cityName)
    
    setNewWorkArea(prev => ({
      ...prev,
      cityId: city?._id || '',
      cityName: cityName,
      coveredCities: []
    }))

    // Auto-calculate coverage when city changes
    if (cityName && newWorkArea.distanceRadius) {
      const coveredCities = await calculateCoverage(cityName, newWorkArea.distanceRadius)
      setNewWorkArea(prev => ({
        ...prev,
        coveredCities
      }))
    }
  }

  const handleDistanceChange = async (distanceRadius: string) => {
    setNewWorkArea(prev => ({
      ...prev,
      distanceRadius: distanceRadius as WorkArea['distanceRadius'],
      coveredCities: []
    }))

    // Auto-calculate coverage when distance changes
    if (newWorkArea.cityName && distanceRadius) {
      const coveredCities = await calculateCoverage(newWorkArea.cityName, distanceRadius)
      setNewWorkArea(prev => ({
        ...prev,
        coveredCities
      }))
    }
  }

  // Calculate total unique cities
  const allCitiesSet = new Set<string>()
  workAreas.forEach(area => {
    if (area.coveredCities) {
      area.coveredCities.forEach(city => allCitiesSet.add(city))
    }
  })
  const totalUniqueCities = allCitiesSet.size

  if (loadingCities) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-muted-foreground">טוען נתונים...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{workAreas.length}</div>
                <div className="text-xs text-blue-600">אזורי פעילות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{totalUniqueCities}</div>
                <div className="text-xs text-green-600">ערים מכוסות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-700">{cities.length}</div>
                <div className="text-xs text-purple-600">ערים זמינות</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {!professional.isActive && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            הפרופיל שלך אינו פעיל כרגע. שינויי איזורי הפעילות יישמרו אבל לא יוצגו ללקוחות עד לאישור המנהל.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              איזורי הפעילות שלי
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" size="sm">
                    <Plus className="w-4 h-4" />
                    הוסף אזור
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>הוסף אזור פעילות חדש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">עיר מרכזית</Label>
                      <Select 
                        value={newWorkArea.cityName} 
                        onValueChange={handleCityChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר עיר" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.filter(city => city.isActive).map(city => (
                            <SelectItem key={city._id} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="distance">רדיוס פעילות</Label>
                      <Select 
                        value={newWorkArea.distanceRadius} 
                        onValueChange={handleDistanceChange}
                      >
                        <SelectTrigger>
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

                    {newWorkArea.coveredCities && newWorkArea.coveredCities.length > 0 && (
                      <div className="space-y-2">
                        <Label>ערים מכוסות ({newWorkArea.coveredCities.length})</Label>
                        <div className="p-3 bg-gray-50 rounded max-h-32 overflow-y-auto">
                          <div className="text-xs text-gray-600">
                            {newWorkArea.coveredCities.slice(0, 10).join(", ")}
                            {newWorkArea.coveredCities.length > 10 && ` ועוד ${newWorkArea.coveredCities.length - 10}...`}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddModalOpen(false)}
                      >
                        ביטול
                      </Button>
                      <Button
                        onClick={handleAddWorkArea}
                        disabled={!newWorkArea.cityName || !newWorkArea.distanceRadius || loadingCoverage}
                      >
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
                  </div>
                </DialogContent>
              </Dialog>

              {workAreas.length > 0 && (
                <Button 
                  onClick={handleSaveChanges} 
                  disabled={saving} 
                  size="sm"
                  variant="default"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      שמור שינויים
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {workAreas.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">לא הוגדרו אזורי פעילות</h3>
              <p className="text-gray-600 mb-4">הוסף את האזורים שבהם אתה מספק טיפולים</p>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                הוסף אזור ראשון
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {workAreas.map((area, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium">{area.cityName}</h4>
                          <p className="text-sm text-muted-foreground">
                            רדיוס {getDistanceLabel(area.distanceRadius)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {area.coveredCities?.length || 0} ערים מכוסות
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditWorkArea(index)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWorkArea(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {area.coveredCities && area.coveredCities.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">ערים מכוסות:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs">
                          {area.coveredCities.slice(0, 12).map((city, cityIndex) => (
                            <div
                              key={cityIndex}
                              className={`px-2 py-1 rounded text-center ${
                                city === area.cityName 
                                  ? "bg-blue-200 text-blue-900 font-medium border border-blue-300" 
                                  : "bg-white text-blue-700 border border-blue-100"
                              }`}
                            >
                              {city === area.cityName && "🏠 "}{city}
                            </div>
                          ))}
                          {area.coveredCities.length > 12 && (
                            <div className="px-2 py-1 rounded text-xs text-center bg-gray-50 text-gray-500 border border-gray-200">
                              +{area.coveredCities.length - 12} נוספות
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת אזור פעילות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">עיר מרכזית</Label>
              <Select 
                value={newWorkArea.cityName} 
                onValueChange={handleCityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר עיר" />
                </SelectTrigger>
                <SelectContent>
                  {cities.filter(city => city.isActive).map(city => (
                    <SelectItem key={city._id} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-distance">רדיוס פעילות</Label>
              <Select 
                value={newWorkArea.distanceRadius} 
                onValueChange={handleDistanceChange}
              >
                <SelectTrigger>
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

            {newWorkArea.coveredCities && newWorkArea.coveredCities.length > 0 && (
              <div className="space-y-2">
                <Label>ערים מכוסות ({newWorkArea.coveredCities.length})</Label>
                <div className="p-3 bg-gray-50 rounded max-h-32 overflow-y-auto">
                  <div className="text-xs text-gray-600">
                    {newWorkArea.coveredCities.slice(0, 10).join(", ")}
                    {newWorkArea.coveredCities.length > 10 && ` ועוד ${newWorkArea.coveredCities.length - 10}...`}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingAreaIndex(null)
                  setNewWorkArea({
                    cityId: '',
                    cityName: '',
                    distanceRadius: '20km',
                    coveredCities: []
                  })
                }}
              >
                ביטול
              </Button>
              <Button
                onClick={handleUpdateWorkArea}
                disabled={!newWorkArea.cityName || !newWorkArea.distanceRadius || loadingCoverage}
              >
                {loadingCoverage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    מחשב...
                  </>
                ) : (
                  "עדכן"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">כיצד להגדיר איזורי פעילות:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>בחר עיר מרכזית:</strong> העיר הראשית שבה אתה פועל</li>
                <li>• <strong>קבע רדיוס:</strong> המרחק המקסימלי שאתה מוכן לנסוע</li>
                <li>• <strong>ערים מכוסות:</strong> מחושב אוטומטית לפי המרחק</li>
                <li>• <strong>שמור שינויים:</strong> השינויים יופעלו לאחר אישור המנהל</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 