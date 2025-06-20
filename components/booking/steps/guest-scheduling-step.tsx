"use client"

import { useState, useMemo, useCallback, memo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Calendar } from "@/components/common/ui/calendar"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Calendar as CalendarIcon, Clock, Info } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import type { BookingInitialData, SelectedBookingOptions, TimeSlot } from "@/types/booking"

interface GuestSchedulingStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  timeSlots: TimeSlot[]
  isTimeSlotsLoading: boolean
  workingHoursNote?: string
  onNext: () => void
  onPrev: () => void
}

// Memoized time slot button component for better performance
const TimeSlotButton = memo(({ 
  slot, 
  isSelected, 
  onSelect 
}: { 
  slot: TimeSlot
  isSelected: boolean
  onSelect: (time: string) => void
}) => (
  <Button
    variant={isSelected ? "default" : "outline"}
    size="sm"
    onClick={() => onSelect(slot.time)}
    className="text-xs flex flex-col items-center py-2 min-h-[60px]"
  >
    <span>{slot.time}</span>
    {slot.surcharge && (
      <span className="text-orange-600 text-[10px] font-medium mt-1">
        +{slot.surcharge.amount.toFixed(2)} ₪
      </span>
    )}
  </Button>
))

TimeSlotButton.displayName = "TimeSlotButton"

export const GuestSchedulingStep = memo(function GuestSchedulingStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  timeSlots,
  isTimeSlotsLoading,
  workingHoursNote,
  onNext,
  onPrev,
}: GuestSchedulingStepProps) {
  const { t, language, dir } = useTranslation()

  const selectedTreatment = useMemo(() => {
    return (initialData?.activeTreatments || []).find(
      (t) => t._id.toString() === bookingOptions.selectedTreatmentId
    )
  }, [initialData?.activeTreatments, bookingOptions.selectedTreatmentId])

  const selectedDuration = useMemo(() => {
    if (selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations) {
      return selectedTreatment.durations.find((d: any) => d._id.toString() === bookingOptions.selectedDurationId)
    }
    return null
  }, [selectedTreatment, bookingOptions.selectedDurationId])

  const { availableTimeSlots, unavailableTimeSlots } = useMemo(() => {
    const available = timeSlots.filter(slot => slot.isAvailable)
    const unavailable = timeSlots.filter(slot => !slot.isAvailable)
    return { availableTimeSlots: available, unavailableTimeSlots: unavailable }
  }, [timeSlots])

  const canProceed = useMemo(() => {
    return bookingOptions.bookingDate && bookingOptions.bookingTime
  }, [bookingOptions.bookingDate, bookingOptions.bookingTime])

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setBookingOptions((prev) => ({
        ...prev,
        bookingDate: date.toISOString(),
        bookingTime: undefined, // Reset time when date changes
      }))
    }
  }, [setBookingOptions])

  const handleTimeSelect = useCallback((time: string) => {
    setBookingOptions((prev) => ({
      ...prev,
      bookingTime: time,
    }))
  }, [setBookingOptions])

  const formatDateString = useCallback((date: Date) => {
    return format(date, "EEEE, d MMMM yyyy", { locale: language === "he" ? he : undefined })
  }, [language])

  const getTreatmentDurationText = useMemo(() => {
    if (selectedTreatment?.pricingType === "fixed") {
      return selectedTreatment.defaultDuration 
        ? `${selectedTreatment.defaultDuration} ${t("common.minutes")}`
        : t("treatments.standardDuration")
    }
    if (selectedDuration) {
      return `${selectedDuration.minutes} ${t("common.minutes")}`
    }
    return ""
  }, [selectedTreatment, selectedDuration, t])

  // Disable past dates and possibly weekends based on business rules
  const isDateDisabled = useCallback((date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }, [])

  // Find the selected time slot (if any)
  const selectedTimeSlot = useMemo(() => {
    if (!bookingOptions.bookingTime) return null
    return timeSlots.find(slot => slot.time === bookingOptions.bookingTime) || null
  }, [bookingOptions.bookingTime, timeSlots])

  // Calculate base price and surcharge
  const priceCalculation = useMemo(() => {
    const basePrice = selectedTreatment?.pricingType === "fixed"
      ? selectedTreatment.fixedPrice || 0
      : selectedDuration?.price || 0
    const surchargeAmount = selectedTimeSlot?.surcharge?.amount || 0
    const surchargeReason = selectedTimeSlot?.surcharge?.description || ""
    const finalPrice = basePrice + surchargeAmount
    
    return { basePrice, surchargeAmount, surchargeReason, finalPrice }
  }, [selectedTreatment, selectedDuration, selectedTimeSlot])

  // Fix: selectedDate should be Date | undefined
  const bookingDateObj = useMemo(() => {
    if (!bookingOptions.bookingDate) return undefined
    try {
      const dateObj = new Date(bookingOptions.bookingDate as string)
      return isNaN(dateObj.getTime()) ? undefined : dateObj
    } catch {
      return undefined
    }
  }, [bookingOptions.bookingDate])

  return (
    <div className="space-y-6" dir={dir}>
      <div className="text-center">
        <CalendarIcon className="mx-auto h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.scheduling.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("bookings.steps.scheduling.description")}</p>
      </div>

      {/* Treatment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bookings.selectedTreatment")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{t("treatments.treatment")}:</span>
              <span>{selectedTreatment?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("treatments.duration")}:</span>
              <span>{getTreatmentDurationText}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("bookings.therapistPreference")}:</span>
              <span>
                {bookingOptions.therapistGenderPreference === "any" && t("bookings.genderPreference.any")}
                {bookingOptions.therapistGenderPreference === "male" && t("bookings.genderPreference.male")}
                {bookingOptions.therapistGenderPreference === "female" && t("bookings.genderPreference.female")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {t("bookings.selectDate")}
            </CardTitle>
            <CardDescription>{t("bookings.selectDateDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={bookingDateObj}
              onSelect={(date) => handleDateSelect(Array.isArray(date) ? date[0] : (date && 'from' in date ? date.from : date))}
              disabled={isDateDisabled}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("bookings.selectTime")}
            </CardTitle>
            <CardDescription>
              {bookingOptions.bookingDate 
                ? t("bookings.availableTimesFor") + ' ' + formatDateString(new Date(bookingOptions.bookingDate as string))
                : t("bookings.selectDateFirst")
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!bookingOptions.bookingDate ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>{t("bookings.selectDateToShowTimes")}</p>
              </div>
            ) : isTimeSlotsLoading ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-muted-foreground">{t("common.loading")}...</span>
                </div>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : availableTimeSlots.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>{t("bookings.noAvailableTimes")}</p>
                {workingHoursNote && (
                  <p className="text-sm mt-2">{workingHoursNote}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Available Times */}
                <div>
                  <h4 className="text-sm font-medium mb-3 text-green-700">
                    {t("bookings.availableTimes")} ({availableTimeSlots.length})
                  </h4>
                  <div className="max-h-80 overflow-y-auto border rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-2">
                    {availableTimeSlots.map((slot) => (
                      <TimeSlotButton
                        key={slot.time}
                        slot={slot}
                        isSelected={bookingOptions.bookingTime === slot.time}
                        onSelect={handleTimeSelect}
                      />
                    ))}
                    </div>
                  </div>
                </div>

                {/* Unavailable Times */}
                {unavailableTimeSlots.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-gray-500">
                      {t("bookings.unavailableTimes")} ({unavailableTimeSlots.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                      <div className="grid grid-cols-3 gap-2">
                      {unavailableTimeSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant="outline"
                          size="sm"
                          disabled
                          className="text-xs opacity-50"
                        >
                          {slot.time}
                        </Button>
                      ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Working Hours Note */}
                {workingHoursNote && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>{workingHoursNote}</AlertDescription>
                  </Alert>
                )}

                {/* Surcharge Breakdown */}
                {bookingOptions.bookingTime && selectedTimeSlot?.surcharge && (
                  <div className="mt-4 p-4 rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100">
                    <div className="flex items-center gap-2 text-orange-800 text-sm font-semibold mb-3">
                      <Info className="h-4 w-4" />
                      <span>תוספת מחיר:</span>
                      <span className="font-bold">{priceCalculation.surchargeReason || "תוספת זמן מיוחד"}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                      <span>מחיר בסיס:</span>
                      <span>{priceCalculation.basePrice.toFixed(2)} ₪</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>תוספת:</span>
                      <span className="text-orange-700">+{priceCalculation.surchargeAmount.toFixed(2)} ₪</span>
                    </div>
                    <hr className="my-2 border-orange-300" />
                    <div className="flex justify-between font-bold text-base mt-2">
                      <span>סך הכל:</span>
                      <span className="text-primary">{priceCalculation.finalPrice.toFixed(2)} ₪</span>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
}) 