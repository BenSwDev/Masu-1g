"use client"

import { useState, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { Sparkles, Clock, Users } from "lucide-react"
import type { BookingInitialData, SelectedBookingOptions } from "@/types/booking"

interface GuestTreatmentSelectionStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  onNext: () => void
  onPrev: () => void
}

export function GuestTreatmentSelectionStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  onNext,
  onPrev,
}: GuestTreatmentSelectionStepProps) {
  const { t, dir } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const treatmentCategories = useMemo(() => {
    const categories = new Set((initialData?.activeTreatments || []).map((t) => t.category || "Uncategorized"))
    return Array.from(categories)
  }, [initialData?.activeTreatments])

  const filteredTreatmentsByCategory = useMemo(() => {
    if (!selectedCategory) return []
    return (initialData?.activeTreatments || []).filter((t) => (t.category || "Uncategorized") === selectedCategory)
  }, [selectedCategory, initialData?.activeTreatments])

  const selectedTreatment = useMemo(() => {
    return (initialData?.activeTreatments || []).find(
      (t) => t._id.toString() === bookingOptions.selectedTreatmentId
    )
  }, [initialData?.activeTreatments, bookingOptions.selectedTreatmentId])

  const availableDurations = useMemo(() => {
    if (selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations) {
      return selectedTreatment.durations.filter((d: any) => d.isActive)
    }
    return []
  }, [selectedTreatment])

  const formatPrice = (price: number) => {
    return `₪${price}`
  }

  const formatDurationString = (minutes: number): string => {
    return `${minutes} ${t(minutes === 1 ? "common.minute" : "common.minutes")}`
  }

  const canProceed = useMemo(() => {
    if (!bookingOptions.selectedTreatmentId) return false
    if (selectedTreatment?.pricingType === "duration_based" && !bookingOptions.selectedDurationId) return false
    // Only require therapist gender preference if the treatment allows gender selection
    if (selectedTreatment?.allowTherapistGenderSelection && !bookingOptions.therapistGenderPreference) return false
    return true
  }, [bookingOptions.selectedTreatmentId, bookingOptions.selectedDurationId, bookingOptions.therapistGenderPreference, selectedTreatment])

  const handleTreatmentSelect = (treatmentId: string) => {
    setBookingOptions((prev) => ({
      ...prev,
      selectedTreatmentId: treatmentId,
      selectedDurationId: undefined, // Reset duration when treatment changes
    }))
  }

  const handleDurationSelect = (durationId: string) => {
    setBookingOptions((prev) => ({
      ...prev,
      selectedDurationId: durationId,
    }))
  }

  const handleGenderPreferenceChange = (value: string) => {
    setBookingOptions((prev) => ({
      ...prev,
      therapistGenderPreference: value as "male" | "female" | "any",
    }))
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Sparkles className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.treatment.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.steps.treatment.description")}</p>
      </div>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t("treatments.selectCategory")}</CardTitle>
          <CardDescription>{t("treatments.selectCategoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {treatmentCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="h-auto py-3"
              >
                {t(`treatments.categories.${category}`)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Treatment Selection */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle>{t("treatments.selectTreatment")}</CardTitle>
            <CardDescription>{t("treatments.selectTreatmentDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={bookingOptions.selectedTreatmentId || ""}
              onValueChange={handleTreatmentSelect}
              className="space-y-4"
            >
              {filteredTreatmentsByCategory.map((treatment) => (
                <div key={treatment._id.toString()} className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem value={treatment._id.toString()} id={treatment._id.toString()} />
                  <Label
                    htmlFor={treatment._id.toString()}
                    className="flex-1 cursor-pointer flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <h4 className="font-medium">{treatment.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{treatment.description}</p>
                    </div>
                    <div className="text-right">
                      {treatment.pricingType === "fixed" && (
                        <div className="text-lg font-semibold text-primary">
                          {formatPrice(treatment.fixedPrice || 0)}
                        </div>
                      )}
                      {treatment.pricingType === "duration_based" && (
                        <Badge variant="secondary">{t("treatments.durationBased")}</Badge>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Duration Selection */}
      {selectedTreatment?.pricingType === "duration_based" && availableDurations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("treatments.selectDuration")}
            </CardTitle>
            <CardDescription>{t("treatments.selectDurationDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={bookingOptions.selectedDurationId || ""}
              onValueChange={handleDurationSelect}
              className="space-y-4"
            >
              {availableDurations.map((duration: any) => (
                <div key={duration._id.toString()} className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem value={duration._id.toString()} id={duration._id.toString()} />
                  <Label
                    htmlFor={duration._id.toString()}
                    className="flex-1 cursor-pointer flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <h4 className="font-medium">{duration.name || formatDurationString(duration.minutes || 0)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDurationString(duration.minutes || 0)}
                      </p>
                    </div>
                    <div className="text-lg font-semibold text-primary">
                      {formatPrice(duration.price || 0)}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Therapist Gender Preference - Only show if treatment allows it */}
      {selectedTreatment?.allowTherapistGenderSelection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("bookings.therapistGenderPreference")}
            </CardTitle>
            <CardDescription>{t("bookings.therapistGenderPreferenceDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={bookingOptions.therapistGenderPreference || "any"}
              onValueChange={handleGenderPreferenceChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("bookings.selectGenderPreference")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("bookings.genderPreference.any")}</SelectItem>
                <SelectItem value="male">{t("bookings.genderPreference.male")}</SelectItem>
                <SelectItem value="female">{t("bookings.genderPreference.female")}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          {t("common.back")}
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {t("common.continue")}
        </Button>
      </div>
    </div>
  )
} 