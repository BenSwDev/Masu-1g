"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Coins, Info, CheckCircle2, XCircle } from "lucide-react"
import type { ITreatment } from "@/lib/db/models/treatment"
import { createTreatment, updateTreatment, type TreatmentFormData } from "@/actions/treatment-actions"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/translations/i18n"
import { useDirection } from "@/lib/translations/i18n"

const AVAILABLE_DURATIONS = [60, 75, 90, 120]

interface TreatmentFormProps {
  treatment?: ITreatment | null
  onSuccess: (treatment: ITreatment) => void
  onCancel: () => void
}

export function TreatmentForm({ treatment, onSuccess, onCancel }: TreatmentFormProps) {
  const { t } = useTranslation()
  const { dir } = useDirection()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [professionalPriceType, setProfessionalPriceType] = useState<"amount" | "percentage">("amount")
  const [durationPriceTypes, setDurationPriceTypes] = useState<Record<number, "amount" | "percentage">>({})
  const [activeTab, setActiveTab] = useState("basic")

  const formSchema = z
    .object({
      name: z.string().min(2, t("admin.treatments.validation.nameMinLength")),
      category: z.enum(["massages", "facial_treatments"]),
      description: z.string().optional(),
      isActive: z.boolean(),
      pricingType: z.enum(["fixed", "duration_based"]),
      fixedPrice: z.number().min(0).optional(),
      fixedProfessionalPrice: z.number().min(0).optional(),
      durations: z
        .array(
          z.object({
            minutes: z.number(),
            price: z.number().min(0),
            professionalPrice: z.number().min(0),
            isActive: z.boolean(),
          }),
        )
        .optional(),
    })
    .refine(
      (data) => {
        if (data.pricingType === "fixed") {
          return data.fixedPrice !== undefined && data.fixedProfessionalPrice !== undefined
        } else {
          return data.durations && data.durations.some((d) => d.isActive)
        }
      },
      {
        message: t("admin.treatments.validation.priceRequired"),
        path: ["pricingType"],
      },
    )

  const form = useForm<TreatmentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "massages",
      description: "",
      isActive: true,
      pricingType: "fixed",
      fixedPrice: 0,
      fixedProfessionalPrice: 0,
      durations: AVAILABLE_DURATIONS.map((minutes) => ({
        minutes,
        price: 0,
        professionalPrice: 0,
        isActive: false,
      })),
    },
  })

  useEffect(() => {
    if (treatment) {
      form.reset({
        name: treatment.name,
        category: treatment.category,
        description: treatment.description || "",
        isActive: treatment.isActive,
        pricingType: treatment.pricingType,
        fixedPrice: treatment.fixedPrice || 0,
        fixedProfessionalPrice: treatment.fixedProfessionalPrice || 0,
        durations:
          treatment.pricingType === "duration_based"
            ? AVAILABLE_DURATIONS.map((minutes) => {
                const existing = treatment.durations?.find((d) => d.minutes === minutes)
                return existing || { minutes, price: 0, professionalPrice: 0, isActive: false }
              })
            : AVAILABLE_DURATIONS.map((minutes) => ({
                minutes,
                price: 0,
                professionalPrice: 0,
                isActive: false,
              })),
      })
    }
  }, [treatment, form])

  const handleProfessionalPriceChange = (value: string, type: "amount" | "percentage") => {
    const numValue = Number.parseFloat(value) || 0
    const fixedPrice = form.getValues("fixedPrice") || 0

    if (type === "percentage") {
      const amount = Math.round((fixedPrice * numValue) / 100)
      form.setValue("fixedProfessionalPrice", amount)
    } else {
      form.setValue("fixedProfessionalPrice", numValue)
    }
  }

  const handleDurationProfessionalPriceChange = (
    durationIndex: number,
    value: string,
    type: "amount" | "percentage",
  ) => {
    const numValue = Number.parseFloat(value) || 0
    const durations = form.getValues("durations") || []
    const duration = durations[durationIndex]

    if (type === "percentage") {
      const amount = Math.round((duration.price * numValue) / 100)
      form.setValue(`durations.${durationIndex}.professionalPrice`, amount)
    } else {
      form.setValue(`durations.${durationIndex}.professionalPrice`, numValue)
    }
  }

  const onSubmit = async (data: TreatmentFormData) => {
    setIsSubmitting(true)
    try {
      const result = treatment ? await updateTreatment(treatment._id, data) : await createTreatment(data)

      if (result.success && result.treatment) {
        toast({
          title: treatment
            ? t("admin.treatments.notifications.updateSuccess")
            : t("admin.treatments.notifications.createSuccess"),
          variant: "default",
        })
        onSuccess(result.treatment)
      } else {
        toast({
          title: t("admin.treatments.notifications.error"),
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("admin.treatments.notifications.error"),
        description: t("admin.treatments.notifications.saveFailed"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const pricingType = form.watch("pricingType")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" dir={dir}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="basic">{t("admin.treatments.form.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="pricing">{t("admin.treatments.form.tabs.pricing")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">{t("admin.treatments.form.fields.name")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("admin.treatments.form.placeholders.name")}
                        className="border-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      {t("admin.treatments.form.fields.category")}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-2">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="massages">{t("admin.treatments.categories.massages")}</SelectItem>
                        <SelectItem value="facial_treatments">
                          {t("admin.treatments.categories.facialTreatments")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("admin.treatments.form.fields.description")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("admin.treatments.form.placeholders.description")}
                      rows={3}
                      className="border-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border-2 p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {field.value ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <FormLabel className="text-base font-medium">
                        {t("admin.treatments.form.fields.status")}
                      </FormLabel>
                    </div>
                    <FormDescription>{t("admin.treatments.form.descriptions.status")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Coins className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">{t("admin.treatments.form.sections.pricing")}</h3>
              </div>

              <FormField
                control={form.control}
                name="pricingType"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-base font-medium">
                      {t("admin.treatments.form.fields.pricingType")}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <div className="flex items-start space-x-2 space-x-reverse border-2 rounded-lg p-4 hover:bg-muted/20 transition-colors cursor-pointer">
                          <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                          <div className="space-y-1 w-full">
                            <label htmlFor="fixed" className="text-base font-medium cursor-pointer block">
                              {t("admin.treatments.pricingTypes.fixed")}
                            </label>
                            <p className="text-sm text-muted-foreground">
                              {t("admin.treatments.form.descriptions.fixedPricing")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 space-x-reverse border-2 rounded-lg p-4 hover:bg-muted/20 transition-colors cursor-pointer">
                          <RadioGroupItem value="duration_based" id="duration_based" className="mt-1" />
                          <div className="space-y-1 w-full">
                            <label htmlFor="duration_based" className="text-base font-medium cursor-pointer block">
                              {t("admin.treatments.pricingTypes.durationBased")}
                            </label>
                            <p className="text-sm text-muted-foreground">
                              {t("admin.treatments.form.descriptions.durationBasedPricing")}
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {pricingType === "fixed" ? (
                <Card className="border-2 border-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {t("admin.treatments.form.sections.fixedPrice")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="fixedPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">
                              {t("admin.treatments.form.fields.generalPrice")}
                            </FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                                  placeholder="0"
                                  className={`${dir === "rtl" ? "pr-8 text-right" : "pl-8 text-left"} border-2`}
                                />
                              </FormControl>
                              <span
                                className={`absolute ${dir === "rtl" ? "right" : "left"}-3 top-1/2 -translate-y-1/2 text-muted-foreground`}
                              >
                                ₪
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <FormLabel className="text-base font-medium">
                          {t("admin.treatments.form.fields.professionalPrice")}
                        </FormLabel>
                        <div className="flex gap-2 items-end">
                          <Select
                            value={professionalPriceType}
                            onValueChange={(value: "amount" | "percentage") => setProfessionalPriceType(value)}
                          >
                            <SelectTrigger className="w-28 border-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amount">{t("admin.treatments.form.priceTypes.amount")}</SelectItem>
                              <SelectItem value="percentage">
                                {t("admin.treatments.form.priceTypes.percentage")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              placeholder={professionalPriceType === "amount" ? "0" : "0%"}
                              onChange={(e) => handleProfessionalPriceChange(e.target.value, professionalPriceType)}
                              className={`${dir === "rtl" ? "pr-8 text-right" : "pl-8 text-left"} border-2 ${
                                professionalPriceType === "percentage"
                                  ? `${dir === "rtl" ? "pr-10" : "pl-10"}`
                                  : `${dir === "rtl" ? "pr-8" : "pl-8"}`
                              }`}
                            />
                            <span
                              className={`absolute ${dir === "rtl" ? "right" : "left"}-3 top-1/2 -translate-y-1/2 text-muted-foreground`}
                            >
                              {professionalPriceType === "amount" ? "₪" : "%"}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Info className="h-4 w-4" />
                          {t("admin.treatments.form.professionalAmount", {
                            amount: form.watch("fixedProfessionalPrice") || 0,
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-medium">{t("admin.treatments.form.sections.treatmentDurations")}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.treatments.form.descriptions.selectDurations")}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {form.watch("durations")?.map((duration, index) => (
                      <Card
                        key={duration.minutes}
                        className={`border-2 ${duration.isActive ? "border-primary/30" : ""}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <CardTitle className="text-base font-medium">
                                {t("admin.treatments.form.duration", { minutes: duration.minutes })}
                              </CardTitle>
                            </div>
                            <FormField
                              control={form.control}
                              name={`durations.${index}.isActive`}
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-x-reverse m-0">
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardHeader>

                        {duration.isActive && (
                          <CardContent className="space-y-4 pt-0">
                            <FormField
                              control={form.control}
                              name={`durations.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("admin.treatments.form.fields.price")}</FormLabel>
                                  <div className="relative">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                                        placeholder="0"
                                        className={`${dir === "rtl" ? "pr-8 text-right" : "pl-8 text-left"} border-2`}
                                      />
                                    </FormControl>
                                    <span
                                      className={`absolute ${dir === "rtl" ? "right" : "left"}-3 top-1/2 -translate-y-1/2 text-muted-foreground`}
                                    >
                                      ₪
                                    </span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-2">
                              <FormLabel>{t("admin.treatments.form.fields.professionalPrice")}</FormLabel>
                              <div className="flex gap-2 items-end">
                                <Select
                                  value={durationPriceTypes[duration.minutes] || "amount"}
                                  onValueChange={(value: "amount" | "percentage") =>
                                    setDurationPriceTypes((prev) => ({ ...prev, [duration.minutes]: value }))
                                  }
                                >
                                  <SelectTrigger className="w-24 border-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="amount">
                                      {t("admin.treatments.form.priceTypes.amount")}
                                    </SelectItem>
                                    <SelectItem value="percentage">
                                      {t("admin.treatments.form.priceTypes.percentage")}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="relative flex-1">
                                  <Input
                                    type="number"
                                    placeholder={durationPriceTypes[duration.minutes] === "percentage" ? "0%" : "0"}
                                    onChange={(e) =>
                                      handleDurationProfessionalPriceChange(
                                        index,
                                        e.target.value,
                                        durationPriceTypes[duration.minutes] || "amount",
                                      )
                                    }
                                    className={`${dir === "rtl" ? "pr-8 text-right" : "pl-8 text-left"} border-2 ${
                                      durationPriceTypes[duration.minutes] === "percentage"
                                        ? `${dir === "rtl" ? "pr-10" : "pl-10"}`
                                        : `${dir === "rtl" ? "pr-8" : "pl-8"}`
                                    }`}
                                  />
                                  <span
                                    className={`absolute ${dir === "rtl" ? "right" : "left"}-3 top-1/2 -translate-y-1/2 text-muted-foreground`}
                                  >
                                    {durationPriceTypes[duration.minutes] === "percentage" ? "%" : "₪"}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Info className="h-4 w-4" />
                                {t("admin.treatments.form.professionalAmount", {
                                  amount: duration.professionalPrice || 0,
                                })}
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="min-w-24">
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-24">
            {isSubmitting
              ? t("common.saving")
              : treatment
                ? t("admin.treatments.actions.update")
                : t("admin.treatments.actions.create")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
