"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/common/ui/popover"
import { Calendar } from "@/components/common/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils/utils"
import { useTranslation } from "@/lib/translations/i18n"

const formSchema = z.object({
  remainingQuantity: z.coerce.number().int().min(0),
  expiryDate: z.date(),
})

export type UserSubscriptionEditValues = z.infer<typeof formSchema>

interface UserSubscriptionEditFormProps {
  initialData: { remainingQuantity: number; expiryDate: Date | string }
  onSubmit: (values: UserSubscriptionEditValues) => Promise<void>
  loading?: boolean
}

export default function UserSubscriptionEditForm({ initialData, onSubmit, loading = false }: UserSubscriptionEditFormProps) {
  const { t } = useTranslation()

  const form = useForm<UserSubscriptionEditValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      remainingQuantity: initialData.remainingQuantity,
      expiryDate: typeof initialData.expiryDate === "string" ? new Date(initialData.expiryDate) : initialData.expiryDate,
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="remainingQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("userSubscriptions.remainingQuantity")}</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      disabled={loading}
                    >
                      {field.value ? format(field.value, "PPP") : <span>{t("common.pickDate")}</span>}
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
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
