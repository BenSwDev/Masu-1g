"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createBundle, updateBundle } from "@/actions/bundle-actions"
import { getTreatments } from "@/actions/treatment-actions"
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
import { Checkbox } from "@/components/common/ui/checkbox"
import { useToast } from "@/components/common/ui/use-toast"
import { useQuery } from "@tanstack/react-query"
import { MinusIcon, PlusIcon } from "lucide-react"

interface BundleFormProps {
  bundle?: any
  onSuccess: () => void
  onCancel: () => void
}

export function BundleForm({ bundle, onSuccess, onCancel }: BundleFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTreatments, setSelectedTreatments] = useState<any[]>(
    bundle?.treatments?.map((t: any) => ({
      id: t._id || t.id,
      name: t.name,
      count: t.count || 1,
    })) || [],
  )

  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments"],
    queryFn: getTreatments,
  })

  const treatments = treatmentsData?.treatments || []
  const activeTreatments = treatments.filter((t: any) => t.isActive)

  // Create form schema
  const formSchema = z.object({
    name: z.string().min(2, { message: t("bundles.errors.nameRequired") }),
    category: z.string().min(1, { message: t("bundles.errors.categoryRequired") }),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
    quantity: z.number().min(1, { message: t("bundles.errors.quantityRequired") }),
    validityMonths: z.number().min(1, { message: t("bundles.errors.validityRequired") }),
    discountType: z.enum(["percentage", "fixed", "none"]),
    discountValue: z.number().min(0),
  })

  // Initialize form with existing bundle data or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: bundle?.name || "",
      category: bundle?.category || "massage",
      description: bundle?.description || "",
      isActive: bundle?.isActive ?? true,
      quantity: bundle?.quantity || 1,
      validityMonths: bundle?.validityMonths || 1,
      discountType: bundle?.discountType || "none",
      discountValue: bundle?.discountValue || 0,
    },
  })

  const discountType = form.watch("discountType")

  const handleTreatmentToggle = (treatmentId: string, treatmentName: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedTreatments([...selectedTreatments, { id: treatmentId, name: treatmentName, count: 1 }])
    } else {
      setSelectedTreatments(selectedTreatments.filter((t) => t.id !== treatmentId))
    }
  }

  const updateTreatmentCount = (treatmentId: string, count: number) => {
    setSelectedTreatments(
      selectedTreatments.map((t) => (t.id === treatmentId ? { ...t, count: Math.max(1, count) } : t)),
    )
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedTreatments.length === 0) {
      toast({
        title: t("bundles.errors.treatmentsRequired"),
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const bundleData = {
        ...values,
        treatments: selectedTreatments,
      }

      if (bundle) {
        await updateBundle(bundle._id, bundleData)
      } else {
        await createBundle(bundleData)
      }

      onSuccess()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: bundle ? t("bundles.updateError") : t("bundles.createError"),
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("bundles.fields.name")}</FormLabel>
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
                  <FormLabel>{t("bundles.fields.category")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("bundles.selectCategory")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="massage">{t("bundles.categories.massage")}</SelectItem>
                      <SelectItem value="facial">{t("bundles.categories.facial")}</SelectItem>
                      <SelectItem value="mixed">{t("bundles.categories.mixed")}</SelectItem>
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
                  <FormLabel>{t("bundles.fields.description")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bundles.fields.quantity")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{t("bundles.quantityDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validityMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bundles.fields.validityMonths")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{t("bundles.validityDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t("bundles.fields.isActive")}</FormLabel>
                    <FormDescription>{t("bundles.activeDescription")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bundles.fields.discountType")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("bundles.selectDiscountType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("bundles.discountTypes.none")}</SelectItem>
                        <SelectItem value="percentage">{t("bundles.discountTypes.percentage")}</SelectItem>
                        <SelectItem value="fixed">{t("bundles.discountTypes.fixed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {discountType !== "none" && (
                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {discountType === "percentage"
                          ? t("bundles.fields.discountPercentage")
                          : t("bundles.fields.discountAmount")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max={discountType === "percentage" ? "100" : undefined}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-medium">{t("bundles.fields.treatments")}</h3>
              <FormDescription>{t("bundles.treatmentsDescription")}</FormDescription>

              {activeTreatments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("bundles.noTreatmentsAvailable")}</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    {activeTreatments.map((treatment: any) => {
                      const isSelected = selectedTreatments.some((t) => t.id === treatment._id)
                      const selectedTreatment = selectedTreatments.find((t) => t.id === treatment._id)

                      return (
                        <div key={treatment._id} className="flex items-center space-x-2 p-2 border rounded-md">
                          <Checkbox
                            id={`treatment-${treatment._id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleTreatmentToggle(treatment._id, treatment.name, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`treatment-${treatment._id}`}
                            className="flex-grow text-sm font-medium cursor-pointer"
                          >
                            {treatment.name}
                          </label>

                          {isSelected && (
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateTreatmentCount(treatment._id, (selectedTreatment?.count || 1) - 1)}
                                disabled={selectedTreatment?.count === 1}
                              >
                                <MinusIcon className="h-3 w-3" />
                              </Button>
                              <span className="text-sm w-6 text-center">{selectedTreatment?.count || 1}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateTreatmentCount(treatment._id, (selectedTreatment?.count || 1) + 1)}
                              >
                                <PlusIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {selectedTreatments.length === 0 && (
                    <p className="text-sm text-red-500">{t("bundles.errors.treatmentsRequired")}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || selectedTreatments.length === 0}>
                {isSubmitting ? t("common.loading") : bundle ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
