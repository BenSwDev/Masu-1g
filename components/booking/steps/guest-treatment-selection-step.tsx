"use client"

import { useState, useMemo, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { Sparkles, Clock, Users, GiftIcon, Ticket, Tag, Loader2 } from "lucide-react"
import type { BookingInitialData, SelectedBookingOptions } from "@/types/booking"
import type { GiftVoucherPlain as IGiftVoucher } from "@/lib/db/models/gift-voucher"
import type { ITreatment } from "@/lib/db/models/treatment"
import { validateRedemptionCode } from "@/actions/booking-actions"
import { Input } from "@/components/common/ui/input"

interface GuestTreatmentSelectionStepProps {
  hideGenderPreference?: boolean
  /**
   * Whether to show the price of each treatment/duration option. When
   * purchasing a subscription the price is calculated later so it can be
   * hidden, while during a normal booking flow the price should be shown.
   */
  showPrice?: boolean

  initialCategory?: string

  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  onNext: () => void
  onPrev: () => void
  voucher?: IGiftVoucher
  userSubscription?: any
  currentUser?: any
}

export function GuestTreatmentSelectionStep({
  hideGenderPreference,
  showPrice = true,
  initialData,
  initialCategory,
  bookingOptions,
  setBookingOptions,
  onNext,
  onPrev,
  voucher,
  userSubscription,
  currentUser,
}: GuestTreatmentSelectionStepProps) {
  const { t, dir } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null)
  const [availableTreatmentsForStep, setAvailableTreatmentsForStep] = useState<ITreatment[]>(
    initialData?.activeTreatments || [],
  )
  const [isTreatmentLockedBySource, setIsTreatmentLockedBySource] = useState(false)
  
  // Redemption code state
  const [redemptionCode, setRedemptionCode] = useState("")
  const [isValidatingCode, setIsValidatingCode] = useState(false)
  const [redemptionError, setRedemptionError] = useState<string | null>(null)

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
      (t) => (t._id || t.id)?.toString() === bookingOptions.selectedTreatmentId
    )
  }, [availableTreatmentsForStep, bookingOptions.selectedTreatmentId])

  const showCategorySelection =
    (bookingOptions.source === "new_purchase" ||
      (bookingOptions.source === "gift_voucher_redemption" && voucher?.voucherType === "monetary")) &&
    !isTreatmentLockedBySource

  // Effect to handle redemption-specific treatment locking
  useEffect(() => {
    setIsTreatmentLockedBySource(false)
    setSelectedCategory(null)
    
    if (bookingOptions.redemptionData) {
      const redemption = bookingOptions.redemptionData
      
      if (redemption.type === "treatment_voucher" && (redemption.data as any)?.treatmentId) {
        const treatmentFromVoucher = (initialData.activeTreatments || []).find(
          (t) => (t._id || t.id)?.toString() === (redemption.data as any).treatmentId?.toString(),
        )
        if (treatmentFromVoucher) {
          setAvailableTreatmentsForStep([treatmentFromVoucher])
          setSelectedCategory(treatmentFromVoucher.category || "Uncategorized")
          setBookingOptions((prev) => ({
            ...prev,
            selectedTreatmentId: (treatmentFromVoucher._id || treatmentFromVoucher.id)?.toString(),
            selectedDurationId: (redemption.data as any).selectedDurationId?.toString(),
          }))
          setIsTreatmentLockedBySource(true)
        }
      } else if (redemption.type === "subscription" && (redemption.data as any)?.treatmentId) {
        const treatmentFromSub = (redemption.data as any).treatmentId
        setAvailableTreatmentsForStep([treatmentFromSub])
        setSelectedCategory(treatmentFromSub.category || "Uncategorized")
        setBookingOptions((prev) => ({
          ...prev,
          selectedTreatmentId: (treatmentFromSub._id || treatmentFromSub.id)?.toString(),
          selectedDurationId: (redemption.data as any).selectedDurationId?.toString(),
        }))
        setIsTreatmentLockedBySource(true)
      } else {
        // Monetary voucher or coupon - show all treatments
        setAvailableTreatmentsForStep(initialData.activeTreatments || [])
        setIsTreatmentLockedBySource(false)
      }
    } else {
      // No redemption - show all treatments
      setAvailableTreatmentsForStep(initialData.activeTreatments || [])
      setIsTreatmentLockedBySource(false)
      setSelectedCategory(initialCategory ?? null)
    }
  }, [bookingOptions.redemptionData, initialData.activeTreatments, setBookingOptions, initialCategory])

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

  const handleRedemptionCodeSubmit = async () => {
    if (!redemptionCode.trim()) return
    
    setIsValidatingCode(true)
    setRedemptionError(null)
    
    try {
      const result = await validateRedemptionCode(redemptionCode.trim(), currentUser?.id)
      
      if (result.success && result.redemption) {
        // Update booking options with redemption data
        const redemption = result.redemption
        setBookingOptions(prev => ({
          ...prev,
          redemptionCode: redemptionCode.trim(),
          redemptionData: redemption,
          source: redemption.type === "subscription" 
            ? "subscription_redemption" 
            : redemption.type.includes("voucher") 
              ? "gift_voucher_redemption"
              : "new_purchase",
          selectedGiftVoucherId: redemption.type.includes("voucher") 
            ? (redemption.data as any)?._id?.toString()
            : undefined,
          selectedUserSubscriptionId: redemption.type === "subscription"
            ? (redemption.data as any)?._id?.toString()
            : undefined,
          appliedCouponCode: redemption.type.includes("coupon")
            ? redemptionCode.trim()
            : undefined
        }))
        
        // Clear the input
        setRedemptionCode("")
      } else {
        setRedemptionError(result.error || "קוד לא תקף")
      }
    } catch (error) {
      setRedemptionError("שגיאה בבדיקת הקוד")
    } finally {
      setIsValidatingCode(false)
    }
  }

  const handleClearRedemption = () => {
    setBookingOptions(prev => ({
      ...prev,
      redemptionCode: undefined,
      redemptionData: undefined,
      source: "new_purchase",
      selectedGiftVoucherId: undefined,
      selectedUserSubscriptionId: undefined,
      appliedCouponCode: undefined
    }))
    setRedemptionCode("")
    setRedemptionError(null)
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="text-center">
        <Sparkles className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.treatment.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.steps.treatment.description")}</p>
      </div>

      {/* Redemption Code Input - Show only when no active redemption */}
      {!bookingOptions.redemptionData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              הזן קוד מימוש
            </CardTitle>
            <CardDescription>הזן קוד קופון, שובר מתנה או מנוי</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="הזן קוד מימוש"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && handleRedemptionCodeSubmit()}
                  className="text-base"
                />
                {redemptionError && (
                  <p className="text-sm text-red-500 mt-1">{redemptionError}</p>
                )}
              </div>
              <Button
                onClick={handleRedemptionCodeSubmit}
                disabled={isValidatingCode || !redemptionCode.trim()}
                type="button"
              >
                {isValidatingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                בדוק קוד
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Redemption Display */}
      {bookingOptions.redemptionData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {bookingOptions.redemptionData.type.includes("voucher") && <GiftIcon className="h-5 w-5 text-primary" />}
              {bookingOptions.redemptionData.type === "subscription" && <Ticket className="h-5 w-5 text-primary" />}
              {bookingOptions.redemptionData.type.includes("coupon") && <Tag className="h-5 w-5 text-primary" />}
              מימוש פעיל
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-green-800">
                    {bookingOptions.redemptionCode}
                  </p>
                  <p className="text-sm text-green-600">
                    {bookingOptions.redemptionData.type === "subscription" && (
                      `מנוי - נותרו: ${(bookingOptions.redemptionData.data as any)?.remainingQuantity} טיפולים`
                    )}
                    {bookingOptions.redemptionData.type === "treatment_voucher" && (
                      `שובר טיפול - ${(bookingOptions.redemptionData.data as any)?.treatmentName}`
                    )}
                    {bookingOptions.redemptionData.type === "monetary_voucher" && (
                      `שובר כספי - יתרה: ${(bookingOptions.redemptionData.data as any)?.remainingAmount?.toFixed(2)} ₪`
                    )}
                    {bookingOptions.redemptionData.type.includes("coupon") && (
                      `קופון - ${(bookingOptions.redemptionData.data as any)?.discountType === "percentage" 
                        ? `${(bookingOptions.redemptionData.data as any)?.discountValue}%` 
                        : `₪${(bookingOptions.redemptionData.data as any)?.discountValue}`}`
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRedemption}
                  className="text-red-600 hover:text-red-700"
                >
                  הסר
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Treatment Selection */}
      {((showCategorySelection && selectedCategory) || !showCategorySelection) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("treatments.selectTreatment")}</CardTitle>
            <CardDescription>
              {isTreatmentLockedBySource 
                ? t("treatments.treatmentLockedBySource")
                : t("treatments.selectTreatmentDescription")
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={bookingOptions.selectedTreatmentId || ""}
              onValueChange={handleTreatmentSelect}
              className="space-y-4"
            >
              {(showCategorySelection ? filteredTreatmentsByCategory : availableTreatmentsForStep).map((treatment) => {
                const treatmentId = (treatment._id || treatment.id)?.toString()
                const isSelected = bookingOptions.selectedTreatmentId === treatmentId
                const isLocked = isTreatmentLockedBySource && !isSelected
                
                if (!treatmentId) return null // Skip treatments without valid ID
                
                return (
                  <Label
                    key={treatmentId}
                    htmlFor={treatmentId}
                    className={`flex cursor-pointer items-center p-4 border rounded-lg hover:bg-muted/50 ${
                      dir === "rtl" ? "flex-row-reverse space-x-reverse" : ""
                    } ${isLocked ? "opacity-50 cursor-not-allowed" : ""} ${
                      isSelected ? "ring-2 ring-primary border-primary" : ""
                    }`}
                  >
                    <RadioGroupItem 
                      value={treatmentId} 
                      id={treatmentId}
                      disabled={isLocked}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{treatment.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{treatment.description}</p>
                      </div>
                      <div className="text-right">
                        {showPrice && treatment.pricingType === "fixed" && (
                          <div className="text-lg font-semibold text-primary">
                            {formatPrice(treatment.fixedPrice || 0)}
                          </div>
                        )}
                        {treatment.pricingType === "duration_based" && (
                          <Badge variant="secondary">{t("treatments.durationBased")}</Badge>
                        )}
                      </div>
                    </div>
                  </Label>
                )
              })}
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
              {availableDurations.map((duration: any) => {
                const durationId = (duration._id || duration.id)?.toString()
                
                if (!durationId) return null // Skip durations without valid ID
                
                return (
                  <Label
                    key={durationId}
                    htmlFor={durationId}
                    className={`flex cursor-pointer items-center p-4 border rounded-lg hover:bg-muted/50 ${dir === "rtl" ? "flex-row-reverse space-x-reverse" : ""}`}
                  >
                    <RadioGroupItem value={durationId} id={durationId} />
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
                )
              })}
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