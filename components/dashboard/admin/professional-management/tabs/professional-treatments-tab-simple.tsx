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
import { Stethoscope, Plus, Trash2, Save, Loader2, AlertTriangle, Check, X } from "lucide-react"
import { updateProfessionalTreatments } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

interface Professional {
  _id: string
  userId: IUser
  status: ProfessionalStatus
  isActive: boolean
  specialization?: string
  experience?: string
  certifications?: string[]
  bio?: string
  profileImage?: string
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
  durations: Array<{
    _id: string
    duration: number
    basePrice: number
  }>
  category?: string
  description?: string
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
  
  const [treatments, setTreatments] = useState<ProfessionalTreatment[]>(professional.treatments || [])
  const [availableTreatments, setAvailableTreatments] = useState<TreatmentOption[]>([])
  const [loading, setLoading] = useState(false)
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
          setAvailableTreatments(data.treatments || [])
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
      treatmentId: "",
      durationId: "",
      professionalPrice: 0,
      treatmentName: ""
    }
    setTreatments(prev => [...prev, newTreatment])
    setHasChanges(true)
  }

  const handleRemoveTreatment = (index: number) => {
    setTreatments(prev => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleTreatmentChange = (index: number, field: keyof ProfessionalTreatment, value: string | number) => {
    setTreatments(prev => prev.map((treatment, i) => {
      if (i === index) {
        const updated = { ...treatment, [field]: value }
        
        // If treatment changed, also update the name
        if (field === 'treatmentId') {
          const selectedTreatment = availableTreatments.find(t => t._id === value)
          updated.treatmentName = selectedTreatment?.name || ""
          updated.durationId = "" // Reset duration when treatment changes
          updated.professionalPrice = 0 // Reset price when treatment changes
        }
        
        // If duration changed, suggest base price
        if (field === 'durationId' && treatment.treatmentId) {
          const selectedTreatment = availableTreatments.find(t => t._id === treatment.treatmentId)
          const selectedDuration = selectedTreatment?.durations.find(d => d._id === value)
          if (selectedDuration && updated.professionalPrice === 0) {
            updated.professionalPrice = selectedDuration.basePrice
          }
        }
        
        return updated
      }
      return treatment
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    // Validate treatments
    const validTreatments = treatments.filter(t => t.treatmentId && t.professionalPrice > 0)
    
    if (validTreatments.length === 0) {
      toast({
        variant: "destructive", 
        title: "שגיאה",
        description: "נא להוסיף לפחות טיפול אחד תקין"
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
          durationId: t.durationId?.toString(),
          professionalPrice: t.professionalPrice || 0,
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
        description: "שגיאה בשמירת הטיפולים"
      })
    } finally {
      setSaving(false)
    }
  }

  const getTreatmentDurations = (treatmentId: string) => {
    const treatment = availableTreatments.find(t => t._id === treatmentId)
    return treatment?.durations || []
  }

  const isValidTreatment = (treatment: ProfessionalTreatment) => {
    return treatment.treatmentId && treatment.professionalPrice > 0
  }

  if (disabled) {
    return (
      <div className="p-6 space-y-6" dir={dir}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            יש ליצור את המטפל תחילה לפני הגדרת הטיפולים
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loadingTreatments) {
    return (
      <div className="p-6 space-y-6" dir={dir}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          <h3 className="text-lg font-semibold">טיפולים מוצעים</h3>
          <Badge variant="secondary">{treatments.filter(isValidTreatment).length} טיפולים</Badge>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleAddTreatment}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            הוסף טיפול
          </Button>
          
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
      </div>

      {treatments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">אין טיפולים מוגדרים</h3>
            <p className="text-muted-foreground text-center mb-4">
              הוסף טיפולים שהמטפל יכול לבצע כדי שלקוחות יוכלו להזמין אותם
            </p>
            <Button onClick={handleAddTreatment} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              הוסף טיפול ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {treatments.map((treatment, index) => {
            const isValid = isValidTreatment(treatment)
            const durations = getTreatmentDurations(treatment.treatmentId)
            
            return (
              <Card key={index} className={`relative ${!isValid ? 'border-orange-200 bg-orange-50/50' : 'border-green-200 bg-green-50/50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Treatment Selection */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            טיפול *
                          </Label>
                          <Select 
                            value={treatment.treatmentId} 
                            onValueChange={(value) => handleTreatmentChange(index, 'treatmentId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="בחר טיפול" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTreatments.map(t => (
                                <SelectItem key={t._id} value={t._id}>
                                  {t.name}
                                  {t.category && (
                                    <span className="text-muted-foreground text-xs mr-2">
                                      ({t.category})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Duration Selection */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            משך זמן
                          </Label>
                          <Select 
                            value={treatment.durationId || ""} 
                            onValueChange={(value) => handleTreatmentChange(index, 'durationId', value)}
                            disabled={!treatment.treatmentId || durations.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="בחר משך זמן" />
                            </SelectTrigger>
                            <SelectContent>
                              {durations.map(d => (
                                <SelectItem key={d._id} value={d._id}>
                                  {d.duration} דקות (₪{d.basePrice})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Professional Price */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            מחיר מטפל *
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={treatment.professionalPrice}
                              onChange={(e) => handleTreatmentChange(index, 'professionalPrice', Number(e.target.value))}
                              placeholder="0"
                              min="0"
                              step="10"
                              className="pl-8"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                              ₪
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-center gap-2">
                      {isValid ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-xs">תקין</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs">חסר</span>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => handleRemoveTreatment(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {treatments.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-sm">
              <span>סה"כ טיפולים:</span>
              <div className="flex gap-4">
                <span className="text-green-600">
                  {treatments.filter(isValidTreatment).length} תקינים
                </span>
                <span className="text-orange-600">
                  {treatments.filter(t => !isValidTreatment(t)).length} חסרים
                </span>
              </div>
            </div>
            
            {treatments.filter(isValidTreatment).length === 0 && (
              <Alert className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  נדרש לפחות טיפול אחד תקין כדי שהמטפל יוכל לקבל הזמנות
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 