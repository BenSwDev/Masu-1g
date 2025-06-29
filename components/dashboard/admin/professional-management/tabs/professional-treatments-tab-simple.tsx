"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { Stethoscope, Save, Loader2, AlertTriangle, Check, Clock, DollarSign } from "lucide-react"
import { updateProfessionalTreatments } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { Professional } from "@/lib/types/professional"

interface TreatmentDuration {
  _id: string
  minutes: number
  price: number
  professionalPrice: number
  isActive: boolean
}

interface TreatmentOption {
  _id: string
  name: string
  category: string
  description?: string
  pricingType: "fixed" | "duration_based"
  // Fixed pricing
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  // Duration-based pricing
  durations?: TreatmentDuration[]
  allowTherapistGenderSelection?: boolean
}

interface ProfessionalTreatment {
  treatmentId: string
  durationId?: string
  professionalPrice: number
  treatmentName?: string
}

interface ProfessionalTreatmentsTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
  disabled?: boolean
}

export default function ProfessionalTreatmentsTab({
  professional,
  onUpdate,
  disabled = false
}: ProfessionalTreatmentsTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [selectedTreatments, setSelectedTreatments] = useState<Set<string>>(new Set())
  const [availableTreatments, setAvailableTreatments] = useState<TreatmentOption[]>([])
  const [treatmentsByCategory, setTreatmentsByCategory] = useState<Record<string, TreatmentOption[]>>({})
  const [loadingTreatments, setLoadingTreatments] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize selected treatments from professional data
  useEffect(() => {
    if (professional.treatments) {
      const selectedIds = new Set(professional.treatments.map(t => t.treatmentId))
      setSelectedTreatments(selectedIds)
    }
  }, [professional.treatments])

  // Load available treatments
  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const response = await fetch('/api/treatments')
        if (response.ok) {
          const data = await response.json()
          const treatmentList = data.treatments || []
          setAvailableTreatments(treatmentList)
          
          // Group treatments by category
          const grouped = treatmentList.reduce((acc: Record<string, TreatmentOption[]>, treatment: TreatmentOption) => {
            const category = treatment.category || "אחר"
            if (!acc[category]) {
              acc[category] = []
            }
            acc[category].push(treatment)
            return acc
          }, {})
          
          setTreatmentsByCategory(grouped)
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
  }, [toast])

  const handleTreatmentToggle = (treatmentId: string, checked: boolean) => {
    const newSelected = new Set(selectedTreatments)
    if (checked) {
      newSelected.add(treatmentId)
    } else {
      newSelected.delete(treatmentId)
    }
    setSelectedTreatments(newSelected)
    setHasChanges(true)
  }

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const categoryTreatments = treatmentsByCategory[category] || []
    const newSelected = new Set(selectedTreatments)
    
    categoryTreatments.forEach(treatment => {
      if (checked) {
        newSelected.add(treatment._id)
      } else {
        newSelected.delete(treatment._id)
      }
    })
    
    setSelectedTreatments(newSelected)
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      // Convert selected treatments to the format expected by the API
      const treatmentsToSave = Array.from(selectedTreatments).map(treatmentId => {
        const treatment = availableTreatments.find(t => t._id === treatmentId)
        return {
          treatmentId,
          treatmentName: treatment?.name || "",
          professionalPrice: treatment?.fixedProfessionalPrice || 0,
          durationId: undefined // Will be handled by duration-based treatments if needed
        }
      })
      
      const result = await updateProfessionalTreatments(professional._id, treatmentsToSave)
      
      if (result.success && result.professional) {
        toast({
          title: "הצלחה",
          description: "טיפולי המטפל עודכנו בהצלחה"
        })
        
        // Update professional with new treatments
        const updatedTreatments = (result.professional.treatments || []).map(t => ({
          treatmentId: t.treatmentId?.toString() || '',
          durationId: t.durationId?.toString(),
          professionalPrice: t.professionalPrice || 0,
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

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case "massages": return "עיסויים"
      case "facial_treatments": return "טיפולי פנים"
      default: return category
    }
  }

  const isCategoryFullySelected = (category: string) => {
    const categoryTreatments = treatmentsByCategory[category] || []
    return categoryTreatments.length > 0 && categoryTreatments.every(t => selectedTreatments.has(t._id))
  }

  const isCategoryPartiallySelected = (category: string) => {
    const categoryTreatments = treatmentsByCategory[category] || []
    return categoryTreatments.some(t => selectedTreatments.has(t._id)) && !isCategoryFullySelected(category)
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

  return (
    <div className="p-6 space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          <h3 className="text-lg font-semibold">טיפולי המטפל</h3>
          <Badge variant="secondary">{selectedTreatments.size} טיפולים</Badge>
        </div>
        
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 min-w-[100px]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "שומר..." : "שמור"}
          </Button>
        )}
      </div>

      {loadingTreatments ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(treatmentsByCategory).map(([category, treatments]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`category-${category}`}
                      checked={isCategoryFullySelected(category)}
                      onCheckedChange={(checked) => handleCategoryToggle(category, checked as boolean)}
                      className={isCategoryPartiallySelected(category) ? "data-[state=checked]:bg-orange-500" : ""}
                    />
                    <Label htmlFor={`category-${category}`} className="text-base font-semibold cursor-pointer">
                      {getCategoryDisplayName(category)}
                    </Label>
                    <Badge variant="outline">
                      {treatments.filter(t => selectedTreatments.has(t._id)).length} / {treatments.length}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {treatments.map(treatment => (
                    <div key={treatment._id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        id={`treatment-${treatment._id}`}
                        checked={selectedTreatments.has(treatment._id)}
                        onCheckedChange={(checked) => handleTreatmentToggle(treatment._id, checked as boolean)}
                      />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={`treatment-${treatment._id}`} className="font-medium cursor-pointer">
                          {treatment.name}
                        </Label>
                        {treatment.description && (
                          <p className="text-sm text-muted-foreground">{treatment.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {/* Pricing info */}
                          {treatment.pricingType === "fixed" ? (
                            <div className="flex items-center gap-1 text-xs">
                              <DollarSign className="w-3 h-3" />
                              <span>₪{treatment.fixedPrice}</span>
                              {treatment.defaultDurationMinutes && (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  <span>{treatment.defaultDurationMinutes} דקות</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="w-3 h-3" />
                              <span>
                                {treatment.durations?.map(d => `${d.minutes} דקות (₪${d.price})`).join(", ") || "משתנה"}
                              </span>
                            </div>
                          )}
                          
                          {treatment.allowTherapistGenderSelection && (
                            <Badge variant="outline" className="text-xs">
                              בחירת מגדר מטפל
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center text-sm">
            <span>סה"כ טיפולים נבחרים:</span>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                {selectedTreatments.size}
              </Badge>
            </div>
          </div>
          
          {selectedTreatments.size === 0 && (
            <Alert className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                נדרש לבחור לפחות טיפול אחד כדי שהמטפל יוכל לקבל הזמנות
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 