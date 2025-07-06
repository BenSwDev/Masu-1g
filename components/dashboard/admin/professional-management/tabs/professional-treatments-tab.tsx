"use client"

import { useState, useEffect, memo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Checkbox } from "@/components/common/ui/checkbox"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/common/ui/accordion"
import { useToast } from "@/components/common/ui/use-toast"
import { Stethoscope, Plus, Edit, Trash2, Clock, DollarSign, CheckCircle } from "lucide-react"
import type { ProfessionalTabProps } from "@/lib/types/professional"
import { updateProfessionalTreatments } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"

interface Treatment {
  _id: string
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations: Array<{
    _id: string
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }>
  isActive: boolean
  allowTherapistGenderSelection?: boolean
}

interface ProfessionalTreatment {
  treatmentId: string
  durationId?: string
  professionalPrice: number
  isActive: boolean
}

function ProfessionalTreatmentsTab({
  professional,
  onUpdate,
  loading = false
}: ProfessionalTabProps) {
  console.log('🔥 TRACE: ProfessionalTreatmentsTab RENDER', {
    professionalId: professional._id,
    loading,
    timestamp: new Date().toISOString()
  })

  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<ProfessionalTreatment[]>([])
  const [loadingTreatments, setLoadingTreatments] = useState(true)

  // Load treatments and professional's current treatments
  useEffect(() => {
    const loadTreatments = async () => {
      try {
        setLoadingTreatments(true)
        const response = await fetch('/api/treatments')
        const data = await response.json()
        
        if (data.success) {
          setTreatments(data.treatments)
        } else {
          toast({
            title: "שגיאה",
            description: "לא ניתן לטעון את רשימת הטיפולים",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error loading treatments:', error)
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את רשימת הטיפולים",
          variant: "destructive"
        })
      } finally {
        setLoadingTreatments(false)
      }
    }

    loadTreatments()
  }, [toast])

  // Initialize professional's treatments
  useEffect(() => {
    if (professional?.treatments) {
      const profTreatments = professional.treatments.map(t => ({
        treatmentId: t.treatmentId?.toString() || '',
        durationId: t.durationId?.toString() || '',
        professionalPrice: t.professionalPrice || 0,
        isActive: true
      }))
      setSelectedTreatments(profTreatments)
    }
  }, [professional])

  // Group treatments by category
  const treatmentsByCategory = treatments.reduce((acc, treatment) => {
    const category = treatment.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(treatment)
    return acc
  }, {} as Record<string, Treatment[]>)

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'massages': return 'עיסויים'
      case 'facial_treatments': return 'טיפולי פנים'
      default: return 'אחר'
    }
  }

  const handleTreatmentToggle = (treatmentId: string, durationId?: string) => {
    setSelectedTreatments(prev => {
      const existing = prev.find(t => 
        t.treatmentId === treatmentId && 
        (durationId ? t.durationId === durationId : !t.durationId)
      )
      
      if (existing) {
        // Remove treatment
        return prev.filter(t => 
          !(t.treatmentId === treatmentId && 
            (durationId ? t.durationId === durationId : !t.durationId))
        )
      } else {
        // Add treatment
        const treatment = treatments.find(t => t._id === treatmentId)
        if (!treatment) return prev
        
        let defaultPrice = 0
        if (treatment.pricingType === 'fixed') {
          defaultPrice = treatment.fixedProfessionalPrice || 0
        } else if (durationId) {
          const duration = treatment.durations.find(d => d._id === durationId)
          defaultPrice = duration?.professionalPrice || 0
        }
        
        return [...prev, {
          treatmentId,
          durationId,
          professionalPrice: defaultPrice,
          isActive: true
        }]
      }
    })
  }

  const handlePriceChange = (treatmentId: string, durationId: string | undefined, price: number) => {
    setSelectedTreatments(prev => 
      prev.map(t => 
        t.treatmentId === treatmentId && 
        (durationId ? t.durationId === durationId : !t.durationId)
          ? { ...t, professionalPrice: price }
          : t
      )
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Convert selected treatments to the format expected by the backend
      const treatmentsToSave = selectedTreatments.map(t => ({
        treatmentId: t.treatmentId,
        ...(t.durationId && { durationId: t.durationId }),
        professionalPrice: t.professionalPrice
      }))

      // Call the specific action instead of generic onUpdate
      const result = await updateProfessionalTreatments(professional._id, treatmentsToSave)
      
      if (result.success) {
        // The professional has been updated in the database
        // The parent component will refresh automatically
        
        toast({
          title: "נשמר בהצלחה",
          description: "הטיפולים נשמרו בהצלחה",
          variant: "default"
        })
      } else {
        throw new Error(result.error || "שגיאה בשמירת הטיפולים")
      }
    } catch (error) {
      console.error('Error saving treatments:', error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "לא ניתן לשמור את הטיפולים",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const isTreatmentSelected = (treatmentId: string, durationId?: string) => {
    return selectedTreatments.some(t => 
      t.treatmentId === treatmentId && 
      (durationId ? t.durationId === durationId : !t.durationId)
    )
  }

  const getTreatmentPrice = (treatmentId: string, durationId?: string) => {
    const selected = selectedTreatments.find(t => 
      t.treatmentId === treatmentId && 
      (durationId ? t.durationId === durationId : !t.durationId)
    )
    return selected?.professionalPrice || 0
  }

  if (loadingTreatments) {
    return (
      <Card className="border-0 shadow-sm" dir={dir}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            טיפולים ותעריפים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">טוען טיפולים...</p>
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
            <Stethoscope className="w-5 h-5 text-blue-600" />
            טיפולים ותעריפים
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-4 h-4" />
              נבחרו: {selectedTreatments.length}
            </Badge>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.keys(treatmentsByCategory).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>לא נמצאו טיפולים זמינים במערכת</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {Object.entries(treatmentsByCategory).map(([category, categoryTreatments]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getCategoryLabel(category)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({categoryTreatments.length} טיפולים)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {categoryTreatments.map(treatment => (
                      <div key={treatment._id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{treatment.name}</h4>
                            {treatment.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {treatment.description}
                              </p>
                            )}
                          </div>
                          <Badge variant={treatment.isActive ? "default" : "secondary"}>
                            {treatment.isActive ? "פעיל" : "לא פעיל"}
                          </Badge>
                        </div>

                        {treatment.pricingType === 'fixed' ? (
                          // Fixed pricing treatment
                          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <Checkbox
                              checked={isTreatmentSelected(treatment._id)}
                              onCheckedChange={() => handleTreatmentToggle(treatment._id)}
                            />
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">מחיר בסיס</Label>
                                <div className="flex items-center gap-1 mt-1">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="font-medium">₪{treatment.fixedPrice}</span>
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">תשלום למטפל</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={getTreatmentPrice(treatment._id)}
                                  onChange={(e) => handlePriceChange(treatment._id, undefined, Number(e.target.value))}
                                  disabled={!isTreatmentSelected(treatment._id)}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Duration-based pricing
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">משכי זמן זמינים:</Label>
                            {treatment.durations.filter(d => d.isActive).map(duration => (
                              <div key={duration._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                <Checkbox
                                  checked={isTreatmentSelected(treatment._id, duration._id)}
                                  onCheckedChange={() => handleTreatmentToggle(treatment._id, duration._id)}
                                />
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium">{duration.minutes} דקות</span>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm">מחיר בסיס</Label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <DollarSign className="w-4 h-4 text-green-600" />
                                      <span className="font-medium">₪{duration.price}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm">תשלום למטפל</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={getTreatmentPrice(treatment._id, duration._id)}
                                      onChange={(e) => handlePriceChange(treatment._id, duration._id, Number(e.target.value))}
                                      disabled={!isTreatmentSelected(treatment._id, duration._id)}
                                      className="mt-1"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
    console.log('🔥 TRACE: ProfessionalTreatmentsTab memo - props changed', {
      prevId: prevProps.professional._id,
      nextId: nextProps.professional._id,
      timestamp: new Date().toISOString()
    })
  }
  
  return isEqual
}

export default memo(ProfessionalTreatmentsTab, arePropsEqual) 