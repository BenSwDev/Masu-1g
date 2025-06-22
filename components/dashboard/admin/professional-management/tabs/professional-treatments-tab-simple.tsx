"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { Stethoscope, Plus, Trash2, Save, Loader2, AlertTriangle, Check, X, Filter } from "lucide-react"
import { updateProfessionalTreatments } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { Professional, ProfessionalTabProps } from "@/lib/types/professional"
import type { IUser } from "@/lib/db/models/user"

interface TreatmentOption {
  _id: string
  name: string
  category: string
  description?: string
  defaultDurationMinutes: number
  fixedPrice?: number
}

interface ProfessionalTreatment {
  treatmentId: string
  treatmentName?: string
}

export default function ProfessionalTreatmentsTabSimple({
  professional,
  onUpdate,
  loading = false
}: ProfessionalTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [treatments, setTreatments] = useState<ProfessionalTreatment[]>(professional.treatments || [])
  const [availableTreatments, setAvailableTreatments] = useState<TreatmentOption[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [loadingTreatments, setLoadingTreatments] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load available treatments
  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const response = await fetch('/api/treatments')
        if (response.ok) {
          const data = await response.json()
          const treatmentList = data.treatments || []
          setAvailableTreatments(treatmentList)
          
          // Extract unique categories
          const uniqueCategories = [...new Set(treatmentList.map((t: TreatmentOption) => t.category).filter(Boolean))]
          setCategories(uniqueCategories)
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

  const handleAddTreatment = () => {
    const newTreatment: ProfessionalTreatment = {
      treatmentId: "placeholder",
      treatmentName: ""
    }
    setTreatments(prev => [...prev, newTreatment])
    setHasChanges(true)
  }

  const handleRemoveTreatment = (index: number) => {
    setTreatments(prev => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleTreatmentChange = (index: number, treatmentId: string) => {
    setTreatments(prev => prev.map((treatment, i) => {
      if (i === index) {
        const selectedTreatment = availableTreatments.find(t => t._id === treatmentId)
        return {
          treatmentId,
          treatmentName: selectedTreatment?.name || ""
        }
      }
      return treatment
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    // Validate treatments
    const validTreatments = treatments.filter(t => t.treatmentId)
    
    if (validTreatments.length === 0) {
      toast({
        variant: "destructive", 
        title: "שגיאה",
        description: "נא להוסיף לפחות טיפול אחד"
      })
      return
    }

    setSaving(true)
    
    try {
      const result = await updateProfessionalTreatments(professional._id, validTreatments)
      
      if (result.success && result.professional) {
        toast({
          title: "הצלחה",
          description: "טיפולי המטפל עודכנו בהצלחה"
        })
        
        // Update professional with new treatments
        const updatedTreatments = (result.professional.treatments || []).map(t => ({
          treatmentId: t.treatmentId?.toString() || '',
          treatmentName: (t as any).treatmentName
        }))
        
        setTreatments(updatedTreatments)
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

  const getFilteredTreatments = () => {
    if (!selectedCategory) return availableTreatments
    return availableTreatments.filter(t => t.category === selectedCategory)
  }

  const isValidTreatment = (treatment: ProfessionalTreatment) => {
    return treatment.treatmentId !== "" && treatment.treatmentId !== "placeholder"
  }

  const getAvailableTreatmentsForSelect = (currentIndex: number) => {
    const selectedTreatmentIds = treatments
      .filter((_, i) => i !== currentIndex)
      .map(t => t.treatmentId)
      .filter(Boolean)
    
    return getFilteredTreatments().filter(t => !selectedTreatmentIds.includes(t._id))
  }

  if (loading) {
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            טיפולי המטפל
          </h3>
          <p className="text-sm text-muted-foreground">
            הגדר את הטיפולים שהמטפל יכול לבצע. המחירים ומשכי הטיפול יחושבו אוטומטית.
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

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            סינון לפי קטגוריה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>בחר קטגוריית טיפולים</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="כל הקטגוריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">כל הקטגוריות</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Treatments List */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת טיפולים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingTreatments ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              {treatments.map((treatment, index) => {
                const availableForSelect = getAvailableTreatmentsForSelect(index)
                const selectedTreatmentData = availableTreatments.find(t => t._id === treatment.treatmentId)
                
                return (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="space-y-2">
                        <Label>טיפול</Label>
                        <Select
                          value={treatment.treatmentId === "placeholder" ? "" : treatment.treatmentId}
                          onValueChange={(value) => handleTreatmentChange(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר טיפול..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableForSelect.map(t => (
                              <SelectItem key={t._id} value={t._id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{t.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {t.category} • {t.defaultDurationMinutes} דקות
                                    {t.fixedPrice && ` • ₪${t.fixedPrice}`}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedTreatmentData && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <div className="font-medium text-muted-foreground">פרטי הטיפול:</div>
                          <div>משך: {selectedTreatmentData.defaultDurationMinutes} דקות</div>
                          {selectedTreatmentData.fixedPrice && (
                            <div>מחיר: ₪{selectedTreatmentData.fixedPrice}</div>
                          )}
                          {selectedTreatmentData.description && (
                            <div className="text-xs mt-1">{selectedTreatmentData.description}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isValidTreatment(treatment) ? (
                        <Badge variant="default">
                          <Check className="h-3 w-3 mr-1" />
                          תקין
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          לא תקין
                        </Badge>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveTreatment(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              <Button onClick={handleAddTreatment} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                הוסף טיפול
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>סה"כ טיפולים:</span>
              <span className="font-medium">{treatments.filter(isValidTreatment).length}</span>
            </div>
            <div className="flex justify-between">
              <span>טיפולים לא תקינים:</span>
              <span className="font-medium text-red-600">
                {treatments.filter(t => !isValidTreatment(t)).length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 