"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import type { BookingInitialData, SelectedBookingOptions, PopulatedUserSubscription } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import type { ITreatment } from "@/lib/db/models"
import type { GiftVoucherPlain as IGiftVoucher } from "@/lib/db/models/gift-voucher"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TreatmentSelectionSchema, type TreatmentSelectionFormValues } from "@/lib/validation/booking-schemas"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { GiftIcon, Loader2 } from "lucide-react"
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedUserSubscription, setSelectedUserSubscription] = useState<PopulatedUserSubscription | null>(null)
  const [selectedVoucherDetails, setSelectedVoucherDetails] = useState<IGiftVoucher | null>(null)
  const [availableTreatmentsForStep, setAvailableTreatmentsForStep] = useState<ITreatment[]>(
    initialData.activeTreatments || [],
  )
  const [isTreatmentLockedBySource, setIsTreatmentLockedBySource] = useState(false)

  const form = useForm<TreatmentSelectionFormValues>({
    resolver: zodResolver(TreatmentSelectionSchema),
    defaultValues: {
      selectedUserSubscriptionId: bookingOptions.selectedUserSubscriptionId,
      selectedGiftVoucherId: bookingOptions.selectedGiftVoucherId,
      selectedTreatmentId: bookingOptions.selectedTreatmentId,
      selectedDurationId: bookingOptions.selectedDurationId,
      therapistGenderPreference: bookingOptions.therapistGenderPreference || "any",
    },
  })

  const treatmentCategories = useMemo(() => {
    const categories = new Set(initialData.activeTreatments.map((t) => t.category || "Uncategorized"))
    return Array.from(categories)
  }, [initialData.activeTreatments])

  const filteredTreatmentsByCategory = useMemo(() => {
    if (!selectedCategory) return []
    return availableTreatmentsForStep.filter((t) => (t.category || "Uncategorized") === selectedCategory)
  }, [selectedCategory, availableTreatmentsForStep])

  const showCategorySelection =
    (bookingOptions.source === "new_purchase" ||
      (bookingOptions.source === "gift_voucher_redemption" && selectedVoucherDetails?.voucherType === "monetary")) &&
    !isTreatmentLockedBySource

  useEffect(() => {
    const subscription = form.watch((values) => {
      setBookingOptions((prev) => ({
        ...prev,
        ...values,
      }))
    })
    return () => subscription.unsubscribe()
  }, [form, setBookingOptions])

  // Reset logic when source changes
  useEffect(() => {
    const currentSource = bookingOptions.source
    setIsTreatmentLockedBySource(false)
    setSelectedCategory(null)
    form.reset({
      selectedUserSubscriptionId:
        currentSource === "subscription_redemption" ? form.getValues("selectedUserSubscriptionId") : undefined,
      selectedGiftVoucherId:
        currentSource === "gift_voucher_redemption" ? form.getValues("selectedGiftVoucherId") : undefined,
      selectedTreatmentId: undefined,
      selectedDurationId: undefined,
      therapistGenderPreference: "any",
    })
    setSelectedUserSubscription(null)
    setSelectedVoucherDetails(null)

    if (currentSource === "new_purchase") {
      setAvailableTreatmentsForStep(initialData.activeTreatments || [])
    } else {
      setAvailableTreatmentsForStep([])
    }
  }, [bookingOptions.source, initialData.activeTreatments, form])

  // Logic for subscription selection
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
        setSelectedCategory(treatmentFromSub.category || "Uncategorized")
        form.setValue("selectedTreatmentId", treatmentFromSub._id.toString(), { shouldValidate: true })
        setIsTreatmentLockedBySource(true)

        if (sub.selectedDurationId || sub.selectedDurationDetails?._id) {
          const subDurationId = sub.selectedDurationId || sub.selectedDurationDetails?._id.toString()
          form.setValue("selectedDurationId", subDurationId, { shouldValidate: true })
        }
      }
    }
  }, [form.watch("selectedUserSubscriptionId"), bookingOptions.source, initialData.activeUserSubscriptions, form])

  // Logic for gift voucher selection
  useEffect(() => {
    const formVoucherId = form.getValues("selectedGiftVoucherId")
    if (formVoucherId && bookingOptions.source === "gift_voucher_redemption") {
      const voucher = initialData.usableGiftVouchers.find((v) => v._id.toString() === formVoucherId)
      setSelectedVoucherDetails(voucher || null)

      if (voucher?.voucherType === "treatment" && voucher.treatmentId) {
        const treatmentFromVoucher = initialData.activeTreatments.find((t) => t._id.toString() === voucher.treatmentId)
        if (treatmentFromVoucher) {
          setAvailableTreatmentsForStep([treatmentFromVoucher])
          setSelectedCategory(treatmentFromVoucher.category || "Uncategorized")
          form.setValue("selectedTreatmentId", treatmentFromVoucher._id.toString(), { shouldValidate: true })
          setIsTreatmentLockedBySource(true)
          if (voucher.selectedDurationId) {
            form.setValue("selectedDurationId", voucher.selectedDurationId.toString(), { shouldValidate: true })
          }
        }
      } else {
        // Monetary voucher or no specific treatment
        setAvailableTreatmentsForStep(initialData.activeTreatments || [])
        setIsTreatmentLockedBySource(false)
      }
    }
  }, [
    form.watch("selectedGiftVoucherId"),
    bookingOptions.source,
    initialData.usableGiftVouchers,
    initialData.activeTreatments,
    form,
  ])

  const onSubmitValidated = (data: TreatmentSelectionFormValues) => {
    const selectedTreatment = availableTreatmentsForStep.find((t) => t._id.toString() === data.selectedTreatmentId)
    if (selectedTreatment?.pricingType === "duration_based" && !data.selectedDurationId) {
      form.setError("selectedDurationId", {
        type: "manual",
        message: t("bookings.validation.durationRequiredForType"),
      })
      return
    }
    onNext()
  }

  const renderTreatmentCard = (treatment: ITreatment) => {
    const isSelected = form.watch("selectedTreatmentId") === treatment._id.toString()
    const isLocked = isTreatmentLockedBySource && !isSelected
    const isDurationBased =
      treatment.pricingType === "duration_based" && treatment.durations && treatment.durations.length > 0

    return (
      <FormItem key={treatment._id.toString()}>
        <FormControl>
          <RadioGroupItem
            value={treatment._id.toString()}
            id={`treatment-${treatment._id.toString()}`}
            className="peer sr-only"
            disabled={isLocked}
            onClick={() => {
              if (!isLocked) {
                form.setValue("selectedTreatmentId", treatment._id.toString())
                form.setValue("selectedDurationId", undefined, { shouldValidate: true })
              }
            }}
          />
        </FormControl>
        <Label
          htmlFor={`treatment-${treatment._id.toString()}`}
          className={`block h-full ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <Card
            className={`flex flex-col hover:shadow-lg transition-all h-full ${isSelected ? "ring-2 ring-primary border-primary shadow-lg" : "border-border hover:border-muted-foreground/50"}`}
          >
            <CardHeader>
              <CardTitle>{treatment.name}</CardTitle>
              {treatment.description && (
                <CardDescription className="text-xs line-clamp-3">{treatment.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow">
              {isSelected && isDurationBased && (
                <Controller
                  control={form.control}
                  name="selectedDurationId"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        {t("bookings.steps.treatment.selectDuration")}
                      </FormLabel>
                      {treatment.durations
                        ?.filter((d) => d.isActive)
                        .map((duration) => (
                          <FormItem key={duration._id.toString()} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={duration._id.toString()} id={`${treatment._id}-${duration._id}`} />
                            </FormControl>
                            <Label
                              htmlFor={`${treatment._id}-${duration._id}`}
                              className="font-normal w-full flex justify-between"
                            >
                              <span>
                                {duration.minutes} {t("common.minutes")}
                              </span>
                              <span className="font-semibold text-primary/90">
                                {duration.price} {t("common.currency")}
                              </span>
                            </Label>
                          </FormItem>
                        ))}
                      <FormMessage>{form.formState.errors.selectedDurationId?.message}</FormMessage>
                    </RadioGroup>
                  )}
                />
              )}
            </CardContent>
            <CardFooter className="mt-auto">
              {!isDurationBased && (
                <p className="font-semibold text-primary text-sm">
                  {treatment.fixedPrice} {t("common.currency")}
                </p>
              )}
            </CardFooter>
          </Card>
        </Label>
      </FormItem>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.treatment.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("bookings.steps.treatment.description")}</p>
        </div>

        {/* Source-specific selection (Subscription/Voucher) */}
        {bookingOptions.source === "subscription_redemption" && (
          <FormField
            control={form.control}
            name="selectedUserSubscriptionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bookings.steps.treatment.selectSubscription")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("bookings.steps.treatment.selectSubscriptionPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>{/* ... options ... */}</SelectContent>
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
                  {t("bookings.steps.treatment.selectVoucher")}
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("bookings.steps.treatment.selectVoucherPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>{/* ... options ... */}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Category Selection */}
        {showCategorySelection && (
          <FormItem>
            <FormLabel>{t("treatments.category")}</FormLabel>
            <Select
              onValueChange={(value) => {
                setSelectedCategory(value)
                form.setValue("selectedTreatmentId", undefined)
                form.setValue("selectedDurationId", undefined)
              }}
              value={selectedCategory || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("treatments.selectCategoryPlaceholder")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {treatmentCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`treatments.categories.${cat.toLowerCase()}`, cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}

        {/* Treatment Selection */}
        <div className="space-y-4">
          {((showCategorySelection && selectedCategory) || !showCategorySelection) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(showCategorySelection ? filteredTreatmentsByCategory : availableTreatmentsForStep).map(
                renderTreatmentCard,
              )}
            </div>
          )}
        </div>

        {/* Therapist Gender Preference */}
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

        <div className="flex justify-between pt-6">
          <Button variant="outline" type="button" onClick={onPrev} size="lg" disabled={form.formState.isSubmitting}>
            {t("common.back")}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid} size="lg">
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.next")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
