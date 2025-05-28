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
import { Separator } from "@/components/ui/separator"
import type { ITreatment } from "@/lib/db/models/treatment"
import { createTreatment, updateTreatment, type TreatmentFormData } from "@/actions/treatment-actions"
import { toast } from "@/components/ui/use-toast"

const formSchema = z
  .object({
    name: z.string().min(2, "שם הטיפול חייב להכיל לפחות 2 תווים"),
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
      message: "יש להגדיר מחיר",
      path: ["pricingType"],
    },
  )

interface TreatmentFormProps {
  treatment?: ITreatment | null
  onSuccess: (treatment: ITreatment) => void
  onCancel: () => void
}

const AVAILABLE_DURATIONS = [60, 75, 90, 120]

const getCategoryDisplayName = (category: string) => {
  switch (category) {
    case "massages":
      return "עיסויים"
    case "facial_treatments":
      return "טיפולי פנים"
    default:
      return category
  }
}

export function TreatmentForm({ treatment, onSuccess, onCancel }: TreatmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [professionalPriceType, setProfessionalPriceType] = useState<"amount" | "percentage">("amount")
  const [durationPriceTypes, setDurationPriceTypes] = useState<Record<number, "amount" | "percentage">>({})

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
          title: treatment ? "הטיפול עודכן בהצלחה" : "הטיפול נוצר בהצלחה",
          variant: "default",
        })
        onSuccess(result.treatment)
      } else {
        toast({
          title: "שגיאה",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הטיפול",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const pricingType = form.watch("pricingType")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>שם הטיפול</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="לדוגמה: עיסוי שוודי" />
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
                <FormLabel>קטגוריה</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="massages">עיסויים</SelectItem>
                    <SelectItem value="facial_treatments">טיפולי פנים</SelectItem>
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
                <FormLabel>תיאור (אופציונלי)</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="תיאור קצר של הטיפול" rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>סטטוס</FormLabel>
                  <FormDescription>האם הטיפול זמין להזמנה?</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="pricingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>סוג תמחור</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <label htmlFor="fixed" className="cursor-pointer">
                        מחיר קבוע (ללא תלות בזמן)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="duration_based" id="duration_based" />
                      <label htmlFor="duration_based" className="cursor-pointer">
                        מחיר לפי זמנים
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {pricingType === "fixed" ? (
            <div className="space-y-4 bg-muted/50 rounded-lg p-4">
              <FormField
                control={form.control}
                name="fixedPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מחיר כללי</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                        placeholder="0"
                        className="text-center max-w-32"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>מחיר למטפל</FormLabel>
                <div className="flex gap-2 items-end">
                  <Select
                    value={professionalPriceType}
                    onValueChange={(value: "amount" | "percentage") => setProfessionalPriceType(value)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">סכום</SelectItem>
                      <SelectItem value="percentage">אחוז</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder={professionalPriceType === "amount" ? "0" : "0%"}
                    onChange={(e) => handleProfessionalPriceChange(e.target.value, professionalPriceType)}
                    className="text-center max-w-32"
                  />
                </div>
                <div className="text-sm text-muted-foreground">סכום: ₪{form.watch("fixedProfessionalPrice") || 0}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">בחר את הזמנים הזמינים והגדר מחיר לכל אחד</p>
              {form.watch("durations")?.map((duration, index) => (
                <div key={duration.minutes} className="border rounded-lg p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name={`durations.${index}.isActive`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="text-base font-medium">{duration.minutes} דקות</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {duration.isActive && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`durations.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מחיר</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                                placeholder="0"
                                className="text-center max-w-32"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <FormLabel>מחיר למטפל</FormLabel>
                        <div className="flex gap-2 items-end">
                          <Select
                            value={durationPriceTypes[duration.minutes] || "amount"}
                            onValueChange={(value: "amount" | "percentage") =>
                              setDurationPriceTypes((prev) => ({ ...prev, [duration.minutes]: value }))
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amount">סכום</SelectItem>
                              <SelectItem value="percentage">אחוז</SelectItem>
                            </SelectContent>
                          </Select>
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
                            className="text-center max-w-32"
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">סכום: ₪{duration.professionalPrice || 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "שומר..." : treatment ? "עדכן טיפול" : "צור טיפול"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            ביטול
          </Button>
        </div>
      </form>
    </Form>
  )
}
