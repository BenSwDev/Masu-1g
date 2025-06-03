"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { BookingInitialData, SelectedBookingOptions } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import type { ITreatment, ITreatmentDuration, IUserSubscription } from "@/lib/db/models"
import type { GiftVoucherPlain as IGiftVoucher } from "@/lib/db/models/gift-voucher"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TreatmentSelectionSchema, type TreatmentSelectionFormValues } from "@/lib/validation/booking-schemas"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { useTranslation } from "@/lib/translations/i18n"

interface TreatmentSelectionStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  onNext: () => void
  onPrev: () => void
}

export default function TreatmentSelectionStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  onNext,
  onPrev,
}: TreatmentSelectionStepProps) {
  const [selectedSubscriptionDetails, setSelectedSubscriptionDetails] = useState<IUserSubscription | null>(null)
  const [selectedVoucherDetails, setSelectedVoucherDetails] = useState<IGiftVoucher | null>(null)
  const [availableTreatments, setAvailableTreatments] = useState<ITreatment[]>(initialData.activeTreatments || [])
  const [availableDurations, setAvailableDurations] = useState<ITreatmentDuration[]>([])

  const form = useForm<TreatmentSelectionFormValues>({
    resolver: zodResolver(TreatmentSelectionSchema),
    defaultValues: {
      selectedUserSubscriptionId: bookingOptions.selectedUserSubscriptionId,
      selectedGiftVoucherId: bookingOptions.selectedGiftVoucherId,
      selectedTreatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      setBookingOptions((prev) => ({
        ...prev,
        selectedUserSubscriptionId: values.selectedUserSubscriptionId,
        selectedGiftVoucherId: values.selectedGiftVoucherId,
        selectedTreatmentId: values.selectedTreatmentId,
        selectedDurationId: values.selectedDurationId,
      }))
    })
    return () => subscription.unsubscribe()
  }, [form, setBookingOptions])

  useEffect(() => {
    const currentSource = bookingOptions.source
    form.reset({
      // Reset form fields when source changes to avoid stale data
      selectedUserSubscriptionId:
        currentSource === "subscription_redemption" ? form.getValues("selectedUserSubscriptionId") : undefined,
      selectedGiftVoucherId:
        currentSource === "gift_voucher_redemption" ? form.getValues("selectedGiftVoucherId") : undefined,
      selectedTreatmentId: undefined,
      selectedDurationId: undefined,
    })
    setSelectedSubscriptionDetails(null)
    setSelectedVoucherDetails(null)
    setAvailableDurations([])

    if (currentSource === "new_purchase") {
      setAvailableTreatments(initialData.activeTreatments || [])
    } else {
      setAvailableTreatments([]) // Will be populated by sub/voucher selection
    }
  }, [bookingOptions.source, initialData.activeTreatments, form])

  useEffect(() => {
    const formSubId = form.getValues("selectedUserSubscriptionId")
    if (formSubId && bookingOptions.source === "subscription_redemption") {
      const sub = initialData.activeUserSubscriptions.find((s) => s._id.toString() === formSubId)
      setSelectedSubscriptionDetails((sub as IUserSubscription) || null)
      if (sub && sub.treatmentId) {
        const treatmentFromSub = sub.treatmentId as unknown as ITreatment // Assuming populated
        setAvailableTreatments(treatmentFromSub ? [treatmentFromSub] : [])
        form.setValue("selectedTreatmentId", treatmentFromSub?._id.toString(), { shouldValidate: true })
        const preSelectedDurationId =
          sub.selectedDurationId?.toString() || treatmentFromSub?.durations?.find((d) => d.isActive)?._id.toString()
        form.setValue("selectedDurationId", preSelectedDurationId, { shouldValidate: true })
        if (treatmentFromSub?.durations) setAvailableDurations(treatmentFromSub.durations.filter((d) => d.isActive))
      }
    } else if (bookingOptions.source === "subscription_redemption") {
      setSelectedSubscriptionDetails(null)
      setAvailableTreatments([])
    }
  }, [form.watch("selectedUserSubscriptionId"), bookingOptions.source, initialData.activeUserSubscriptions, form])

  useEffect(() => {
    const formVoucherId = form.getValues("selectedGiftVoucherId")
    if (formVoucherId && bookingOptions.source === "gift_voucher_redemption") {
      const voucher = initialData.usableGiftVouchers.find((v) => v._id.toString() === formVoucherId)
      setSelectedVoucherDetails(voucher || null)
      if (voucher?.voucherType === "treatment" && voucher.treatmentId) {
        const treatmentFromVoucher = initialData.activeTreatments.find((t) => t._id.toString() === voucher.treatmentId)
        setAvailableTreatments(treatmentFromVoucher ? [treatmentFromVoucher] : [])
        form.setValue("selectedTreatmentId", treatmentFromVoucher?._id.toString(), { shouldValidate: true })
        const preSelectedDurationId =
          voucher.selectedDurationId?.toString() ||
          treatmentFromVoucher?.durations?.find((d) => d.isActive)?._id.toString()
        form.setValue("selectedDurationId", preSelectedDurationId, { shouldValidate: true })
        if (treatmentFromVoucher?.durations)
          setAvailableDurations(treatmentFromVoucher.durations.filter((d) => d.isActive))
      } else if (voucher?.voucherType === "monetary") {
        setAvailableTreatments(initialData.activeTreatments || [])
      }
    } else if (bookingOptions.source === "gift_voucher_redemption") {
      setSelectedVoucherDetails(null)
      setAvailableTreatments([])
    }
  }, [
    form.watch("selectedGiftVoucherId"),
    bookingOptions.source,
    initialData.usableGiftVouchers,
    initialData.activeTreatments,
    form,
  ])

  useEffect(() => {
    const formTreatmentId = form.getValues("selectedTreatmentId")
    if (formTreatmentId) {
      const treatment = availableTreatments.find((t) => t._id.toString() === formTreatmentId)
      if (treatment?.pricingType === "duration_based" && treatment.durations) {
        const activeDurations = treatment.durations.filter((d) => d.isActive)
        setAvailableDurations(activeDurations)
        // Don't auto-select duration if multiple are available, unless one was pre-selected by sub/voucher
        if (activeDurations.length === 1 && !form.getValues("selectedDurationId")) {
          form.setValue("selectedDurationId", activeDurations[0]._id.toString(), { shouldValidate: true })
        }
      } else {
        setAvailableDurations([])
        form.setValue("selectedDurationId", undefined, { shouldValidate: true })
      }
    } else {
      setAvailableDurations([])
      form.setValue("selectedDurationId", undefined, { shouldValidate: true })
    }
  }, [form.watch("selectedTreatmentId"), availableTreatments, form])

  const onSubmitValidated = (data: TreatmentSelectionFormValues) => {
    const selectedTreatment = availableTreatments.find((t) => t._id.toString() === data.selectedTreatmentId)
    if (selectedTreatment?.pricingType === "duration_based" && !data.selectedDurationId) {
      form.setError("selectedDurationId", {
        type: "manual",
        message: t("bookings.validation.durationRequiredForType"),
      })
      return
    }
    onNext()
  }

  const noTreatmentsForSource =
    (bookingOptions.source === "subscription_redemption" && !form.getValues("selectedUserSubscriptionId")) ||
    (bookingOptions.source === "gift_voucher_redemption" && !form.getValues("selectedGiftVoucherId"))

  const noTreatmentsToList =
    availableTreatments.length === 0 &&
    ((bookingOptions.source === "subscription_redemption" && form.getValues("selectedUserSubscriptionId")) ||
      (bookingOptions.source === "gift_voucher_redemption" && form.getValues("selectedGiftVoucherId")) ||
      bookingOptions.source === "new_purchase")

  const { t } = useTranslation()

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.treatment.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("bookings.steps.treatment.description")}</p>
        </div>

        {bookingOptions.source === "subscription_redemption" && (
          <FormField
            control={form.control}
            name="selectedUserSubscriptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bookings.steps.treatment.selectSubscription")}</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    form.setValue("selectedTreatmentId", undefined, { shouldValidate: true })
                    form.setValue("selectedDurationId", undefined, { shouldValidate: true })
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("bookings.steps.treatment.selectSubscriptionPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {initialData.activeUserSubscriptions.length > 0 ? (
                      initialData.activeUserSubscriptions.map((sub) => (
                        <SelectItem key={sub._id.toString()} value={sub._id.toString()}>
                          {(sub.subscriptionId as any)?.name || t("bookings.unknownSubscription")} (
                          {t("bookings.subscriptions.remaining")}: {sub.remainingQuantity})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {t("bookings.steps.treatment.noSubscriptions")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {bookingOptions.source === "gift_voucher_redemption" && (
          <FormField
            control={form.control}
            name="selectedGiftVoucherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bookings.steps.treatment.selectVoucher")}</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    form.setValue("selectedTreatmentId", undefined, { shouldValidate: true })
                    form.setValue("selectedDurationId", undefined, { shouldValidate: true })
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("bookings.steps.treatment.selectVoucherPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {initialData.usableGiftVouchers.length > 0 ? (
                      initialData.usableGiftVouchers.map((v) => (
                        <SelectItem key={v._id} value={v._id}>
                          {v.code} (
                          {v.voucherType === "monetary"
                            ? `${v.remainingAmount} ${t("common.currency")}`
                            : v.treatmentName || t("bookings.treatmentVoucher")}
                          )
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {t("bookings.steps.treatment.noVouchers")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {noTreatmentsForSource && (
          <Alert variant="default" className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("bookings.steps.treatment.selectSourceFirstTitle")}</AlertTitle>
            <AlertDescription>
              {bookingOptions.source === "subscription_redemption"
                ? t("bookings.steps.treatment.selectSubscriptionFirstDesc")
                : t("bookings.steps.treatment.selectVoucherFirstDesc")}
            </AlertDescription>
          </Alert>
        )}

        {!noTreatmentsForSource && availableTreatments.length > 0 && (
          <FormField
            control={form.control}
            name="selectedTreatmentId"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t("bookings.steps.treatment.selectTreatment")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("selectedDurationId", undefined, { shouldValidate: true })
                    }}
                    value={field.value}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                  >
                    {availableTreatments.map((treatment) => (
                      <FormItem key={treatment._id.toString()}>
                        <FormControl>
                          <RadioGroupItem
                            value={treatment._id.toString()}
                            id={`treatment-${treatment._id.toString()}`}
                            className="peer sr-only"
                          />
                        </FormControl>
                        <Label htmlFor={`treatment-${treatment._id.toString()}`} className="block h-full">
                          <Card
                            className={`flex flex-col cursor-pointer hover:shadow-lg transition-all h-full ${field.value === treatment._id.toString() ? "ring-2 ring-primary border-primary shadow-lg" : "border-border hover:border-muted-foreground/50"}`}
                          >
                            <CardHeader>
                              <CardTitle>{treatment.name}</CardTitle>
                              {treatment.description && (
                                <CardDescription className="text-xs line-clamp-3">
                                  {treatment.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardFooter className="mt-auto">
                              <p className="font-semibold text-primary text-sm">
                                {treatment.pricingType === "fixed"
                                  ? `${treatment.fixedPrice} ${t("common.currency")}`
                                  : t("bookings.priceVariesByDuration")}
                              </p>
                            </CardFooter>
                          </Card>
                        </Label>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {noTreatmentsToList && !noTreatmentsForSource && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("bookings.steps.treatment.noTreatmentsAvailableTitle")}</AlertTitle>
            <AlertDescription>{t("bookings.steps.treatment.noTreatmentsAvailableDesc")}</AlertDescription>
          </Alert>
        )}

        {availableDurations.length > 0 && (
          <FormField
            control={form.control}
            name="selectedDurationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bookings.steps.treatment.selectDuration")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!form.getValues("selectedTreatmentId")}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("bookings.steps.treatment.selectDurationPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableDurations.map((duration) => (
                      <SelectItem key={duration._id.toString()} value={duration._id.toString()}>
                        {duration.minutes} {t("common.minutes")} - {duration.price} {t("common.currency")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-between pt-6">
          <Button variant="outline" type="button" onClick={onPrev} size="lg">
            {t("common.back")}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting} size="lg">
            {t("common.next")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
