"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  Stethoscope, 
  Save, 
  Loader2, 
  AlertTriangle, 
  Check, 
  Package,
  ChevronRight,
  Circle,
  CheckCircle2
} from "lucide-react"
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
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  durations?: Array<{
    _id: string
    minutes: number
    price: number
    isActive: boolean
  }>
  isActive: boolean
}

interface CategoryData {
  name: string
  displayName: string
  treatments: TreatmentOption[]
  selectedTreatments: string[]
  isExpanded: boolean
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
  const [allTreatments, setAllTreatments] = useState<TreatmentOption[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>(
    professional.treatments?.map(t => t.treatmentId) || []
  )
  const [loadingTreatments, setLoadingTreatments] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Category display names mapping
  const categoryDisplayNames: Record<string, string> = {
    "massages": "עיסויים",
    "facial_treatments": "טיפולי פנים"
  }

  // Load available treatments and organize by categories
  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const response = await fetch('/api/treatments')
        if (response.ok) {
          const data = await response.json()
          const treatmentList = data.treatments || []
          
          setAllTreatments(treatmentList)
          
          // Group treatments by category
          const categoryMap = new Map<string, TreatmentOption[]>()
          treatmentList.forEach((treatment: TreatmentOption) => {
            const category = treatment.category || "other"
            if (!categoryMap.has(category)) {
              categoryMap.set(category, [])
            }
            categoryMap.get(category)!.push(treatment)
          })
          
          // Convert to CategoryData array
          const categoryData: CategoryData[] = Array.from(categoryMap.entries()).map(([categoryName, treatments]) => {
            const categoryTreatmentIds = treatments.map(t => t._id)
            const selectedInCategory = selectedTreatments.filter(id => categoryTreatmentIds.includes(id))
            
            return {
              name: categoryName,
              displayName: categoryDisplayNames[categoryName] || categoryName,
              treatments: treatments.sort((a, b) => a.name.localeCompare(b.name)),
              selectedTreatments: selectedInCategory,
              isExpanded: selectedInCategory.length > 0
            }
          })
          
          setCategories(categoryData.sort((a, b) => a.displayName.localeCompare(b.displayName)))
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

  // Update selected treatments when professional data changes
  useEffect(() => {
    const newSelected = professional.treatments?.map(t => t.treatmentId) || []
    setSelectedTreatments(newSelected)
  }, [professional.treatments])

  const handleCategoryToggle = (categoryName: string) => {
    setCategories(prev => prev.map(cat => 
      cat.name === categoryName 
        ? { ...cat, isExpanded: !cat.isExpanded }
        : cat
    ))
  }

  const handleTreatmentChange = (treatmentId: string, checked: boolean) => {
    setSelectedTreatments(prev => {
      const newSelection = checked 
        ? [...prev, treatmentId]
        : prev.filter(id => id !== treatmentId)
      
      // Update categories with new selection
      setCategories(prevCategories => prevCategories.map(cat => {
        const categoryTreatmentIds = cat.treatments.map(t => t._id)
        const selectedInCategory = newSelection.filter(id => categoryTreatmentIds.includes(id))
        return {
          ...cat,
          selectedTreatments: selectedInCategory
        }
      }))
      
      return newSelection
    })
    setHasChanges(true)
  }

  const handleSelectAllInCategory = (categoryName: string, selectAll: boolean) => {
    const category = categories.find(c => c.name === categoryName)
    if (!category) return

    const categoryTreatmentIds = category.treatments.map(t => t._id)
    
    setSelectedTreatments(prev => {
      let newSelection
      if (selectAll) {
        // Add all treatments from this category
        newSelection = [...new Set([...prev, ...categoryTreatmentIds])]
      } else {
        // Remove all treatments from this category
        newSelection = prev.filter(id => !categoryTreatmentIds.includes(id))
      }
      
      // Update categories with new selection
      setCategories(prevCategories => prevCategories.map(cat => {
        const catTreatmentIds = cat.treatments.map(t => t._id)
        const selectedInCat = newSelection.filter(id => catTreatmentIds.includes(id))
        return {
          ...cat,
          selectedTreatments: selectedInCat
        }
      }))
      
      return newSelection
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const treatmentsToSave = selectedTreatments.map(treatmentId => ({
        treatmentId,
        treatmentName: allTreatments.find(t => t._id === treatmentId)?.name || ""
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
          description: result.error || "שגיאה בעדכון טיפולי המטפל"
        })
      }
    } catch (error) {
      console.error("Error saving treatments:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון טיפולי המטפל"
      })
    } finally {
      setSaving(false)
    }
  }

  const getTreatmentStats = () => {
    const totalTreatments = allTreatments.length
    const selectedCount = selectedTreatments.length
    const categoriesWithTreatments = categories.filter(c => c.selectedTreatments.length > 0).length
    
    return {
      totalTreatments,
      selectedCount,
      categoriesWithTreatments,
      totalCategories: categories.length
    }
  }

  const formatPrice = (treatment: TreatmentOption) => {
    if (treatment.pricingType === "fixed" && treatment.fixedPrice) {
      return `₪${treatment.fixedPrice}`
    } else if (treatment.pricingType === "duration_based" && treatment.durations) {
      const activeDurations = treatment.durations.filter(d => d.isActive)
      if (activeDurations.length > 0) {
        const prices = activeDurations.map(d => d.price)
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        return minPrice === maxPrice ? `₪${minPrice}` : `₪${minPrice}-${maxPrice}`
      }
    }
    return "לא צוין"
  }

  const formatDuration = (treatment: TreatmentOption) => {
    if (treatment.pricingType === "duration_based" && treatment.durations) {
      const activeDurations = treatment.durations.filter(d => d.isActive)
      if (activeDurations.length > 0) {
        const durations = activeDurations.map(d => `${d.minutes} דק'`)
        return durations.join(", ")
      }
    }
    return "סטנדרטי"
  }

  if (loadingTreatments) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          <h3 className="text-lg font-semibold">טיפולי המטפל</h3>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = getTreatmentStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          <h3 className="text-lg font-semibold">טיפולי המטפל</h3>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
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

      {/* Stats Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{stats.selectedCount}</div>
              <div className="text-sm text-muted-foreground">טיפולים נבחרו</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.categoriesWithTreatments}</div>
              <div className="text-sm text-muted-foreground">קטגוריות פעילות</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-muted-foreground">{stats.totalTreatments}</div>
              <div className="text-sm text-muted-foreground">סה"כ טיפולים</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treatment Categories */}
      <div className="space-y-4">
        {categories.map((category) => {
          const isAllSelected = category.selectedTreatments.length === category.treatments.length
          const isPartiallySelected = category.selectedTreatments.length > 0 && !isAllSelected
          
          return (
            <Card key={category.name} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCategoryToggle(category.name)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${category.isExpanded ? 'rotate-90' : ''}`} />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{category.displayName}</CardTitle>
                      <Badge variant={category.selectedTreatments.length > 0 ? "default" : "secondary"}>
                        {category.selectedTreatments.length}/{category.treatments.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAllInCategory(category.name, !isAllSelected)}
                      disabled={disabled}
                      className="text-xs"
                    >
                      {isAllSelected ? (
                        <>
                          <Circle className="w-3 h-3 mr-1" />
                          בטל הכל
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          בחר הכל
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {category.isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {category.treatments.map((treatment) => {
                      const isSelected = selectedTreatments.includes(treatment._id)
                      
                      return (
                        <div
                          key={treatment._id}
                          className={`flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                            isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <Checkbox
                              id={`treatment-${treatment._id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleTreatmentChange(treatment._id, checked as boolean)
                              }
                              disabled={disabled}
                            />
                            <Label
                              htmlFor={`treatment-${treatment._id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium">{treatment.name}</div>
                                  {treatment.description && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {treatment.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    משך: {formatDuration(treatment)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-primary">
                                    {formatPrice(treatment)}
                                  </div>
                                  <Badge 
                                    variant={treatment.pricingType === "fixed" ? "secondary" : "outline"}
                                    className="text-xs mt-1"
                                  >
                                    {treatment.pricingType === "fixed" ? "מחיר קבוע" : "לפי משך"}
                                  </Badge>
                                </div>
                              </div>
                            </Label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Alert className="flex-1 mr-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  יש לך שינויים שלא נשמרו בטיפולי המטפל
                </AlertDescription>
              </Alert>
              <Button onClick={handleSave} disabled={saving}>
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
            </div>
          </CardContent>
        </Card>
      )}

      {disabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ניהול טיפולים זמין רק למטפלים קיימים. שמור תחילה את פרטי המטפל.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
} 