"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createTreatment, updateTreatment } from "@/app/dashboard/(user)/(roles)/admin/treatments/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PlusIcon, MinusIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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
  allowTherapistGenderSelection: boolean
}

export function TreatmentForm({ treatment, onSuccess, onCancel }: TreatmentFormProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    allowTherapistGenderSelection: z.boolean(),
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
      allowTherapistGenderSelection: treatment?.allowTherapistGenderSelection ?? false,
    },
  })

  // Watch pricing type for UI changes
  const pricingType = form.watch("pricingType")

  // Initialize durations state for duration-based pricing
  const [durations, setDurations] = useState(treatment?.durations || [{ minutes: 60, price: 0, professionalPrice: 0, isActive: true }])

  // Sync durations with form whenever they change
  useEffect(() => {
    if (pricingType === "duration_based") {
      form.setValue("durations", durations)
    }
  }, [durations, pricingType, form])

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
      console.log("Treatment form submission started")
      console.log("Form values:", values)
      
      setIsSubmitting(true)

      // Prepare data based on pricing type
      const treatmentData = {
        ...values,
        durations: pricingType === "duration_based" ? durations : undefined,
      }

      console.log("Treatment data prepared:", treatmentData)

      let result
      if (treatment) {
        console.log("Updating existing treatment:", treatment._id)
        result = await updateTreatment(treatment._id, treatmentData)
      } else {
        console.log("Creating new treatment")
        result = await createTreatment(treatmentData)
      }

      console.log("Treatment operation result:", result)

      if (result.success) {
        toast({
          title: t("common.success"),
          description: treatment ? t("treatments.updateSuccess") : t("treatments.createSuccess"),
          variant: "default",
        })
      onSuccess()
      } else {
        console.error("Treatment operation failed:", result.error)
        throw new Error(result.error || (treatment ? t("treatments.updateError") : t("treatments.createError")))
      }
    } catch (error) {
      console.error("Treatment form error:", error)
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : 
          (treatment ? t("treatments.updateError") : t("treatments.createError")),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left column */}
              <div className="space-y-6">
                <div className="border rounded-lg p-6 space-y-6 bg-card">
                  <h3 className="text-lg font-semibold">{t("treatments.basicInfo")}</h3>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t("treatments.fields.name")}</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" />
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
                        <FormLabel className="text-base">{t("treatments.fields.category")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
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
                        <FormLabel className="text-base">{t("treatments.fields.description")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} className="resize-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t("treatments.fields.isActive")}</FormLabel>
                            <FormDescription className="text-sm">{t("treatments.activeDescription")}</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allowTherapistGenderSelection"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t("treatments.fields.allowTherapistGenderSelection")}</FormLabel>
                            <FormDescription className="text-sm">{t("treatments.allowTherapistGenderSelectionDescription")}</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                <div className="border rounded-lg p-6 space-y-6 bg-card">
                  <h3 className="text-lg font-semibold">{t("treatments.pricing")}</h3>
                  <FormField
                    control={form.control}
                    name="pricingType"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="text-base">{t("treatments.fields.pricingType")}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value)
                            }}
                            defaultValue={field.value}
                            className="flex flex-col space-y-3"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4">
                              <FormControl>
                                <RadioGroupItem value="fixed" />
                              </FormControl>
                              <FormLabel className="font-normal">{t("treatments.pricingTypes.fixed")}</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4">
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
                            <FormLabel className="text-base">{t("treatments.fields.price")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="h-10"
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
                            <FormLabel className="text-base">{t("treatments.fields.professionalPrice")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-base font-medium">{t("treatments.fields.durations")}</h4>
                        <Button type="button" variant="outline" size="sm" onClick={addDuration} className="h-9">
                          <PlusIcon className="h-4 w-4 mr-2" />
                          {t("treatments.addDuration")}
                        </Button>
                      </div>

                      {durations.map((duration: { minutes: number; price: number; professionalPrice: number; isActive: boolean }, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-medium">
                              {t("treatments.duration")} #{index + 1}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDuration(index)}
                              disabled={durations.length <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <FormLabel className="text-sm">{t("treatments.fields.minutes")}</FormLabel>
                              <Select
                                value={duration.minutes.toString()}
                                onValueChange={(value) => updateDuration(index, "minutes", Number(value))}
                              >
                                <SelectTrigger className="h-9">
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
                              <FormLabel className="text-sm">{t("treatments.fields.price")}</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                value={duration.price}
                                onChange={(e) => updateDuration(index, "price", Number(e.target.value))}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <FormLabel className="text-sm">{t("treatments.fields.professionalPrice")}</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                value={duration.professionalPrice}
                                onChange={(e) => updateDuration(index, "professionalPrice", Number(e.target.value))}
                                className="h-9"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-sm">{t("treatments.fields.isActive")}</FormLabel>
                            <Switch
                              checked={duration.isActive}
                              onCheckedChange={(checked: boolean) => updateDuration(index, "isActive", checked ? 1 : 0)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="h-10">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-10">
                {isSubmitting ? t("common.loading") : treatment ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
