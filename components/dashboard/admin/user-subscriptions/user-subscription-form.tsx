"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useTranslation } from "@/lib/translations/i18n"

interface UserSubscriptionPlain {
  _id: string
  remainingQuantity: number
  expiryDate: string
  totalQuantity?: number
}

const formSchema = z.object({
  remainingQuantity: z.coerce.number().int().min(0),
  expiryDate: z.date(),
})

type FormValues = z.infer<typeof formSchema>

interface UserSubscriptionFormProps {
  onSubmit: (data: FormData) => Promise<void>
  isLoading?: boolean
  initialData: UserSubscriptionPlain
  onCancel?: () => void
}

export default function UserSubscriptionForm({
  onSubmit,
  isLoading = false,
  initialData,
  onCancel,
}: UserSubscriptionFormProps) {
  const { t } = useTranslation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      remainingQuantity: initialData.remainingQuantity,
      expiryDate: new Date(initialData.expiryDate),
    },
  })

  useEffect(() => {
    form.reset({
      remainingQuantity: initialData.remainingQuantity,
      expiryDate: new Date(initialData.expiryDate),
    })
  }, [initialData, form])

  const handleSubmit = async (values: FormValues) => {
    const data = new FormData()
    data.append("remainingQuantity", String(values.remainingQuantity))
    data.append("expiryDate", values.expiryDate.toISOString())
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="remainingQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("userSubscriptions.remainingQuantity")}</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {typeof initialData.totalQuantity === "number" && (
            <div className="flex flex-col">
              <FormLabel>{t("userSubscriptions.totalQuantity")}</FormLabel>
              <Input value={initialData.totalQuantity} disabled readOnly />
            </div>
          )}
        </div>
        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("userSubscriptions.expiryDate")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>{t("common.pickDate")}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("common.saving") : t("common.update")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
