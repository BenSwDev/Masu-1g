"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/common/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Switch } from "@/components/common/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { toast } from "sonner"
import { createSubscription, updateSubscription } from "@/actions/subscription-actions"
import type { ISubscription } from "@/lib/db/models/subscription"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1" }),
  bonusQuantity: z.coerce.number().int().min(0, { message: "Bonus quantity must be at least 0" }),
  validityMonths: z.coerce.number().int().min(1, { message: "Validity must be at least 1 month" }),
  isActive: z.boolean(),
  treatments: z.array(z.string()),
  price: z.coerce.number().min(0, { message: "Price must be at least 0" }),
})

type FormValues = z.infer<typeof formSchema>

interface SubscriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription?: any
  treatments: any[]
  onSuccess?: (subscription: ISubscription) => void
}

export default function SubscriptionForm({
  open,
  onOpenChange,
  subscription,
  treatments,
  onSuccess,
}: SubscriptionFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "", 
      price: 0,
      quantity: 1,
      validityMonths: 12,
      bonusQuantity: 0,
      isActive: true,
      treatments: [],
    },
  })

  useEffect(() => {
    if (subscription) {
      form.reset({
        name: subscription.name,
        description: subscription.description,
        quantity: subscription.quantity,
        bonusQuantity: subscription.bonusQuantity,
        validityMonths: subscription.validityMonths,
        isActive: subscription.isActive,
        treatments: subscription.treatments?.map((t: any) => t._id || t) || [],
        price: subscription.price,
      })
    } else {
      form.reset({
        name: "",
        description: "",
        quantity: 1,
        bonusQuantity: 0,
        validityMonths: 12,
        isActive: true,
        treatments: [],
        price: 0,
      })
    }
  }, [subscription, form])

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    try {
      const formData = new FormData()

      Object.entries(values).forEach(([key, value]) => {
        if (key === "treatments") {
          if (Array.isArray(value)) {
            value.forEach((treatmentId) => {
              formData.append("treatments", treatmentId)
            })
          }
        } else {
          formData.append(key, String(value))
        }
      })

      const result = subscription
        ? await updateSubscription(subscription._id, formData)
        : await createSubscription(formData)

      if (result.success) {
        toast.success(subscription ? t("subscriptions.updateSuccess") : t("subscriptions.createSuccess"))
        onSuccess?.(result.subscription)
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subscription ? t("subscriptions.edit") : t("subscriptions.create")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptions.fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptions.fields.description")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={isLoading} rows={3} />
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
                    <FormLabel>{t("subscriptions.fields.quantity")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bonusQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subscriptions.fields.bonusQuantity")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validityMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subscriptions.fields.validityMonths")}</FormLabel>
                    <Select disabled={isLoading} onValueChange={field.onChange} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("subscriptions.selectValidity")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 3, 6, 12, 24, 36].map((months) => (
                          <SelectItem key={months} value={months.toString()}>
                            {months} {t("subscriptions.months")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subscriptions.fields.price")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} step={0.01} disabled={isLoading} />
                    </FormControl>
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
                    <FormLabel className="text-base">{t("subscriptions.fields.isActive")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="treatments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptions.fields.treatments")}</FormLabel>
                  <div className="space-y-2">
                    {treatments.map((treatment) => (
                      <div key={treatment._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={treatment._id}
                          checked={field.value?.includes(treatment._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...(field.value || []), treatment._id])
                            } else {
                              field.onChange(field.value?.filter((value) => value !== treatment._id) || [])
                            }
                          }}
                          disabled={isLoading}
                        />
                        <label
                          htmlFor={treatment._id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {treatment.name} - ₪{treatment.price.toLocaleString()}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("common.loading") : subscription ? t("common.save") : t("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
