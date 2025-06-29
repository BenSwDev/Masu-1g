"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Stethoscope, Clock, DollarSign, ArrowLeft } from "lucide-react"

interface BookingCreateTreatmentStepProps {
  formData: any
  onUpdate: (data: any) => void
  treatments: any[]
  onNext: () => void
  onPrev: () => void
}

export default function BookingCreateTreatmentStep({
  formData,
  onUpdate,
  treatments,
  onNext,
  onPrev
}: BookingCreateTreatmentStepProps) {
  const { t, dir } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null)

  useEffect(() => {
    if (formData.treatmentId) {
      const treatment = treatments.find(t => t._id === formData.treatmentId)
      setSelectedTreatment(treatment)
    }
  }, [formData.treatmentId, treatments])

  const validateStep = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.treatmentId) {
      newErrors.treatmentId = "יש לבחור טיפול"
    }

    if (selectedTreatment?.pricingType === "duration_based" && !formData.selectedDurationId) {
      newErrors.selectedDurationId = "יש לבחור משך זמן"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      onNext()
    }
  }

  const handleTreatmentChange = (treatmentId: string) => {
    const treatment = treatments.find(t => t._id === treatmentId)
    setSelectedTreatment(treatment)
    onUpdate({ treatmentId, selectedDurationId: "" })
  }

  const handleDurationChange = (durationId: string) => {
    onUpdate({ selectedDurationId: durationId })
  }

  const getAvailableDurations = () => {
    if (!selectedTreatment || selectedTreatment.pricingType !== "duration_based") {
      return []
    }
    return selectedTreatment.durations?.filter((d: any) => d.isActive) || []
  }

  const getSelectedDurationDetails = () => {
    if (!selectedTreatment || !formData.selectedDurationId) return null
    return selectedTreatment.durations?.find((d: any) => d._id === formData.selectedDurationId)
  }

  const getTreatmentPrice = () => {
    if (!selectedTreatment) return null
    
    if (selectedTreatment.pricingType === "fixed") {
      return selectedTreatment.fixedPrice
    } else if (selectedTreatment.pricingType === "duration_based") {
      const duration = getSelectedDurationDetails()
      return duration?.price
    }
    return null
  }

  const groupedTreatments = treatments.reduce((acc, treatment) => {
    if (!acc[treatment.category]) {
      acc[treatment.category] = []
    }
    acc[treatment.category].push(treatment)
    return acc
  }, {} as Record<string, any[]>)

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case "massages":
        return "עיסויים"
      case "facial_treatments":
        return "טיפולי פנים"
      default:
        return category
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            בחירת טיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Treatment Selection */}
          <div className="space-y-2">
            <Label htmlFor="treatment">בחר טיפול *</Label>
            <Select
              value={formData.treatmentId || ""}
              onValueChange={handleTreatmentChange}
            >
              <SelectTrigger className={errors.treatmentId ? "border-red-500" : ""}>
                <SelectValue placeholder="בחר טיפול..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedTreatments).map(([category, categoryTreatments]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                      {getCategoryDisplayName(category)}
                    </div>
                    {(categoryTreatments as any[])
                      .filter((treatment: any) => treatment.isActive)
                      .map((treatment: any) => (
                        <SelectItem key={treatment._id} value={treatment._id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{treatment.name}</span>
                            {treatment.pricingType === "fixed" && (
                              <span className="text-sm text-muted-foreground">
                                ₪{treatment.fixedPrice}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {errors.treatmentId && (
              <p className="text-sm text-red-500">{errors.treatmentId}</p>
            )}
          </div>

          {/* Duration Selection for Duration-based Treatments */}
          {selectedTreatment?.pricingType === "duration_based" && (
            <div className="space-y-2">
              <Label htmlFor="duration">בחר משך טיפול *</Label>
              <Select
                value={formData.selectedDurationId || ""}
                onValueChange={handleDurationChange}
              >
                <SelectTrigger className={errors.selectedDurationId ? "border-red-500" : ""}>
                  <SelectValue placeholder="בחר משך זמן..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableDurations().map((duration: any) => (
                    <SelectItem key={duration._id} value={duration._id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{duration.minutes} דקות</span>
                        <span className="text-sm text-muted-foreground">
                          ₪{duration.price}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.selectedDurationId && (
                <p className="text-sm text-red-500">{errors.selectedDurationId}</p>
              )}
            </div>
          )}

          {/* Treatment Details */}
          {selectedTreatment && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">{selectedTreatment.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                {selectedTreatment.description && (
                  <p className="text-sm text-gray-600">{selectedTreatment.description}</p>
                )}

                {/* Treatment Info */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getCategoryDisplayName(selectedTreatment.category)}
                    </Badge>
                  </div>

                  {selectedTreatment.pricingType === "fixed" && (
                    <>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>{selectedTreatment.defaultDurationMinutes} דקות</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="h-4 w-4" />
                        <span>₪{selectedTreatment.fixedPrice}</span>
                      </div>
                    </>
                  )}

                  {selectedTreatment.pricingType === "duration_based" && formData.selectedDurationId && (
                    <>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>{getSelectedDurationDetails()?.minutes} דקות</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="h-4 w-4" />
                        <span>₪{getSelectedDurationDetails()?.price}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Therapist Gender Selection */}
                {selectedTreatment.allowTherapistGenderSelection && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      עבור טיפול זה ניתן לבחור מגדר מטפל במהלך התזמון
                    </p>
                  </div>
                )}

                {/* Duration-based Options */}
                {selectedTreatment.pricingType === "duration_based" && !formData.selectedDurationId && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">אפשרויות זמן זמינות:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {getAvailableDurations().map((duration: any) => (
                        <div key={duration._id} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm">{duration.minutes} דקות</span>
                          <span className="text-sm font-medium">₪{duration.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Price Summary */}
          {getTreatmentPrice() && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">סה"כ מחיר טיפול:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₪{getTreatmentPrice()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  * המחיר כולל את כל העלויות - ציוד, הגעה ואספקת חומרים
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          חזור
        </Button>
        <Button onClick={handleNext}>
          המשך
        </Button>
      </div>
    </div>
  )
} 
