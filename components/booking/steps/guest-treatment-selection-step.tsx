"use client"

import { useState, useMemo, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { Sparkles, Clock, Users, GiftIcon, Ticket, CheckCircle, Circle, DollarSign } from "lucide-react"
import type { BookingInitialData, SelectedBookingOptions } from "@/types/booking"
import type { GiftVoucherPlain as IGiftVoucher } from "@/lib/db/models/gift-voucher"
import type { ITreatment } from "@/lib/db/models/treatment"
import { cn } from "@/lib/utils"

interface GuestTreatmentSelectionStepProps {
  hideGenderPreference?: boolean
  /**
   * Whether to show the price of each treatment/duration option. When
   * purchasing a subscription the price is calculated later so it can be
   * hidden, while during a normal booking flow the price should be shown.
   */
  showPrice?: boolean

  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  onNext: () => void
  onPrev: () => void
  voucher?: IGiftVoucher
  userSubscription?: any
}

export function GuestTreatmentSelectionStep({
  hideGenderPreference,
  showPrice = true,
  initialData,
  bookingOptions,
  setBookingOptions,
  onNext,
  onPrev,
  voucher,
  userSubscription,
}: GuestTreatmentSelectionStepProps) {
  const { t, dir, language } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [availableTreatmentsForStep, setAvailableTreatmentsForStep] = useState<ITreatment[]>(
    initialData?.activeTreatments || [],
  )
  const [isTreatmentLockedBySource, setIsTreatmentLockedBySource] = useState(false)

  const treatmentCategories = useMemo(() => {
    const categories = new Set(availableTreatmentsForStep.map((t) => t.category || "Uncategorized"))
    return Array.from(categories)
  }, [availableTreatmentsForStep])

  const filteredTreatmentsByCategory = useMemo(() => {
    if (!selectedCategory) return []
    return availableTreatmentsForStep.filter((t) => (t.category || "Uncategorized") === selectedCategory)
  }, [selectedCategory, availableTreatmentsForStep])

  const selectedTreatment = useMemo(() => {
    return availableTreatmentsForStep.find(
      (t) => t._id.toString() === bookingOptions.selectedTreatmentId
    )
  }, [availableTreatmentsForStep, bookingOptions.selectedTreatmentId])

  const showCategorySelection =
    (bookingOptions.source === "new_purchase" ||
      (bookingOptions.source === "gift_voucher_redemption" && voucher?.voucherType === "monetary")) &&
    !isTreatmentLockedBySource

  // Effect to handle voucher/subscription specific treatment locking
  useEffect(() => {
    setIsTreatmentLockedBySource(false)
    setSelectedCategory(null)
    
    if (bookingOptions.source === "gift_voucher_redemption" && voucher) {
      if (voucher.voucherType === "treatment" && voucher.treatmentId) {
        const treatmentFromVoucher = (initialData.activeTreatments || []).find(
          (t) => t._id.toString() === voucher.treatmentId?.toString(),
        )
        if (treatmentFromVoucher) {
          setAvailableTreatmentsForStep([treatmentFromVoucher])
          setSelectedCategory(treatmentFromVoucher.category || "Uncategorized")
          setBookingOptions((prev) => ({
            ...prev,
            selectedTreatmentId: treatmentFromVoucher._id.toString(),
            selectedDurationId: voucher.selectedDurationId?.toString(),
          }))
          setIsTreatmentLockedBySource(true)
        }
      } else {
        // Monetary voucher - show all treatments
        setAvailableTreatmentsForStep(initialData.activeTreatments || [])
        setIsTreatmentLockedBySource(false)
      }
    } else if (bookingOptions.source === "subscription_redemption" && userSubscription) {
      if (userSubscription.treatmentId) {
        const treatmentFromSub = userSubscription.treatmentId
        setAvailableTreatmentsForStep([treatmentFromSub])
        setSelectedCategory(treatmentFromSub.category || "Uncategorized")
        setBookingOptions((prev) => ({
          ...prev,
          selectedTreatmentId: treatmentFromSub._id.toString(),
          selectedDurationId: userSubscription.selectedDurationId?.toString(),
        }))
        setIsTreatmentLockedBySource(true)
      }
    } else {
      // New purchase
      setAvailableTreatmentsForStep(initialData.activeTreatments || [])
      setIsTreatmentLockedBySource(false)
    }
  }, [bookingOptions.source, voucher, userSubscription, initialData.activeTreatments, setBookingOptions])

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
    if (selectedTreatment?.allowTherapistGenderSelection && !hideGenderPreference && !bookingOptions.therapistGenderPreference) return false
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
    <div className="space-y-6" dir={dir} lang={language}>
      <div className="text-center">
        <Sparkles className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.treatment.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.steps.treatment.description")}</p>
      </div>

      {/* Show voucher/subscription selection for redemption */}
      {bookingOptions.source === "gift_voucher_redemption" && voucher && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GiftIcon className="h-5 w-5 text-primary" />
              {t("bookings.steps.treatment.selectedVoucher")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-green-800">
                    {voucher.code}
                  </p>
                  <p className="text-sm text-green-600">
                    {voucher.voucherType === "treatment" 
                      ? `${voucher.treatmentName}${voucher.selectedDurationName ? ` - ${voucher.selectedDurationName}` : ""}`
                      : `${t("bookings.monetaryVoucher")} - ${t("bookings.balance")}: ${voucher.remainingAmount?.toFixed(2)} ${t("common.currency")}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {bookingOptions.source === "subscription_redemption" && userSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              {t("bookings.steps.treatment.selectedSubscription")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-blue-800">
                    {userSubscription.subscriptionId?.name || t("bookings.unknownSubscription")}
                  </p>
                  <p className="text-sm text-blue-600">
                    {t("bookings.subscriptions.remaining")}: {userSubscription.remainingQuantity}
                  </p>
                  {userSubscription.treatmentId && (
                    <p className="text-sm text-blue-600">
                      {userSubscription.treatmentId.name}
                      {userSubscription.selectedDurationDetails && 
                        ` (${userSubscription.selectedDurationDetails.minutes} ${t("common.minutes")})`
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Selection */}
      {showCategorySelection && (
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
      )}

              {/* Treatment Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableTreatmentsForStep.map((treatment) => {
            const treatmentId = treatment._id?.toString() || ""
            const isSelected = bookingOptions.selectedTreatmentId === treatmentId
            
            return (
              <Card 
                key={treatmentId}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  isSelected 
                    ? "ring-2 ring-primary shadow-lg" 
                    : "hover:border-primary/50"
                )}
                onClick={() => handleTreatmentSelect(treatmentId)}
              >
                <CardContent className="p-4">
                  <div className={`flex items-start justify-between gap-3 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg leading-tight mb-2">{treatment.name}</h3>
                      
                      {/* Duration and Price Row */}
                      <div className={`flex items-center gap-4 text-sm text-muted-foreground mb-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                        <div className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                          <Clock className="h-4 w-4" />
                          <span>{typeof treatment.durations?.[0] === 'number' ? treatment.durations[0] : 60} {t("treatments.minutes") || "דקות"}</span>
                        </div>
                        <div className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                          <DollarSign className="h-4 w-4" />
                          <span>₪{treatment.fixedPrice || 0}</span>
                        </div>
                      </div>

                      {/* Category Badge */}
                      <Badge variant="secondary" className="text-xs">
                        {treatment.category || t("treatments.general") || "כללי"}
                      </Badge>
                    </div>

                    {/* Selection Indicator */}
                    <div className={`flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                      {isSelected ? (
                        <CheckCircle className="h-6 w-6 fill-current" />
                      ) : (
                        <Circle className="h-6 w-6" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

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
                <Label
                  key={duration._id.toString()}
                  htmlFor={duration._id.toString()}
                  className={`flex cursor-pointer items-center p-4 border rounded-lg hover:bg-muted/50 ${dir === "rtl" ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  <RadioGroupItem value={duration._id.toString()} id={duration._id.toString()} />
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{duration.name || formatDurationString(duration.minutes || 0)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDurationString(duration.minutes || 0)}
                      </p>
                    </div>
                    {showPrice && (
                      <div className="text-lg font-semibold text-primary">
                        {formatPrice(duration.price || 0)}
                      </div>
                    )}
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Therapist Gender Preference - Only show if treatment allows it */}
      {selectedTreatment?.allowTherapistGenderSelection && !hideGenderPreference && (
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