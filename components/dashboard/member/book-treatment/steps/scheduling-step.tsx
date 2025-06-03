"use client"

import type React from "react"
import { useEffect } from "react"
import type { BookingInitialData, SelectedBookingOptions, TimeSlot } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Calendar } from "@/components/common/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Label } from "@/components/common/ui/label"
import { Textarea } from "@/components/common/ui/textarea"
import { Loader2, Info } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SchedulingDetailsSchema, type SchedulingFormValues } from "@/lib/validation/booking-schemas"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/common/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { useTranslation } from "@/lib/translations/i18n"

interface SchedulingStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  timeSlots: TimeSlot[]
  isTimeSlotsLoading: boolean
  onNext: () => void
  onPrev: () => void
  workingHoursNote?: string // Added this prop
}

export default function SchedulingStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  timeSlots,
  isTimeSlotsLoading,
  onNext,
  onPrev,
  workingHoursNote,
}: SchedulingStepProps) {
  const { t } = useTranslation()
  const form = useForm<SchedulingFormValues>({
    resolver: zodResolver(SchedulingDetailsSchema),
    defaultValues: {
      bookingDate: bookingOptions.bookingDate || undefined,
      bookingTime: bookingOptions.bookingTime || undefined,
      selectedAddressId: bookingOptions.selectedAddressId || undefined,
      therapistGenderPreference: bookingOptions.therapistGenderPreference || "any",
      notes: bookingOptions.notes || "",
      isFlexibleTime: bookingOptions.isFlexibleTime || false,
      flexibilityRangeHours: bookingOptions.flexibilityRangeHours || 2,
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      setBookingOptions((prev) => ({
        ...prev,
        ...values,
        bookingDate: values.bookingDate || null,
      }))
    })
    return () => subscription.unsubscribe()
  }, [form, setBookingOptions])

  useEffect(() => {
    const previousDate = form.formState.defaultValues?.bookingDate
    const currentDate = form.getValues("bookingDate")
    if (currentDate && previousDate?.getTime() !== currentDate.getTime()) {
      form.setValue("bookingTime", undefined, { shouldValidate: true })
    }
  }, [form.watch("bookingDate")]) // Watch for changes in bookingDate

  const onSubmitValidated = (data: SchedulingFormValues) => {
    onNext()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Ensure comparison is for dates only

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.scheduling.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("bookings.steps.scheduling.description")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <FormField
            control={form.control}
            name="bookingDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("bookings.steps.scheduling.selectDate")}</FormLabel>
                <FormControl>
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    className="rounded-md border self-start shadow-sm bg-card"
                    disabled={(date) => date < today}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="bookingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("bookings.steps.scheduling.selectTime")}</FormLabel>
                  {isTimeSlotsLoading ? (
                    <div className="flex items-center space-x-2 h-10 p-2 border rounded-md bg-muted animate-pulse">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">{t("common.loading")}</span>
                    </div>
                  ) : timeSlots.length > 0 ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.getValues("bookingDate")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("bookings.steps.scheduling.selectTimePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots
                          .filter((slot) => slot.isAvailable)
                          .map((slot) => (
                            <SelectItem key={slot.time} value={slot.time}>
                              {slot.time}
                              {slot.surcharge &&
                                ` (+${slot.surcharge.amount.toFixed(2)} ${t("common.currency") || "ILS"})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Alert variant="default" className="text-sm">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {form.getValues("bookingDate")
                          ? workingHoursNote
                            ? t(workingHoursNote)
                            : t("bookings.steps.scheduling.noSlotsAvailable")
                          : t("bookings.steps.scheduling.selectDateFirst")}
                      </AlertDescription>
                    </Alert>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {workingHoursNote && timeSlots.length === 0 && form.getValues("bookingDate") && (
              <Alert variant="default" className="text-sm">
                <Info className="h-4 w-4" />
                <AlertDescription>{t(workingHoursNote)}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="isFlexibleTime"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-3 shadow-sm bg-card">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} id="flexibleTime" />
                  </FormControl>
                  <div className="space-y-0.5">
                    <Label htmlFor="flexibleTime" className="text-sm font-medium cursor-pointer">
                      {t("bookings.steps.scheduling.flexibleTimeLabel")}
                    </Label>
                    <FormDescription className="text-xs">
                      {t("bookings.steps.scheduling.flexibleTimeDesc")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="selectedAddressId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bookings.steps.scheduling.selectAddress")}</FormLabel>
              {initialData.userAddresses.length > 0 ? (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("bookings.steps.scheduling.selectAddressPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {initialData.userAddresses.map((address) => (
                      <SelectItem key={address._id.toString()} value={address._id.toString()}>
                        {`${address.street} ${address.streetNumber || ""}, ${address.city}`}
                        {address.isPrimary && ` (${t("addresses.primary")})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t("bookings.steps.scheduling.noSavedAddressesTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("bookings.steps.scheduling.noSavedAddressesDesc")}
                    {/* TODO: Add button to open AddressForm modal or link to dashboard page */}
                  </AlertDescription>
                </Alert>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="therapistGenderPreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bookings.steps.scheduling.therapistPreference")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="any">{t("preferences.treatment.genderAny")}</SelectItem>
                  <SelectItem value="male">{t("preferences.treatment.genderMale")}</SelectItem>
                  <SelectItem value="female">{t("preferences.treatment.genderFemale")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bookings.steps.scheduling.notes")}</FormLabel>
              <FormControl>
                <Textarea placeholder={t("bookings.steps.scheduling.notesPlaceholder")} {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between pt-6">
          <Button variant="outline" type="button" onClick={onPrev} disabled={form.formState.isSubmitting} size="lg">
            {t("common.back")}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || !initialData.userAddresses.length} size="lg">
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.next")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
