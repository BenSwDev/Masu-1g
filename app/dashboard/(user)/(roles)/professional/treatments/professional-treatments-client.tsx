"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/common/ui/accordion"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  Stethoscope, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Target,
  Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"

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
  treatmentName?: string
}

interface ProfessionalTreatmentsClientProps {
  professional: {
    _id: string
    userId: string
    treatments?: ProfessionalTreatment[]
    status: string
    isActive: boolean
  }
}

export default function ProfessionalTreatmentsClient({ professional }: ProfessionalTreatmentsClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  
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
        isActive: true,
        treatmentName: t.treatmentName || ''
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
      case 'beauty_treatments': return 'טיפולי יופי'
      case 'wellness': return 'בריאות ובריאות'
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
          isActive: true,
          treatmentName: treatment.name
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

      // Call API to update professional treatments
      const response = await fetch(`/api/professional/treatments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professionalId: professional._id,
          treatments: treatmentsToSave
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "נשמר בהצלחה",
          description: "הטיפולים שלך נשמרו בהצלחה",
          variant: "default"
        })
        
        // Refresh the page to get updated data
        router.refresh()
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

  // Calculate statistics
  const stats = {
    totalSelected: selectedTreatments.length,
    totalEarningsEstimate: selectedTreatments.reduce((sum, t) => sum + t.professionalPrice, 0),
    categoriesActive: Object.keys(treatmentsByCategory).filter(category => 
      treatmentsByCategory[category].some(treatment => 
        selectedTreatments.some(st => st.treatmentId === treatment._id)
      )
    ).length
  }

  if (loadingTreatments) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-muted-foreground">טוען טיפולים זמינים...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.totalSelected}</div>
                <div className="text-xs text-blue-600">טיפולים נבחרו</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">₪{stats.totalEarningsEstimate}</div>
                <div className="text-xs text-green-600">הכנסה משוערת</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-700">{stats.categoriesActive}</div>
                <div className="text-xs text-purple-600">קטגוריות פעילות</div>
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
            הפרופיל שלך אינו פעיל כרגע. שינויי הטיפולים יישמרו אבל לא יוצגו ללקוחות עד לאישור המנהל.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              בחירת טיפולים ותעריפים
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-4 h-4" />
                נבחרו: {selectedTreatments.length}
              </Badge>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  "שמור שינויים"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.keys(treatmentsByCategory).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Stethoscope className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">לא נמצאו טיפולים זמינים במערכת</p>
              <p className="text-sm">אנא צור קשר עם המנהל להוספת טיפולים</p>
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
                        ({categoryTreatments.length} טיפולים זמינים)
                      </span>
                      <span className="text-sm text-green-600">
                        ({categoryTreatments.filter(t => selectedTreatments.some(st => st.treatmentId === t._id)).length} נבחרו)
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
                              {treatment.isActive ? "זמין" : "לא זמין"}
                            </Badge>
                          </div>

                          {treatment.pricingType === 'fixed' ? (
                            // Fixed pricing treatment
                            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                              <Checkbox
                                checked={isTreatmentSelected(treatment._id)}
                                onCheckedChange={() => handleTreatmentToggle(treatment._id)}
                                disabled={!treatment.isActive}
                              />
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">מחיר ללקוח</Label>
                                  <div className="flex items-center gap-1 mt-1">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                    <span className="font-medium">₪{treatment.fixedPrice}</span>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">התשלום שלך</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={treatment.fixedPrice || 999999}
                                    value={getTreatmentPrice(treatment._id)}
                                    onChange={(e) => handlePriceChange(treatment._id, undefined, Number(e.target.value))}
                                    disabled={!isTreatmentSelected(treatment._id) || !treatment.isActive}
                                    className="mt-1"
                                    placeholder="הזן תעריף"
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
                                    disabled={!treatment.isActive}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium">{duration.minutes} דקות</span>
                                  </div>
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm">מחיר ללקוח</Label>
                                      <div className="flex items-center gap-1 mt-1">
                                        <DollarSign className="w-4 h-4 text-green-600" />
                                        <span className="font-medium">₪{duration.price}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm">התשלום שלך</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max={duration.price || 999999}
                                        value={getTreatmentPrice(treatment._id, duration._id)}
                                        onChange={(e) => handlePriceChange(treatment._id, duration._id, Number(e.target.value))}
                                        disabled={!isTreatmentSelected(treatment._id, duration._id) || !treatment.isActive}
                                        className="mt-1"
                                        placeholder="הזן תעריף"
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

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">כיצד לבחור טיפולים ותעריפים:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>בחר טיפולים:</strong> סמן את הטיפולים שאתה מספק</li>
                <li>• <strong>קבע תעריפים:</strong> הזן את התשלום שברצונך לקבל עבור כל טיפול</li>
                <li>• <strong>שמור שינויים:</strong> לחץ על "שמור שינויים" לעדכון הפרופיל</li>
                <li>• <strong>הפעלה:</strong> הטיפולים יהיו זמינים ללקוחות לאחר אישור המנהל</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 