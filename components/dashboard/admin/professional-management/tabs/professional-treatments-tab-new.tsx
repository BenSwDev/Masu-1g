"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { useToast } from "@/components/common/ui/use-toast"
import { Stethoscope, Save, Loader2, AlertTriangle, Check, Package } from "lucide-react"
import { updateProfessionalTreatments } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

interface Professional {
  _id: string
  userId: IUser
  status: ProfessionalStatus
  isActive: boolean
  treatments: Array<{
    treatmentId: string
    treatmentName?: string
  }>
  workAreas: Array<{
    cityId: string
    cityName: string
    distanceRadius: "20km" | "40km" | "60km" | "80km" | "unlimited"
    coveredCities: string[]
  }>
  bankDetails?: {
    bankName: string
    branchNumber: string
    accountNumber: string
  }
  totalEarnings: number
  pendingPayments: number
  adminNotes?: string
  rejectionReason?: string
  appliedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  lastActiveAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface TreatmentOption {
  _id: string
  name: string
  category: string
  description?: string
  defaultDurationMinutes: number
  fixedPrice?: number
}

interface CategoryData {
  name: string
  treatments: TreatmentOption[]
  selected: boolean
}

interface ProfessionalTreatmentsTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
  disabled?: boolean
}

export default function ProfessionalTreatmentsTabNew({
  professional,
  onUpdate,
  disabled = false
}: ProfessionalTreatmentsTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>(
    professional.treatments?.map(t => t.treatmentId) || []
  )
  const [loadingTreatments, setLoadingTreatments] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("")

  // Load available treatments and organize by categories
  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const response = await fetch('/api/treatments')
        if (response.ok) {
          const data = await response.json()
          const treatmentList = data.treatments || []
          
          // Group treatments by category
          const categoryMap = new Map<string, TreatmentOption[]>()
          treatmentList.forEach((treatment: TreatmentOption) => {
            if (!categoryMap.has(treatment.category)) {
              categoryMap.set(treatment.category, [])
            }
            categoryMap.get(treatment.category)!.push(treatment)
          })
          
          // Convert to CategoryData array
          const categoryData: CategoryData[] = Array.from(categoryMap.entries()).map(([categoryName, treatments]) => {
            const hasSelectedTreatments = treatments.some(t => selectedTreatments.includes(t._id))
            return {
              name: categoryName,
              treatments,
              selected: hasSelectedTreatments
            }
          })
          
          setCategories(categoryData)
          
          // Set first selected category as active
          const firstSelectedCategory = categoryData.find(c => c.selected)
          if (firstSelectedCategory) {
            setActiveCategory(firstSelectedCategory.name)
          }
        } else {
          throw new Error('Failed to fetch treatments')
        }
      } catch (error) {
        console.error("Error loading treatments:", error)
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "שגיאה בטעינת רשימת הטיפולים"
        })
      } finally {
        setLoadingTreatments(false)
      }
    }

    loadTreatments()
  }, [selectedTreatments, toast])

  const handleCategoryChange = (categoryName: string, checked: boolean) => {
    setCategories(prev => prev.map(cat => {
      if (cat.name === categoryName) {
        const updatedCategory = { ...cat, selected: checked }
        
        // If unchecking category, remove all its treatments from selection
        if (!checked) {
          const categoryTreatmentIds = cat.treatments.map(t => t._id)
          setSelectedTreatments(current => current.filter(id => !categoryTreatmentIds.includes(id)))
        }
        
        // If checking category and it's the first selected one, make it active
        if (checked && !activeCategory) {
          setActiveCategory(categoryName)
        }
        
        return updatedCategory
      }
      return cat
    }))
    setHasChanges(true)
  }

  const handleTreatmentChange = (treatmentId: string, checked: boolean) => {
    setSelectedTreatments(prev => {
      if (checked) {
        return [...prev, treatmentId]
      } else {
        return prev.filter(id => id !== treatmentId)
      }
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const treatmentsToSave = selectedTreatments.map(treatmentId => ({
        treatmentId,
        treatmentName: getAllTreatments().find(t => t._id === treatmentId)?.name || ""
      }))
      
      const result = await updateProfessionalTreatments(professional._id, treatmentsToSave)
      
      if (result.success && result.professional) {
        toast({
          title: "הצלחה",
          description: "טיפולי המטפל עודכנו בהצלחה"
        })
        
        const updatedTreatments = (result.professional.treatments || []).map(t => ({
          treatmentId: t.treatmentId?.toString() || '',
          treatmentName: (t as any).treatmentName
        }))
        
        onUpdate({ treatments: updatedTreatments })
        setHasChanges(false)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון הטיפולים"
        })
      }
    } catch (error) {
      console.error("Error saving treatments:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון הטיפולים"
      })
    } finally {
      setSaving(false)
    }
  }

  const getAllTreatments = () => {
    return categories.flatMap(cat => cat.treatments)
  }

  const getSelectedCategories = () => {
    return categories.filter(cat => cat.selected)
  }

  const getTreatmentStats = () => {
    const totalSelected = selectedTreatments.length
    const totalAvailable = getAllTreatments().length
    const selectedCategories = getSelectedCategories().length
    const totalCategories = categories.length
    
    return { totalSelected, totalAvailable, selectedCategories, totalCategories }
  }

  if (disabled) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            נא ליצור תחילה את המטפל כדי להגדיר טיפולים
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const stats = getTreatmentStats()
  const selectedCategories = getSelectedCategories()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            טיפולי המטפל
          </h3>
          <p className="text-sm text-muted-foreground">
            בחר קטגוריות טיפול ולאחר מכן בחר טיפולים ספציפיים מכל קטגוריה
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                שומר...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                שמור שינויים
              </>
            )}
          </Button>
        )}
      </div>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.selectedCategories}</div>
              <div className="text-sm text-blue-600">קטגוריות נבחרו</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalSelected}</div>
              <div className="text-sm text-green-600">טיפולים נבחרו</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.totalCategories}</div>
              <div className="text-sm text-gray-600">סה"כ קטגוריות</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.totalAvailable}</div>
              <div className="text-sm text-gray-600">סה"כ טיפולים</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            בחירת קטגוריות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTreatments ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(category => (
                <div key={category.name} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox
                    id={`category-${category.name}`}
                    checked={category.selected}
                    onCheckedChange={(checked) => handleCategoryChange(category.name, checked as boolean)}
                  />
                  <label
                    htmlFor={`category-${category.name}`}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {category.name}
                    <div className="text-xs text-muted-foreground mt-1">
                      {category.treatments.length} טיפולים
                    </div>
                  </label>
                  {category.selected && (
                    <Badge variant="default" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      נבחר
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment Selection by Category */}
      {selectedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>בחירת טיפולים</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${selectedCategories.length}, minmax(0, 1fr))` }}>
                {selectedCategories.map(category => (
                  <TabsTrigger key={category.name} value={category.name} className="text-xs">
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {selectedCategories.map(category => (
                <TabsContent key={category.name} value={category.name} className="mt-4">
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground mb-3">
                      בחר טיפולים מקטגוריה: <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.treatments.map(treatment => (
                        <div key={treatment._id} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <Checkbox
                            id={`treatment-${treatment._id}`}
                            checked={selectedTreatments.includes(treatment._id)}
                            onCheckedChange={(checked) => handleTreatmentChange(treatment._id, checked as boolean)}
                          />
                          <label
                            htmlFor={`treatment-${treatment._id}`}
                            className="flex-1 text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            <div className="font-medium">{treatment.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {treatment.defaultDurationMinutes} דקות
                              {treatment.fixedPrice && ` • ₪${treatment.fixedPrice}`}
                            </div>
                            {treatment.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {treatment.description}
                              </div>
                            )}
                          </label>
                          {selectedTreatments.includes(treatment._id) && (
                            <Badge variant="default" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              נבחר
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {selectedCategories.length === 0 && !loadingTreatments && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">לא נבחרו קטגוריות</h3>
            <p className="text-muted-foreground text-center">
              בחר לפחות קטגוריה אחת כדי להתחיל לבחור טיפולים
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 