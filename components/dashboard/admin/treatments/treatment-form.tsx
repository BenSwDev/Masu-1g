"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createTreatment, updateTreatment } from "@/actions/treatment-actions"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent } from "@/components/common/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Switch } from "@/components/common/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { PlusIcon, MinusIcon } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"

interface TreatmentFormProps {
  treatment?: any
  onSuccess: () => void
  onCancel: () => void
}

type TreatmentFormValues = {
  name: string
  category: "massages" | "facial_treatments"
  description?: string
  isActive: boolean
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  durations?: {
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }[]
}

export function TreatmentForm({ treatment, onSuccess, onCancel }: TreatmentFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pricingType, setPricingType] = useState(treatment?.pricingType || "fixed")

  // Create form schema based on pricing type
  const formSchema = z.object({
    name: z.string().min(2, { message: t("treatments.errors.nameRequired") }),
    category: z.enum(["massages", "facial_treatments"], { 
      required_error: t("treatments.errors.categoryRequired") 
    }),
    description: z.string().optional(),
    isActive: z.boolean(),
    pricingType: z.enum(["fixed", "duration_based"]),
    fixedPrice: z.number().min(0).optional(),
    fixedProfessionalPrice: z.number().min(0).optional(),
    durations: z.array(
      z.object({
        minutes: z.number().refine(val => [60, 75, 90, 120].includes(val), {
          message: t("treatments.errors.invalidDuration")
        }),
        price: z.number().min(0),
        professionalPrice: z.number().min(0),
        isActive: z.boolean()
      })
    ).optional(),
  }) satisfies z.ZodType<TreatmentFormValues>

  // Initialize form with existing treatment data or defaults
  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: treatment?.name || "",
      category: treatment?.category || "massages",
      description: treatment?.description || "",
      isActive: treatment?.isActive ?? true,
      pricingType: treatment?.pricingType || "fixed",
      fixedPrice: treatment?.fixedPrice || 0,
      fixedProfessionalPrice: treatment?.fixedProfessionalPrice || 0,
      durations: treatment?.durations || [{ minutes: 60, price: 0, professionalPrice: 0, isActive: true }],
    },
  })

  // Initialize durations state for duration-based pricing
  const [durations, setDurations] = useState(treatment?.durations || [{ minutes: 60, price: 0, professionalPrice: 0, isActive: true }])

  const addDuration = () => {
    setDurations([...durations, { minutes: 60, price: 0, professionalPrice: 0, isActive: true }])
  }

  const removeDuration = (index: number) => {
    if (durations.length > 1) {
      setDurations(durations.filter((_: any, i: number) => i !== index))
    }
  }

  const updateDuration = (index: number, field: string, value: number) => {
    const newDurations = [...durations]
    newDurations[index] = { ...newDurations[index], [field]: value }
    setDurations(newDurations)
  }

  const onSubmit = async (values: TreatmentFormValues) => {
    try {
      setIsSubmitting(true)

      // Prepare data based on pricing type
      const treatmentData = {
        ...values,
        durations: pricingType === "duration_based" ? durations : undefined,
      }

      if (treatment) {
        await updateTreatment(treatment._id, treatmentData)
      } else {
        await createTreatment(treatmentData)
      }

      onSuccess()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: treatment ? t("treatments.updateError") : t("treatments.createError"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-6">
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-base font-medium mb-2">{t("treatments.basicInfo")}</h3>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("treatments.fields.name")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>{t("treatments.fields.category")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("treatments.selectCategory")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="massages">{t("treatments.categories.massages")}</SelectItem>
                            <SelectItem value="facial_treatments">{t("treatments.categories.facial_treatments")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("treatments.fields.description")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t("treatments.fields.isActive")}</FormLabel>
                          <FormDescription className="text-xs">{t("treatments.activeDescription")}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-base font-medium mb-2">{t("treatments.pricing")}</h3>
                  <FormField
                    control={form.control}
                    name="pricingType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>{t("treatments.fields.pricingType")}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value)
                              setPricingType(value)
                            }}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="fixed" />
                              </FormControl>
                              <FormLabel className="font-normal">{t("treatments.pricingTypes.fixed")}</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="duration_based" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {t("treatments.pricingTypes.durationBased")}
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {pricingType === "fixed" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fixedPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("treatments.fields.price")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fixedProfessionalPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("treatments.fields.professionalPrice")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">{t("treatments.fields.durations")}</h4>
                        <Button type="button" variant="outline" size="sm" onClick={addDuration}>
                          <PlusIcon className="h-4 w-4 mr-1" />
                          {t("treatments.addDuration")}
                        </Button>
                      </div>

                      {durations.map((duration: { minutes: number; price: number; professionalPrice: number; isActive: boolean }, index: number) => (
                        <div key={index} className="border rounded-md p-3 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">
                              {t("treatments.duration")} #{index + 1}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDuration(index)}
                              disabled={durations.length <= 1}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <FormLabel className="text-xs">{t("treatments.fields.minutes")}</FormLabel>
                              <Select
                                value={duration.minutes.toString()}
                                onValueChange={(value) => updateDuration(index, "minutes", Number(value))}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="60">60</SelectItem>
                                  <SelectItem value="75">75</SelectItem>
                                  <SelectItem value="90">90</SelectItem>
                                  <SelectItem value="120">120</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <FormLabel className="text-xs">{t("treatments.fields.price")}</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                value={duration.price}
                                onChange={(e) => updateDuration(index, "price", Number(e.target.value))}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <FormLabel className="text-xs">{t("treatments.fields.professionalPrice")}</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                value={duration.professionalPrice}
                                onChange={(e) => updateDuration(index, "professionalPrice", Number(e.target.value))}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <FormLabel className="text-xs">{t("treatments.fields.isActive")}</FormLabel>
                              <Switch
                                checked={duration.isActive}
                                onCheckedChange={(checked: boolean) => updateDuration(index, "isActive", checked ? 1 : 0)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : treatment ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
