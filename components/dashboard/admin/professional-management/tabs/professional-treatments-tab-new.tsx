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
  CheckCircle2,
  Clock,
  DollarSign,
  Info
} from "lucide-react"
import { updateProfessionalTreatments } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

// מבנה טיפול כפי שמגיע מה-API
interface TreatmentFromAPI {
  _id: string
  name: string
  category: "massages" | "facial_treatments"
  description?: string
  isActive: boolean
  pricingType: "fixed" | "duration_based"
  // For fixed pricing
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  // For duration-based pricing
  durations?: Array<{
    _id: string
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }>
  allowTherapistGenderSelection?: boolean
  createdAt: string
  updatedAt: string
}

// מבנה טיפול מטפל כפי שנשמר במודל
interface ProfessionalTreatmentPricing {
  treatmentId: string
  durationId?: string
  professionalPrice: number
}

// מבנה מטפל
interface Professional {
  _id: string
  userId: IUser
  status: ProfessionalStatus
  isActive: boolean
  treatments: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
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

// מבנה קטגוריה עם טיפולים
interface CategoryData {
  name: string
  displayName: string
  treatments: TreatmentFromAPI[]
  selectedTreatments: ProfessionalTreatmentPricing[]
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
  const [allTreatments, setAllTreatments] = useState<TreatmentFromAPI[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<ProfessionalTreatmentPricing[]>(
    professional.treatments?.map(t => ({
      treatmentId: t.treatmentId,
      durationId: t.durationId,
      professionalPrice: t.professionalPrice
    })) || []
  )
  const [loadingTreatments, setLoadingTreatments] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Category display names mapping
  const categoryDisplayNames: Record<string, string> = {
    "massages": "עיסויים",
    "facial_treatments": "טיפולי פנים"
  }

  // Load treatments from API
  useEffect(() => {
    const loadTreatments = async () => {
      try {
        setLoadingTreatments(true)
        const response = await fetch('/api/treatments')
        
        if (!response.ok) {
          throw new Error('Failed to fetch treatments')
        }
        
        const data = await response.json()
        const treatmentList = data.treatments || []
        
        if (!Array.isArray(treatmentList)) {
          throw new Error('Invalid treatments data format')
        }
        
        setAllTreatments(treatmentList)
        
        // Group treatments by category
        const categoryMap = new Map<string, TreatmentFromAPI[]>()
        treatmentList.forEach((treatment: TreatmentFromAPI) => {
          const category = treatment.category || "other"
          if (!categoryMap.has(category)) {
            categoryMap.set(category, [])
          }
          categoryMap.get(category)!.push(treatment)
        })
        
        // Create category data with selection info
        const categoryData: CategoryData[] = Array.from(categoryMap.entries()).map(([categoryName, treatments]) => {
          const categoryTreatmentIds = treatments.map(t => t._id)
          const selectedInCategory = selectedTreatments.filter(s => categoryTreatmentIds.includes(s.treatmentId))
          
          return {
            name: categoryName,
            displayName: categoryDisplayNames[categoryName] || categoryName,
            treatments: treatments.sort((a, b) => a.name.localeCompare(b.name)),
            selectedTreatments: selectedInCategory,
            isExpanded: selectedInCategory.length > 0
          }
        })
        
        setCategories(categoryData.sort((a, b) => a.displayName.localeCompare(b.displayName)))
      } catch (error) {
        console.error('Error loading treatments:', error)
        toast({
          variant: "destructive",
          title: "שגיאה בטעינת טיפולים",
          description: "לא ניתן לטעון את רשימת הטיפולים"
        })
      } finally {
        setLoadingTreatments(false)
      }
    }
    
    loadTreatments()
  }, [])

  // Update selected treatments when professional data changes
  useEffect(() => {
    const newSelected = professional.treatments?.map(t => ({
      treatmentId: t.treatmentId,
      durationId: t.durationId,
      professionalPrice: t.professionalPrice
    })) || []
    setSelectedTreatments(newSelected)
    
    // Update categories with new selection
    setCategories(prevCategories => prevCategories.map(cat => {
      const categoryTreatmentIds = cat.treatments.map(t => t._id)
      const selectedInCategory = newSelected.filter(s => categoryTreatmentIds.includes(s.treatmentId))
      return {
        ...cat,
        selectedTreatments: selectedInCategory,
        isExpanded: selectedInCategory.length > 0
      }
    }))
  }, [professional.treatments])

  // Check for changes
  useEffect(() => {
    const originalTreatments = professional.treatments?.map(t => ({
      treatmentId: t.treatmentId,
      durationId: t.durationId,
      professionalPrice: t.professionalPrice
    })) || []
    
    const hasChanges = JSON.stringify(selectedTreatments.sort((a, b) => a.treatmentId.localeCompare(b.treatmentId))) !== 
                       JSON.stringify(originalTreatments.sort((a, b) => a.treatmentId.localeCompare(b.treatmentId)))
    setHasChanges(hasChanges)
  }, [selectedTreatments, professional.treatments])

  // Handle treatment selection
  const handleTreatmentToggle = (treatmentId: string, treatment: TreatmentFromAPI) => {
    const isCurrentlySelected = selectedTreatments.some(t => t.treatmentId === treatmentId)
    
    setSelectedTreatments(prev => {
      if (isCurrentlySelected) {
        // Remove treatment and all its durations
        return prev.filter(t => t.treatmentId !== treatmentId)
      } else {
        // Add treatment - for fixed pricing, add once; for duration-based, add all active durations
        const newTreatments: ProfessionalTreatmentPricing[] = []
        
        if (treatment.pricingType === "fixed") {
          newTreatments.push({
            treatmentId,
            professionalPrice: treatment.fixedProfessionalPrice || 0
          })
        } else if (treatment.pricingType === "duration_based" && treatment.durations) {
          // Add all active durations by default, but user can deselect specific ones
          treatment.durations
            .filter(d => d.isActive)
            .forEach(duration => {
              newTreatments.push({
                treatmentId,
                durationId: duration._id,
                professionalPrice: duration.professionalPrice
              })
            })
        }
        
        return [...prev, ...newTreatments]
      }
    })
  }

  // Handle duration selection for duration-based treatments
  const handleDurationToggle = (treatmentId: string, durationId: string, duration: any) => {
    const isSelected = selectedTreatments.some(t => 
      t.treatmentId === treatmentId && t.durationId === durationId
    )
    
    setSelectedTreatments(prev => {
      if (isSelected) {
        return prev.filter(t => !(t.treatmentId === treatmentId && t.durationId === durationId))
      } else {
        return [...prev, {
          treatmentId,
          durationId,
          professionalPrice: duration.professionalPrice
        }]
      }
    })
  }

  // Handle category toggle
  const handleCategoryToggle = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName)
    if (!category) return
    
    const categoryTreatmentIds = category.treatments.map(t => t._id)
    const allSelected = categoryTreatmentIds.every(id => 
      selectedTreatments.some(t => t.treatmentId === id)
    )
    
    setSelectedTreatments(prev => {
      if (allSelected) {
        // Remove all treatments from this category
        return prev.filter(t => !categoryTreatmentIds.includes(t.treatmentId))
      } else {
        // Add all treatments from this category
        const newTreatments: ProfessionalTreatmentPricing[] = []
        
        category.treatments.forEach(treatment => {
          const alreadySelected = prev.some(t => t.treatmentId === treatment._id)
          if (!alreadySelected) {
            if (treatment.pricingType === "fixed") {
              newTreatments.push({
                treatmentId: treatment._id,
                professionalPrice: treatment.fixedProfessionalPrice || 0
              })
            } else if (treatment.pricingType === "duration_based" && treatment.durations) {
              treatment.durations
                .filter(d => d.isActive)
                .forEach(duration => {
                  newTreatments.push({
                    treatmentId: treatment._id,
                    durationId: duration._id,
                    professionalPrice: duration.professionalPrice
                  })
                })
            }
          }
        })
        
        return [...prev, ...newTreatments]
      }
    })
    
    // Toggle category expansion
    setCategories(prevCategories => prevCategories.map(cat => 
      cat.name === categoryName ? { ...cat, isExpanded: !cat.isExpanded } : cat
    ))
  }

  // Handle professional price change
  const handlePriceChange = (treatmentId: string, durationId: string | undefined, newPrice: number) => {
    if (newPrice < 0) return // Prevent negative prices
    
    setSelectedTreatments(prev => prev.map(t => 
      t.treatmentId === treatmentId && t.durationId === durationId
        ? { ...t, professionalPrice: newPrice }
        : t
    ))
  }

  // Save treatments
  const handleSave = async () => {
    if (!hasChanges || saving) return
    
    setSaving(true)
    
    try {
      const result = await updateProfessionalTreatments(professional._id, selectedTreatments)
      
      if (result.success && result.professional) {
        toast({
          title: "הטיפולים נשמרו בהצלחה",
          description: "הטיפולים של המטפל עודכנו"
        })
        
        // Update parent component
        const updatedTreatments = result.professional.treatments || []
        onUpdate({ treatments: updatedTreatments })
        setHasChanges(false)
      } else {
        throw new Error(result.error || 'Failed to save treatments')
      }
    } catch (error) {
      console.error('Error saving treatments:', error)
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת הטיפולים",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא צפויה"
      })
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (treatment: TreatmentFromAPI) => {
    if (treatment.pricingType === "fixed" && treatment.fixedProfessionalPrice) {
      return `₪${treatment.fixedProfessionalPrice}`
    }
    if (treatment.pricingType === "duration_based" && treatment.durations) {
      const activeDurations = treatment.durations.filter(d => d.isActive)
      if (activeDurations.length > 0) {
        const prices = activeDurations.map(d => d.professionalPrice)
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        return minPrice === maxPrice ? `₪${minPrice}` : `₪${minPrice}-${maxPrice}`
      }
    }
    return "לא צוין"
  }

  const formatDuration = (treatment: TreatmentFromAPI) => {
    if (treatment.pricingType === "duration_based" && treatment.durations) {
      const activeDurations = treatment.durations.filter(d => d.isActive)
      if (activeDurations.length > 0) {
        const durations = activeDurations.map(d => `${d.minutes} דק'`)
        return durations.join(", ")
      }
    }
    if (treatment.defaultDurationMinutes) {
      return `${treatment.defaultDurationMinutes} דק'`
    }
    return "לא צוין"
  }

  // Get selected treatments count for category
  const getSelectedCount = (category: CategoryData) => {
    const categoryTreatmentIds = category.treatments.map(t => t._id)
    const uniqueTreatments = new Set(
      selectedTreatments
        .filter(t => categoryTreatmentIds.includes(t.treatmentId))
        .map(t => t.treatmentId)
    )
    return uniqueTreatments.size
  }

  // Check if all treatments in category are selected
  const isAllCategorySelected = (category: CategoryData) => {
    const categoryTreatmentIds = category.treatments.map(t => t._id)
    return categoryTreatmentIds.length > 0 && categoryTreatmentIds.every(id => 
      selectedTreatments.some(t => t.treatmentId === id)
    )
  }

  // Get treatment selections for a specific treatment
  const getTreatmentSelections = (treatmentId: string) => {
    return selectedTreatments.filter(t => t.treatmentId === treatmentId)
  }

  if (loadingTreatments) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          <h3 className="text-lg font-medium">טיפולים</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          <h3 className="text-lg font-medium">טיפולים</h3>
          <Badge variant="outline">
            {selectedTreatments.length} נבחרו
          </Badge>
        </div>
        
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={saving || disabled}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        )}
      </div>

      {professional.status !== "approved" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            ניתן לערוך טיפולים רק עבור מטפלים מאושרים
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {categories.map((category) => {
          const selectedCount = getSelectedCount(category)
          const allSelected = isAllCategorySelected(category)
          
          return (
            <Card key={category.name}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setCategories(prev => prev.map(cat => 
                  cat.name === category.name ? { ...cat, isExpanded: !cat.isExpanded } : cat
                ))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform ${category.isExpanded ? 'rotate-90' : ''}`} 
                    />
                    <CardTitle className="text-base">{category.displayName}</CardTitle>
                    <Badge variant="secondary">
                      {selectedCount} מתוך {category.treatments.length}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCategoryToggle(category.name)
                      }}
                      disabled={disabled || professional.status !== "approved"}
                    >
                      {allSelected ? "בטל הכל" : "בחר הכל"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {category.isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {category.treatments.map((treatment) => {
                      const isSelected = selectedTreatments.some(t => t.treatmentId === treatment._id)
                      
                      return (
                        <div key={treatment._id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox
                                id={`treatment-${treatment._id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  handleTreatmentToggle(treatment._id, treatment)
                                }
                                disabled={disabled || professional.status !== "approved"}
                              />
                              
                              <div className="flex-1 space-y-2">
                                <Label 
                                  htmlFor={`treatment-${treatment._id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {treatment.name}
                                </Label>
                                
                                {treatment.description && (
                                  <p className="text-xs text-gray-600">
                                    {treatment.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(treatment)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatPrice(treatment)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          
                          {/* Duration-based pricing options */}
                          {isSelected && treatment.pricingType === "duration_based" && treatment.durations && (
                            <div className="mr-6 space-y-2 border-t pt-3">
                              <Label className="text-xs font-medium text-gray-700">
                                בחר משכי זמן ומחירים:
                              </Label>
                              <div className="grid grid-cols-1 gap-2">
                                {treatment.durations
                                  .filter(d => d.isActive)
                                  .map((duration) => {
                                    const isDurationSelected = selectedTreatments.some(t => 
                                      t.treatmentId === treatment._id && t.durationId === duration._id
                                    )
                                    const currentSelection = selectedTreatments.find(t => 
                                      t.treatmentId === treatment._id && t.durationId === duration._id
                                    )
                                    
                                    return (
                                      <div key={duration._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                        <div className="flex items-center gap-3 flex-1">
                                          <Checkbox
                                            id={`duration-${duration._id}`}
                                            checked={isDurationSelected}
                                            onCheckedChange={() => 
                                              handleDurationToggle(treatment._id, duration._id, duration)
                                            }
                                            disabled={disabled || professional.status !== "approved"}
                                          />
                                          <div className="flex-1">
                                            <Label 
                                              htmlFor={`duration-${duration._id}`}
                                              className="text-sm cursor-pointer font-medium"
                                            >
                                              {duration.minutes} דקות
                                            </Label>
                                            <div className="text-xs text-gray-500 mt-1">
                                              מחיר לקוח: ₪{duration.price}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {isDurationSelected && (
                                          <div className="flex items-center gap-2">
                                            <Label className="text-xs text-gray-600">מחיר מטפל:</Label>
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs">₪</span>
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={currentSelection?.professionalPrice || 0}
                                                onChange={(e) => handlePriceChange(
                                                  treatment._id, 
                                                  duration._id, 
                                                  parseFloat(e.target.value) || 0
                                                )}
                                                className="w-20 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                disabled={disabled || professional.status !== "approved"}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                              </div>
                              
                              {/* Special hours information */}
                              <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-blue-800">
                                    <div className="font-medium mb-1">שעות מיוחדות:</div>
                                    <ul className="space-y-1 text-xs">
                                      <li>• ימי חול אחרי 20:00 - תוספת 20%</li>
                                      <li>• סופי שבוע - תוספת 25%</li>
                                      <li>• חגים - תוספת 30%</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Fixed pricing display with edit option */}
                          {isSelected && treatment.pricingType === "fixed" && (
                            <div className="mr-6 space-y-3 border-t pt-3">
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <Label className="text-sm font-medium text-gray-700">תמחור קבוע</Label>
                                    <div className="text-xs text-gray-500 mt-1">
                                      מחיר לקוח: ₪{treatment.fixedPrice || 0}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs text-gray-600">מחיר מטפל:</Label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs">₪</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={getTreatmentSelections(treatment._id)[0]?.professionalPrice || 0}
                                        onChange={(e) => handlePriceChange(
                                          treatment._id, 
                                          undefined, 
                                          parseFloat(e.target.value) || 0
                                        )}
                                        className="w-20 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        disabled={disabled || professional.status !== "approved"}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Special hours information */}
                              <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-blue-800">
                                    <div className="font-medium mb-1">שעות מיוחדות:</div>
                                    <ul className="space-y-1 text-xs">
                                      <li>• ימי חול אחרי 20:00 - תוספת 20%</li>
                                      <li>• סופי שבוע - תוספת 25%</li>
                                      <li>• חגים - תוספת 30%</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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

      {categories.length === 0 && !loadingTreatments && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              לא נמצאו טיפולים זמינים
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 