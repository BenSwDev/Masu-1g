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
import { Loader2 } from "lucide-react"

interface TreatmentSelectionStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  onNext: () => void
  onPrev: () => void
  translations: Record<string, string>
}

export default function TreatmentSelectionStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  onNext,
  onPrev,
  translations,
}: TreatmentSelectionStepProps) {
  const [selectedUserSubscription, setSelectedUserSubscription] = useState<IUserSubscription | null>(null)
  const [selectedVoucherDetails, setSelectedVoucherDetails] = useState<IGiftVoucher | null>(null)
  const [availableTreatmentsForStep, setAvailableTreatmentsForStep] = useState<ITreatment[]>(
    initialData.activeTreatments || [],
  )
  const [availableDurationsForStep, setAvailableDurationsForStep] = useState<ITreatmentDuration[]>([])
  const [isTreatmentLockedBySource, setIsTreatmentLockedBySource] = useState(false)
  const [isDurationLockedBySource, setIsDurationLockedBySource] = useState(false)

  const form = useForm<TreatmentSelectionFormValues>({
    resolver: zodResolver(TreatmentSelectionSchema),
    defaultValues: {
      selectedUserSubscriptionId: bookingOptions.selectedUserSubscriptionId,
      selectedGiftVoucherId: bookingOptions.selectedGiftVoucherId,
      selectedTreatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
    },
  })

  // Watch form values and update bookingOptions
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

  // Effect to handle source change (new_purchase, subscription, voucher)
  useEffect(() => {
    const currentSource = bookingOptions.source
    setIsTreatmentLockedBySource(false)
    setIsDurationLockedBySource(false)
    form.reset({
      // Reset dependent fields when source changes
      selectedUserSubscriptionId:
        currentSource === "subscription_redemption" ? form.getValues("selectedUserSubscriptionId") : undefined,
      selectedGiftVoucherId:
        currentSource === "gift_voucher_redemption" ? form.getValues("selectedGiftVoucherId") : undefined,
      selectedTreatmentId: undefined,
      selectedDurationId: undefined,
    })
    setSelectedUserSubscription(null)
    // setSelectedVoucherDetails(null); // This is handled by its own effect
    setAvailableDurationsForStep([])

    if (currentSource === "new_purchase") {
      setAvailableTreatmentsForStep(initialData.activeTreatments || [])
    } else if (currentSource === "subscription_redemption") {
      // Treatments will be determined by selected subscription
      setAvailableTreatmentsForStep([]) // Clear until a subscription is chosen
    } else if (currentSource === "gift_voucher_redemption") {
      // Treatments will be determined by selected voucher
      setAvailableTreatmentsForStep([]) // Clear until a voucher is chosen
    }
  }, [bookingOptions.source, initialData.activeTreatments, form])

  // Effect for when a user subscription is selected
  useEffect(() => {
    if (bookingOptions.source === "subscription_redemption" && form.getValues("selectedUserSubscriptionId")) {
      const subId = form.getValues("selectedUserSubscriptionId")
      const sub = initialData.activeUserSubscriptions.find((s) => s._id.toString() === subId) as
        | (IUserSubscription & { treatmentId: ITreatment; selectedDurationDetails?: ITreatmentDuration })
        | undefined
      setSelectedUserSubscription(sub || null)

      if (sub && sub.treatmentId) {
        const treatmentFromSub = sub.treatmentId // This should be the populated ITreatment object
        setAvailableTreatmentsForStep([treatmentFromSub])
        form.setValue("selectedTreatmentId", treatmentFromSub._id.toString(), { shouldValidate: true })
        setIsTreatmentLockedBySource(true)

        const activeDurationsForSubTreatment = treatmentFromSub.durations?.filter((d) => d.isActive) || []

        if (sub.selectedDurationId) {
          // Subscription is for a specific duration
          const specificDuration = activeDurationsForSubTreatment.find(
            (d) => d._id.toString() === sub.selectedDurationId?.toString(),
          )
          if (specificDuration) {
            setAvailableDurationsForStep([specificDuration])
            form.setValue("selectedDurationId", specificDuration._id.toString(), { shouldValidate: true })
            setIsDurationLockedBySource(true)
          } else {
            // Duration specified in sub not found or inactive in treatment
            setAvailableDurationsForStep([])
            form.setValue("selectedDurationId", undefined, { shouldValidate: true })
            setIsDurationLockedBySource(false) // Allow selection if sub's duration is invalid
          }
        } else if (treatmentFromSub.pricingType === "duration_based") {
          // Subscription for treatment, any valid duration
          setAvailableDurationsForStep(activeDurationsForSubTreatment)
          setIsDurationLockedBySource(false)
          // Do not auto-select duration here, let user choose from available for that treatment
        } else {
          // Fixed price treatment from subscription
          setAvailableDurationsForStep([])
          form.setValue("selectedDurationId", undefined, { shouldValidate: true })
          setIsDurationLockedBySource(true) // No duration to select
        }
      } else {
        // No specific treatment tied to subscription (should not happen with current data model) or sub not found
        setAvailableTreatmentsForStep([])
        setIsTreatmentLockedBySource(false)
        setAvailableDurationsForStep([])
        setIsDurationLockedBySource(false)
      }
    } else if (bookingOptions.source === "subscription_redemption") {
      // No subscription selected yet
      setSelectedUserSubscription(null)
      setAvailableTreatmentsForStep([])
      setIsTreatmentLockedBySource(false)
      setAvailableDurationsForStep([])
      setIsDurationLockedBySource(false)
      form.setValue("selectedTreatmentId", undefined)
      form.setValue("selectedDurationId", undefined)
    }
  }, [form.watch("selectedUserSubscriptionId"), bookingOptions.source, initialData.activeUserSubscriptions, form])

  // Effect for when a gift voucher is selected
  useEffect(() => {
    // Similar logic to subscription selection
    const formVoucherId = form.getValues("selectedGiftVoucherId")
    if (formVoucherId && bookingOptions.source === "gift_voucher_redemption") {
      const voucher = initialData.usableGiftVouchers.find((v) => v._id.toString() === formVoucherId)
      setSelectedVoucherDetails(voucher || null)

      if (voucher?.voucherType === "treatment" && voucher.treatmentId) {
        const treatmentFromVoucher = initialData.activeTreatments.find((t) => t._id.toString() === voucher.treatmentId)
        if (treatmentFromVoucher) {
          setAvailableTreatmentsForStep([treatmentFromVoucher])
          form.setValue("selectedTreatmentId", treatmentFromVoucher._id.toString(), { shouldValidate: true })
          setIsTreatmentLockedBySource(true)

          const activeDurationsForVoucherTreatment = treatmentFromVoucher.durations?.filter((d) => d.isActive) || []
          if (voucher.selectedDurationId) {
            const specificDuration = activeDurationsForVoucherTreatment.find(
              (d) => d._id.toString() === voucher.selectedDurationId?.toString(),
            )
            if (specificDuration) {
              setAvailableDurationsForStep([specificDuration])
              form.setValue("selectedDurationId", specificDuration._id.toString(), { shouldValidate: true })
              setIsDurationLockedBySource(true)
            } else {
              setAvailableDurationsForStep([]) // Invalid duration in voucher
              setIsDurationLockedBySource(false)
            }
          } else if (treatmentFromVoucher.pricingType === "duration_based") {
            setAvailableDurationsForStep(activeDurationsForVoucherTreatment)
            setIsDurationLockedBySource(false)
          } else {
            // Fixed price
            setAvailableDurationsForStep([])
            setIsDurationLockedBySource(true)
          }
        } else {
          // Treatment from voucher not found/active
          setAvailableTreatmentsForStep([])
          setIsTreatmentLockedBySource(false)
        }
      } else if (voucher?.voucherType === "monetary") {
        setAvailableTreatmentsForStep(initialData.activeTreatments || [])
        setIsTreatmentLockedBySource(false)
        setIsDurationLockedBySource(false) // Duration selection depends on chosen treatment
      } else {
        // No voucher selected or voucher has no treatment info
        setAvailableTreatmentsForStep([])
        setIsTreatmentLockedBySource(false)
      }
    } else if (bookingOptions.source === "gift_voucher_redemption") {
      setSelectedVoucherDetails(null)
      setAvailableTreatmentsForStep([])
      setIsTreatmentLockedBySource(false)
      setAvailableDurationsForStep([])
      setIsDurationLockedBySource(false)
      form.setValue("selectedTreatmentId", undefined)
      form.setValue("selectedDurationId", undefined)
    }
  }, [
    form.watch("selectedGiftVoucherId"),
    bookingOptions.source,
    initialData.usableGiftVouchers,
    initialData.activeTreatments,
    form,
  ])

  // Effect for when selectedTreatmentId changes (for new_purchase or monetary voucher)
  useEffect(() => {
    if (isTreatmentLockedBySource) return // Don't override if locked by sub/voucher

    const formTreatmentId = form.getValues("selectedTreatmentId")
    if (formTreatmentId) {
      const treatment = availableTreatmentsForStep.find((t) => t._id.toString() === formTreatmentId)
      if (treatment?.pricingType === "duration_based" && treatment.durations) {
        const activeDurations = treatment.durations.filter((d) => d.isActive)
        setAvailableDurationsForStep(activeDurations)
        // Do not auto-select duration if multiple are available
        if (activeDurations.length === 1 && !form.getValues("selectedDurationId")) {
          // form.setValue("selectedDurationId", activeDurations[0]._id.toString(), { shouldValidate: true });
        }
      } else {
        // Fixed price or no durations
        setAvailableDurationsForStep([])
        form.setValue("selectedDurationId", undefined, { shouldValidate: true })
      }
    } else {
      // No treatment selected
      setAvailableDurationsForStep([])
      form.setValue("selectedDurationId", undefined, { shouldValidate: true })
    }
  }, [form.watch("selectedTreatmentId"), availableTreatmentsForStep, form, isTreatmentLockedBySource])

  const onSubmitValidated = (data: TreatmentSelectionFormValues) => {
    const selectedTreatment = availableTreatmentsForStep.find((t) => t._id.toString() === data.selectedTreatmentId)
    if (selectedTreatment?.pricingType === "duration_based" && !data.selectedDurationId) {
      form.setError("selectedDurationId", {
        type: "manual",
        message:
          translations["bookings.validation.durationRequiredForType"] || "Duration is required for this treatment.",
      })
      return
    }
    onNext()
  }

  const noSourceSelectionPrompt =
    (bookingOptions.source === "subscription_redemption" && !form.getValues("selectedUserSubscriptionId")) ||
    (bookingOptions.source === "gift_voucher_redemption" && !form.getValues("selectedGiftVoucherId"))

  const noTreatmentsToListAfterSourceSelection =
    !isTreatmentLockedBySource && // Only show if not locked (i.e. new purchase or monetary voucher)
    availableTreatmentsForStep.length === 0 &&
    bookingOptions.source === "new_purchase" // Or monetary voucher case

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        {/* Title and Description */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {translations["bookings.steps.treatment.title"] || "Select Your Treatment"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {translations["bookings.steps.treatment.description"] || "Choose the service you'd like to book."}
          </p>
        </div>

        {/* Subscription Selector */}
        {bookingOptions.source === "subscription_redemption" && (
          <FormField
            control={form.control}
            name="selectedUserSubscriptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {translations["bookings.steps.treatment.selectSubscription"] || "Select Subscription"}
                </FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    // Reset dependent fields, effects will repopulate
                    form.setValue("selectedTreatmentId", undefined, { shouldValidate: false })
                    form.setValue("selectedDurationId", undefined, { shouldValidate: false })
                    setIsTreatmentLockedBySource(false) // Will be re-evaluated by effect
                    setIsDurationLockedBySource(false)
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          translations["bookings.steps.treatment.selectSubscriptionPlaceholder"] ||
                          "Choose a subscription"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {initialData.activeUserSubscriptions.length > 0 ? (
                      initialData.activeUserSubscriptions.map((sub) => {
                        const subTyped = sub as IUserSubscription & {
                          subscriptionId: { name: string }
                          treatmentId?: ITreatment
                        }
                        let displayName = `${subTyped.subscriptionId?.name || translations["bookings.unknownSubscription"] || "Unknown Subscription"}`
                        displayName += ` (${translations["bookings.subscriptions.remaining"] || "Remaining"}: ${subTyped.remainingQuantity})`
                        if (subTyped.treatmentId?.name) {
                          displayName += ` - ${subTyped.treatmentId.name}`
                          if (subTyped.selectedDurationId && subTyped.treatmentId.durations) {
                            const dur = subTyped.treatmentId.durations.find(
                              (d) => d._id.toString() === subTyped.selectedDurationId?.toString(),
                            )
                            if (dur) displayName += ` (${dur.minutes} ${translations["common.minutes"] || "min"})`
                          }
                        }
                        return (
                          <SelectItem key={sub._id.toString()} value={sub._id.toString()}>
                            {displayName}
                          </SelectItem>
                        )
                      })
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {translations["bookings.steps.treatment.noSubscriptions"] || "No active subscriptions found."}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Gift Voucher Selector (similar structure to subscription) */}
        {bookingOptions.source === "gift_voucher_redemption" && (
          <FormField
            control={form.control}
            name="selectedGiftVoucherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{translations["bookings.steps.treatment.selectVoucher"] || "Select Gift Voucher"}</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    form.setValue("selectedTreatmentId", undefined, { shouldValidate: false })
                    form.setValue("selectedDurationId", undefined, { shouldValidate: false })
                    setIsTreatmentLockedBySource(false)
                    setIsDurationLockedBySource(false)
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          translations["bookings.steps.treatment.selectVoucherPlaceholder"] || "Choose a gift voucher"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {initialData.usableGiftVouchers.length > 0 ? (
                      initialData.usableGiftVouchers.map((v) => (
                        <SelectItem key={v._id.toString()} value={v._id.toString()}>
                          {v.code} (
                          {v.voucherType === "monetary"
                            ? `${v.remainingAmount} ${translations["common.currency"] || "ILS"}`
                            : v.treatmentName || translations["bookings.treatmentVoucher"] || "Treatment Voucher"}
                          )
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {translations["bookings.steps.treatment.noVouchers"] || "No usable gift vouchers found."}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Prompt to select a source if needed */}
        {noSourceSelectionPrompt && (
          <Alert variant="default" className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>
              {translations["bookings.steps.treatment.selectSourceFirstTitle"] || "Select Source"}
            </AlertTitle>
            <AlertDescription>
              {bookingOptions.source === "subscription_redemption"
                ? translations["bookings.steps.treatment.selectSubscriptionFirstDesc"] ||
                  "Please select a subscription to see available treatments."
                : translations["bookings.steps.treatment.selectVoucherFirstDesc"] ||
                  "Please select a gift voucher to see available treatments."}
            </AlertDescription>
          </Alert>
        )}

        {/* Treatment Selector */}
        {!noSourceSelectionPrompt && availableTreatmentsForStep.length > 0 && (
          <FormField
            control={form.control}
            name="selectedTreatmentId"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{translations["bookings.steps.treatment.selectTreatment"] || "Select Treatment"}</FormLabel>
                {isTreatmentLockedBySource && availableTreatmentsForStep.length === 1 && (
                  <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {translations["bookings.steps.treatment.treatmentLockedBySource"] ||
                        "Treatment is determined by your selected subscription/voucher:"}{" "}
                      <strong>{availableTreatmentsForStep[0].name}</strong>
                    </AlertDescription>
                  </Alert>
                )}
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => {
                      if (!isTreatmentLockedBySource) {
                        field.onChange(value)
                        form.setValue("selectedDurationId", undefined, { shouldValidate: true }) // Reset duration
                      }
                    }}
                    value={field.value}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                    // disabled={isTreatmentLockedBySource} // This disables the whole group. We want to disable individual items if needed or just show one.
                  >
                    {availableTreatmentsForStep.map((treatment) => (
                      <FormItem key={treatment._id.toString()}>
                        <FormControl>
                          <RadioGroupItem
                            value={treatment._id.toString()}
                            id={`treatment-${treatment._id.toString()}`}
                            className="peer sr-only"
                            disabled={isTreatmentLockedBySource && field.value !== treatment._id.toString()}
                          />
                        </FormControl>
                        <Label
                          htmlFor={`treatment-${treatment._id.toString()}`}
                          className={`block h-full ${isTreatmentLockedBySource && field.value !== treatment._id.toString() ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <Card
                            className={`flex flex-col hover:shadow-lg transition-all h-full ${field.value === treatment._id.toString() ? "ring-2 ring-primary border-primary shadow-lg" : "border-border hover:border-muted-foreground/50"}`}
                          >
                            {/* ... Card content ... */}
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
                                  ? `${treatment.fixedPrice} ${translations["common.currency"] || "ILS"}`
                                  : translations["bookings.priceVariesByDuration"] || "Price varies by duration"}
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

        {/* No treatments available message */}
        {!noSourceSelectionPrompt && availableTreatmentsForStep.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {translations["bookings.steps.treatment.noTreatmentsAvailableTitle"] || "No Treatments Available"}
            </AlertTitle>
            <AlertDescription>
              {translations["bookings.steps.treatment.noTreatmentsAvailableDesc"] ||
                "There are no treatments available for your current selection. Please try a different source or contact support."}
            </AlertDescription>
          </Alert>
        )}

        {/* Duration Selector */}
        {form.getValues("selectedTreatmentId") && availableDurationsForStep.length > 0 && (
          <FormField
            control={form.control}
            name="selectedDurationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{translations["bookings.steps.treatment.selectDuration"] || "Select Duration"}</FormLabel>
                {isDurationLockedBySource && availableDurationsForStep.length === 1 && (
                  <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {translations["bookings.steps.treatment.durationLockedBySource"] ||
                        "Duration is determined by your selected subscription/voucher:"}{" "}
                      <strong>
                        {availableDurationsForStep[0].minutes} {translations["common.minutes"] || "minutes"}
                      </strong>
                    </AlertDescription>
                  </Alert>
                )}
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isDurationLockedBySource || !form.getValues("selectedTreatmentId")}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          translations["bookings.steps.treatment.selectDurationPlaceholder"] || "Choose a duration"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableDurationsForStep.map((duration) => (
                      <SelectItem key={duration._id.toString()} value={duration._id.toString()}>
                        {duration.minutes} {translations["common.minutes"] || "minutes"} - {duration.price}{" "}
                        {translations["common.currency"] || "ILS"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {/* Message if treatment selected but no durations available (e.g. fixed price treatment) */}
        {form.getValues("selectedTreatmentId") &&
          availableDurationsForStep.length === 0 &&
          availableTreatmentsForStep.find((t) => t._id.toString() === form.getValues("selectedTreatmentId"))
            ?.pricingType === "duration_based" &&
          !isDurationLockedBySource && (
            <Alert variant="default">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {translations["bookings.steps.treatment.noDurationsForTreatment"] ||
                  "No durations available for the selected treatment."}
              </AlertDescription>
            </Alert>
          )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" type="button" onClick={onPrev} size="lg" disabled={form.formState.isSubmitting}>
            {translations["common.back"] || "Back"}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid} size="lg">
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {translations["common.next"] || "Next"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
