"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import type {
  BookingInitialData,
  SelectedBookingOptions,
  PopulatedUserSubscription,
  IUserSubscription,
} from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models"
import type { GiftVoucherPlain as IGiftVoucher } from "@/lib/db/models/gift-voucher"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TreatmentSelectionSchema, type TreatmentSelectionFormValues } from "@/lib/validation/booking-schemas"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { AlertCircle, Info, GiftIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { Loader2 } from "lucide-react"
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
  const { t } = useTranslation()
  const [selectedUserSubscription, setSelectedUserSubscription] = useState<PopulatedUserSubscription | null>(null)
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

  const allUsableGiftVouchers = useMemo(() => {
    return initialData.usableGiftVouchers.filter(
      (v) => v.status === "active" || v.status === "partially_used" || v.status === "sent",
    )
  }, [initialData.usableGiftVouchers])

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
    setIsTreatmentLockedBySource(false)
    setIsDurationLockedBySource(false)
    form.reset({
      selectedUserSubscriptionId:
        currentSource === "subscription_redemption" ? form.getValues("selectedUserSubscriptionId") : undefined,
      selectedGiftVoucherId:
        currentSource === "gift_voucher_redemption" ? form.getValues("selectedGiftVoucherId") : undefined,
      selectedTreatmentId: undefined,
      selectedDurationId: undefined,
    })
    setSelectedUserSubscription(null)
    setSelectedVoucherDetails(null)
    setAvailableDurationsForStep([])

    if (currentSource === "new_purchase") {
      setAvailableTreatmentsForStep(initialData.activeTreatments || [])
    } else if (currentSource === "subscription_redemption") {
      setAvailableTreatmentsForStep([])
    } else if (currentSource === "gift_voucher_redemption") {
      setAvailableTreatmentsForStep([])
    }
  }, [bookingOptions.source, initialData.activeTreatments, form])

  useEffect(() => {
    if (bookingOptions.source === "subscription_redemption" && form.getValues("selectedUserSubscriptionId")) {
      const subId = form.getValues("selectedUserSubscriptionId")
      const sub = initialData.activeUserSubscriptions.find((s) => s._id.toString() === subId) as
        | PopulatedUserSubscription
        | undefined
      setSelectedUserSubscription(sub || null)

      if (sub && sub.treatmentId) {
        const treatmentFromSub = sub.treatmentId
        setAvailableTreatmentsForStep([treatmentFromSub])
        form.setValue("selectedTreatmentId", treatmentFromSub._id.toString(), { shouldValidate: true })
        setIsTreatmentLockedBySource(true)

        const activeDurationsForSubTreatment = treatmentFromSub.durations?.filter((d) => d.isActive) || []

        if (sub.selectedDurationId || sub.selectedDurationDetails?._id) {
          const subDurationId = sub.selectedDurationId || sub.selectedDurationDetails?._id.toString()
          const specificDuration = activeDurationsForSubTreatment.find((d) => d._id.toString() === subDurationId)
          if (specificDuration) {
            setAvailableDurationsForStep([specificDuration])
            form.setValue("selectedDurationId", specificDuration._id.toString(), { shouldValidate: true })
            setIsDurationLockedBySource(true)
          } else {
            setAvailableDurationsForStep([])
            form.setValue("selectedDurationId", undefined, { shouldValidate: true })
            setIsDurationLockedBySource(false)
          }
        } else if (treatmentFromSub.pricingType === "duration_based") {
          setAvailableDurationsForStep(activeDurationsForSubTreatment)
          setIsDurationLockedBySource(false)
        } else {
          setAvailableDurationsForStep([])
          form.setValue("selectedDurationId", undefined, { shouldValidate: true })
          setIsDurationLockedBySource(true) // Fixed price, no duration selection needed
        }
      } else {
        setAvailableTreatmentsForStep([])
        setIsTreatmentLockedBySource(false)
        setAvailableDurationsForStep([])
        setIsDurationLockedBySource(false)
      }
    } else if (bookingOptions.source === "subscription_redemption") {
      setSelectedUserSubscription(null)
      setAvailableTreatmentsForStep([])
      setIsTreatmentLockedBySource(false)
      setAvailableDurationsForStep([])
      setIsDurationLockedBySource(false)
      form.setValue("selectedTreatmentId", undefined)
      form.setValue("selectedDurationId", undefined)
    }
  }, [form.watch("selectedUserSubscriptionId"), bookingOptions.source, initialData.activeUserSubscriptions, form])

  useEffect(() => {
    const formVoucherId = form.getValues("selectedGiftVoucherId")
    if (formVoucherId && bookingOptions.source === "gift_voucher_redemption") {
      const voucher = allUsableGiftVouchers.find((v) => v._id.toString() === formVoucherId)
      setSelectedVoucherDetails(voucher || null)

      if (voucher) {
        if (voucher.voucherType === "treatment" && voucher.treatmentId) {
          const treatmentFromVoucher = initialData.activeTreatments.find(
            (t) => t._id.toString() === voucher.treatmentId,
          )
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
                setAvailableDurationsForStep([])
                form.setValue("selectedDurationId", undefined, { shouldValidate: true })
                setIsDurationLockedBySource(false)
              }
            } else if (treatmentFromVoucher.pricingType === "duration_based") {
              setAvailableDurationsForStep(activeDurationsForVoucherTreatment)
              setIsDurationLockedBySource(false)
              form.setValue("selectedDurationId", undefined, { shouldValidate: true })
            } else {
              // Fixed price treatment
              setAvailableDurationsForStep([])
              form.setValue("selectedDurationId", undefined, { shouldValidate: true })
              setIsDurationLockedBySource(true) // No duration selection needed
            }
          } else {
            setAvailableTreatmentsForStep(initialData.activeTreatments || [])
            setIsTreatmentLockedBySource(false)
            form.setValue("selectedTreatmentId", undefined, { shouldValidate: true })
            setAvailableDurationsForStep([])
            setIsDurationLockedBySource(false)
            form.setValue("selectedDurationId", undefined, { shouldValidate: true })
          }
        } else if (voucher.voucherType === "monetary") {
          setAvailableTreatmentsForStep(initialData.activeTreatments || [])
          setIsTreatmentLockedBySource(false)
          setIsDurationLockedBySource(false)
          const currentTreatmentId = form.getValues("selectedTreatmentId")
          if (currentTreatmentId) {
            const treatment = initialData.activeTreatments.find((t) => t._id.toString() === currentTreatmentId)
            if (treatment?.pricingType === "duration_based" && treatment.durations) {
              setAvailableDurationsForStep(treatment.durations.filter((d) => d.isActive))
            } else {
              setAvailableDurationsForStep([])
            }
          } else {
            setAvailableDurationsForStep([])
          }
        } else {
          setAvailableTreatmentsForStep(initialData.activeTreatments || [])
          setIsTreatmentLockedBySource(false)
          setIsDurationLockedBySource(false)
          form.setValue("selectedTreatmentId", undefined, { shouldValidate: true })
          form.setValue("selectedDurationId", undefined, { shouldValidate: true })
        }
      } else {
        setSelectedVoucherDetails(null)
        setAvailableTreatmentsForStep(initialData.activeTreatments || [])
        setIsTreatmentLockedBySource(false)
        setIsDurationLockedBySource(false)
        form.setValue("selectedTreatmentId", undefined)
        form.setValue("selectedDurationId", undefined)
      }
    } else if (bookingOptions.source === "gift_voucher_redemption") {
      setSelectedVoucherDetails(null)
      setAvailableTreatmentsForStep(initialData.activeTreatments || [])
      setIsTreatmentLockedBySource(false)
      setIsDurationLockedBySource(false)
    }
  }, [
    form.watch("selectedGiftVoucherId"),
    bookingOptions.source,
    allUsableGiftVouchers,
    initialData.activeTreatments,
    form,
  ])

  useEffect(() => {
    if (isTreatmentLockedBySource) return

    const formTreatmentId = form.getValues("selectedTreatmentId")
    if (formTreatmentId) {
      const treatment = availableTreatmentsForStep.find((t) => t._id.toString() === formTreatmentId)
      if (treatment?.pricingType === "duration_based" && treatment.durations) {
        const activeDurations = treatment.durations.filter((d) => d.isActive)
        setAvailableDurationsForStep(activeDurations)
        if (activeDurations.length > 0 && !isDurationLockedBySource) {
          const currentDurationId = form.getValues("selectedDurationId")
          if (currentDurationId && !activeDurations.some((d) => d._id.toString() === currentDurationId)) {
            form.setValue("selectedDurationId", undefined, { shouldValidate: true })
          }
        } else if (activeDurations.length === 0) {
          form.setValue("selectedDurationId", undefined, { shouldValidate: true })
        }
      } else {
        setAvailableDurationsForStep([])
        form.setValue("selectedDurationId", undefined, { shouldValidate: true })
      }
    } else {
      setAvailableDurationsForStep([])
      form.setValue("selectedDurationId", undefined, { shouldValidate: true })
    }
  }, [
    form.watch("selectedTreatmentId"),
    availableTreatmentsForStep,
    form,
    isTreatmentLockedBySource,
    isDurationLockedBySource,
  ])

  const onSubmitValidated = (data: TreatmentSelectionFormValues) => {
    const selectedTreatment = availableTreatmentsForStep.find((t) => t._id.toString() === data.selectedTreatmentId)
    if (selectedTreatment?.pricingType === "duration_based" && !data.selectedDurationId && !isDurationLockedBySource) {
      form.setError("selectedDurationId", {
        type: "manual",
        message: t("bookings.validation.durationRequiredForType") || "Duration is required for this treatment.",
      })
      return
    }
    onNext()
  }

  const noSourceSelectionPrompt =
    (bookingOptions.source === "subscription_redemption" && !form.getValues("selectedUserSubscriptionId")) ||
    (bookingOptions.source === "gift_voucher_redemption" && !form.getValues("selectedGiftVoucherId"))

  const treatmentCardFooter = (treatment: ITreatment) => {
    if (
      bookingOptions.source === "gift_voucher_redemption" &&
      selectedVoucherDetails?.voucherType === "treatment" &&
      selectedVoucherDetails?.treatmentId === treatment._id.toString()
    ) {
      return (
        <CardFooter className="mt-auto">
          <p className="font-semibold text-primary text-sm">
            {t("bookings.coveredByGiftVoucher") || "Covered by Gift Voucher"}
          </p>
        </CardFooter>
      )
    }
    if (
      bookingOptions.source === "subscription_redemption" &&
      selectedUserSubscription?.treatmentId?._id.toString() === treatment._id.toString()
    ) {
      return (
        <CardFooter className="mt-auto">
          <p className="font-semibold text-primary text-sm">
            {t("bookings.coveredBySubscription") || "Covered by Subscription"}
          </p>
        </CardFooter>
      )
    }
    return (
      <CardFooter className="mt-auto">
        <p className="font-semibold text-primary text-sm">
          {treatment.pricingType === "fixed"
            ? `${treatment.fixedPrice} ${t("common.currency") || "ILS"}`
            : t("bookings.priceVariesByDuration") || "Price varies by duration"}
        </p>
      </CardFooter>
    )
  }

  const durationSelectItem = (duration: ITreatmentDuration) => {
    if (
      (bookingOptions.source === "gift_voucher_redemption" &&
        selectedVoucherDetails?.voucherType === "treatment" &&
        selectedVoucherDetails?.selectedDurationId === duration._id.toString()) ||
      (bookingOptions.source === "subscription_redemption" &&
        (selectedUserSubscription?.selectedDurationId === duration._id.toString() ||
          selectedUserSubscription?.selectedDurationDetails?._id.toString() === duration._id.toString()))
    ) {
      return (
        <SelectItem key={duration._id.toString()} value={duration._id.toString()}>
          {duration.minutes} {t("common.minutes") || "minutes"} (
          {bookingOptions.source === "gift_voucher_redemption"
            ? t("bookings.coveredByGiftVoucher") || "Covered by Gift Voucher"
            : t("bookings.coveredBySubscription") || "Covered by Subscription"}
          )
        </SelectItem>
      )
    }
    return (
      <SelectItem key={duration._id.toString()} value={duration._id.toString()}>
        {duration.minutes} {t("common.minutes") || "minutes"} - {duration.price} {t("common.currency") || "ILS"}
      </SelectItem>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("bookings.steps.treatment.title") || "Select Your Treatment"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("bookings.steps.treatment.description") || "Choose the service you'd like to book."}
          </p>
        </div>

        {bookingOptions.source === "subscription_redemption" && (
          <FormField
            control={form.control}
            name="selectedUserSubscriptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bookings.steps.treatment.selectSubscription") || "Select Subscription"}</FormLabel>
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
                          t("bookings.steps.treatment.selectSubscriptionPlaceholder") || "Choose a subscription"
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
                        let displayName = `${subTyped.subscriptionId?.name || t("bookings.unknownSubscription") || "Unknown Subscription"}`
                        displayName += ` (${t("bookings.subscriptions.remaining") || "Remaining"}: ${subTyped.remainingQuantity})`
                        if (subTyped.treatmentId?.name) {
                          displayName += ` - ${subTyped.treatmentId.name}`
                          if (subTyped.selectedDurationId && subTyped.treatmentId.durations) {
                            const dur = subTyped.treatmentId.durations.find(
                              (d) => d._id.toString() === subTyped.selectedDurationId?.toString(),
                            )
                            if (dur) displayName += ` (${dur.minutes} ${t("common.minutes") || "min"})`
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
                        {t("bookings.steps.treatment.noSubscriptions") || "No active subscriptions found."}
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
                <FormLabel className="flex items-center">
                  <GiftIcon className="mr-2 h-5 w-5 text-primary" />
                  {t("bookings.steps.treatment.selectVoucher") || "Select Gift Voucher"}
                </FormLabel>
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
                        placeholder={t("bookings.steps.treatment.selectVoucherPlaceholder") || "Choose a gift voucher"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allUsableGiftVouchers.length > 0 ? (
                      allUsableGiftVouchers.map((v) => (
                        <SelectItem key={v._id.toString()} value={v._id.toString()}>
                          {`${v.code} - ${
                            v.voucherType === "treatment"
                              ? `${v.treatmentName || t("bookings.treatmentVoucher") || "Treatment Voucher"}${v.selectedDurationName ? ` (${v.selectedDurationName})` : ""}`
                              : `${t("bookings.monetaryVoucher") || "Monetary Voucher"} (${v.remainingAmount?.toFixed(2)} ${t("common.currency") || "ILS"} ${t("bookings.remaining") || "remaining"})`
                          }`}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {t("bookings.steps.treatment.noVouchers") || "No usable gift vouchers found."}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedVoucherDetails && selectedVoucherDetails.voucherType === "monetary" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("bookings.voucherBalance") || "Voucher Balance"}:{" "}
                    {selectedVoucherDetails.remainingAmount?.toFixed(2)} {t("common.currency") || "ILS"}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {noSourceSelectionPrompt && (
          <Alert variant="default" className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("bookings.steps.treatment.selectSourceFirstTitle") || "Select Source"}</AlertTitle>
            <AlertDescription>
              {bookingOptions.source === "subscription_redemption"
                ? t("bookings.steps.treatment.selectSubscriptionFirstDesc") ||
                  "Please select a subscription to see available treatments."
                : t("bookings.steps.treatment.selectVoucherFirstDesc") ||
                  "Please select a gift voucher to see available treatments."}
            </AlertDescription>
          </Alert>
        )}

        {!noSourceSelectionPrompt && availableTreatmentsForStep.length > 0 && (
          <FormField
            control={form.control}
            name="selectedTreatmentId"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t("bookings.steps.treatment.selectTreatment") || "Select Treatment"}</FormLabel>
                {isTreatmentLockedBySource && availableTreatmentsForStep.length === 1 && (
                  <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t("bookings.steps.treatment.treatmentLockedBySource") ||
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
                        form.setValue("selectedDurationId", undefined, { shouldValidate: true })
                      }
                    }}
                    value={field.value}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
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
                            <CardHeader>
                              <CardTitle>{treatment.name}</CardTitle>
                              {treatment.description && (
                                <CardDescription className="text-xs line-clamp-3">
                                  {treatment.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                            {treatmentCardFooter(treatment)}
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

        {!noSourceSelectionPrompt && availableTreatmentsForStep.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {t("bookings.steps.treatment.noTreatmentsAvailableTitle") || "No Treatments Available"}
            </AlertTitle>
            <AlertDescription>
              {t("bookings.steps.treatment.noTreatmentsAvailableDesc") ||
                "There are no treatments available for your current selection. Please try a different source or contact support."}
            </AlertDescription>
          </Alert>
        )}

        {form.getValues("selectedTreatmentId") && availableDurationsForStep.length > 0 && (
          <FormField
            control={form.control}
            name="selectedDurationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bookings.steps.treatment.selectDuration") || "Select Duration"}</FormLabel>
                {isDurationLockedBySource && availableDurationsForStep.length === 1 && (
                  <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t("bookings.steps.treatment.durationLockedBySource") ||
                        "Duration is determined by your selected subscription/voucher:"}{" "}
                      <strong>
                        {availableDurationsForStep[0].minutes} {t("common.minutes") || "minutes"}
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
                        placeholder={t("bookings.steps.treatment.selectDurationPlaceholder") || "Choose a duration"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableDurationsForStep.map((duration) => durationSelectItem(duration))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {form.getValues("selectedTreatmentId") &&
          availableDurationsForStep.length === 0 &&
          availableTreatmentsForStep.find((t) => t._id.toString() === form.getValues("selectedTreatmentId"))
            ?.pricingType === "duration_based" &&
          !isDurationLockedBySource && ( // Only show if not fixed price and not locked
            <Alert variant="default">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t("bookings.steps.treatment.noDurationsForTreatment") ||
                  "No durations available for the selected treatment."}
              </AlertDescription>
            </Alert>
          )}

        <div className="flex justify-between pt-6">
          <Button variant="outline" type="button" onClick={onPrev} size="lg" disabled={form.formState.isSubmitting}>
            {t("common.back") || "Back"}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid} size="lg">
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.next") || "Next"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
