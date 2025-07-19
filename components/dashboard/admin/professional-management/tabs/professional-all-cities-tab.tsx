"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Input } from "@/components/common/ui/input"
import { 
  MapPin, 
  Search, 
  CheckCircle2, 
  Globe,
  Users,
  Target,
  Building,
  X
} from "lucide-react"
import type { ProfessionalTabProps } from "@/lib/types/professional"

interface CityInfo {
  name: string
  fromArea: string
  radius: string
  isMainCity: boolean
}

function ProfessionalAllCitiesTab({
  professional,
  onUpdate,
  loading = false
}: ProfessionalTabProps) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState("")

  // חישוב כל הערים מכל האזורים ללא כפילות
  const allCitiesInfo = useMemo(() => {
    const citiesMap = new Map<string, CityInfo>()
    
    if (!professional.workAreas || professional.workAreas.length === 0) {
      return []
    }

    professional.workAreas.forEach(area => {
      const radius = getDistanceLabel(area.distanceRadius)
      
      // הוסף את העיר הראשית
      if (area.cityName) {
        citiesMap.set(area.cityName, {
          name: area.cityName,
          fromArea: area.cityName,
          radius,
          isMainCity: true
        })
      }
      
      // הוסף את הערים המכוסות
      if (area.coveredCities && area.coveredCities.length > 0) {
        area.coveredCities.forEach(cityName => {
          if (!citiesMap.has(cityName)) {
            citiesMap.set(cityName, {
              name: cityName,
              fromArea: area.cityName || "",
              radius,
              isMainCity: cityName === area.cityName
            })
          }
        })
      }
    })

    return Array.from(citiesMap.values()).sort((a, b) => {
      // מיין קודם לפי עיר ראשית, אחר כך לפי שם
      if (a.isMainCity && !b.isMainCity) return -1
      if (!a.isMainCity && b.isMainCity) return 1
      return a.name.localeCompare(b.name, 'he')
    })
  }, [professional.workAreas])

  // סינון ערים לפי חיפוש
  const filteredCities = useMemo(() => {
    if (!searchTerm.trim()) return allCitiesInfo
    
    const searchLower = searchTerm.toLowerCase().trim()
    return allCitiesInfo.filter(city => 
      city.name.toLowerCase().includes(searchLower) ||
      city.fromArea.toLowerCase().includes(searchLower)
    )
  }, [allCitiesInfo, searchTerm])

  // פונקציה לתצוגת רדיוס
  function getDistanceLabel(distance: string) {
    switch (distance) {
      case '20km': return '20 ק"מ'
      case '40km': return '40 ק"מ'
      case '60km': return '60 ק"מ'
      case '80km': return '80 ק"מ'
      case 'unlimited': return 'כל מרחק'
      default: return distance
    }
  }

  // סטטיסטיקות
  const stats = useMemo(() => {
    const mainCities = allCitiesInfo.filter(city => city.isMainCity).length
    const coveredCities = allCitiesInfo.filter(city => !city.isMainCity).length
    const totalAreas = professional.workAreas?.length || 0
    
    return {
      totalCities: allCitiesInfo.length,
      mainCities,
      coveredCities,
      totalAreas
    }
  }, [allCitiesInfo, professional.workAreas])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* כותרת וסטטיסטיקות */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">כל הערים הזמינות לטיפול</h3>
              <p className="text-sm text-muted-foreground">
                רשימה מאוחדת של כל הערים שהמטפל יכול לעבוד בהן
              </p>
            </div>
          </div>
        </div>

        {/* סטטיסטיקות */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-700">{stats.totalCities}</div>
                  <div className="text-xs text-blue-600">סה"כ ערים</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-700">{stats.mainCities}</div>
                  <div className="text-xs text-green-600">ערים ראשיות</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-700">{stats.coveredCities}</div>
                  <div className="text-xs text-purple-600">ערים מכוסות</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-orange-700">{stats.totalAreas}</div>
                  <div className="text-xs text-orange-600">אזורי פעילות</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* חיפוש */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש עיר..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchTerm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* רשימת ערים */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>רשימת ערים מלאה</span>
            <Badge variant="outline">
              {filteredCities.length} מתוך {allCitiesInfo.length} ערים
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>לא נמצאו ערים התואמות לחיפוש "{searchTerm}"</p>
                </>
              ) : (
                <>
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>לא הוגדרו אזורי פעילות עדיין</p>
                  <p className="text-sm mt-2">גש לטאב "איזורי פעילות" כדי להגדיר אזורים</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCities.map((city, index) => (
                <div
                  key={`${city.name}-${city.fromArea}-${index}`}
                  className={`p-3 rounded-lg border ${
                    city.isMainCity
                      ? "bg-green-50 border-green-200 shadow-sm"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {city.isMainCity ? (
                        <Building className="h-4 w-4 text-green-600" />
                      ) : (
                        <MapPin className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="font-medium text-sm">
                        {city.name}
                      </span>
                    </div>
                    {city.isMainCity && (
                      <Badge variant="secondary" className="text-xs">
                        עיר ראשית
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>מאזור: {city.fromArea}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      <span>רדיוס: {city.radius}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* הסבר נוסף */}
      {allCitiesInfo.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">הסבר על רשימת הערים:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>ערים ראשיות</strong> - הערים המרכזיות של אזורי הפעילות</li>
                  <li>• <strong>ערים מכוסות</strong> - ערים נוספות ברדיוס שהוגדר לכל אזור</li>
                  <li>• <strong>חישוב אוטומטי</strong> - המרחקים מחושבים לפי קווי אורך ורוחב (LAT/LONG)</li>
                  <li>• <strong>ללא כפילות</strong> - כל עיר מופיעה פעם אחת גם אם נכללת במספר אזורים</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ProfessionalAllCitiesTab 