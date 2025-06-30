"use client"
import { useTranslation } from "@/lib/translations/i18n"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  createSubscription,
  updateSubscription,
} from "@/app/dashboard/(user)/(roles)/admin/subscriptions/actions"
import { toast } from "sonner"

interface SubscriptionPlain {
  _id: string
  name: string
  description: string
  quantity: number
  bonusQuantity: number
  validityMonths: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1" }),
  bonusQuantity: z.coerce.number().int().min(0, { message: "Bonus quantity must be at least 0" }),
  validityMonths: z.coerce.number().int().min(1, { message: "Validity must be at least 1 month" }),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface SubscriptionFormProps {
  onSubmit: (data: FormData) => Promise<void>
  isLoading?: boolean
  initialData?: SubscriptionPlain | null
  treatments?: any[]
}

export default function SubscriptionForm({
  onSubmit,
  isLoading = false,
  initialData,
  treatments = [],
}: SubscriptionFormProps) {
  const { t } = useTranslation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      quantity: initialData?.quantity || 1,
      validityMonths: initialData?.validityMonths || 12,
      bonusQuantity: initialData?.bonusQuantity || 0,
      isActive: initialData?.isActive ?? true,
    },
  })

  const handleSubmit = async (values: FormValues) => {
    try {
      const formData = new FormData()

      Object.entries(values).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      await onSubmit(formData)
    } catch (error) {
      console.error("Form submission error:", error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

        <FormField
          control={form.control}
          name="validityMonths"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("subscriptions.fields.validityMonths")}</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={value => field.onChange(Number.parseInt(value))}
                value={field.value.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("subscriptions.selectValidity")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[1, 3, 6, 12, 24, 36].map(months => (
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
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("subscriptions.fields.isActive")}</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("common.saving") : initialData ? t("common.update") : t("common.create")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
