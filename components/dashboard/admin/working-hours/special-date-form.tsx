"use client"

import { useState, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { addSpecialDate, updateSpecialDate } from "@/actions/working-hours-actions"
import { Button } from "@/components/common/ui/button"
// Removed Card and CardContent imports as the parent now provides them
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
import { Switch } from "@/components/common/ui/switch"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"
import { CalendarIcon, Loader2, SaveIcon } from "lucide-react"
import { format, addDays } from "date-fns"
import { enUS, he, ru } from "date-fns/locale" // Import locales

interface SpecialDateFormProps {
  specialDate?: any
  onSuccess: () => void
  onCancel: () => void
}

export function SpecialDateForm({ specialDate, onSuccess, onCancel }: SpecialDateFormProps) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dateFnsLocale = useMemo(() => {
    if (i18n.language.startsWith("he")) return he
    if (i18n.language.startsWith("ru")) return ru
    return enUS
  }, [i18n.language])

  const formSchema = z
    .object({
      date: z.date({
        required_error: t("workingHours.specialDate.errors.dateRequired"),
      }),
      name: z
        .string()
        .min(1, { message: t("workingHours.specialDate.errors.nameRequired") })
        .max(100, { message: t("workingHours.specialDate.errors.nameTooLong") }),
      description: z
        .string()
        .max(500, { message: t("workingHours.specialDate.errors.descriptionTooLong") })
        .optional(),
      isActive: z.boolean().default(true),
      startTime: z.string().optional(), // Optional now
      endTime: z.string().optional(), // Optional now
    })
    .refine(
      (data) => {
        // If one time is set, the other must also be set
        if ((data.startTime && !data.endTime) || (!data.startTime && data.endTime)) {
          return false
        }
        // If both times are set, endTime must be after startTime
        if (data.startTime && data.endTime && data.startTime >= data.endTime) {
          return false
        }
        return true
      },
      {
        message: t("workingHours.specialDate.errors.timeInvalid"),
        path: ["endTime"], // Attach error to endTime field for display
      },
    )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: specialDate ? new Date(specialDate.date) : addDays(new Date(), 1), // Default to tomorrow
      name: specialDate?.name || "",
      description: specialDate?.description || "",
      isActive: specialDate?.isActive ?? true,
      startTime: specialDate?.startTime || "", // Default to empty
      endTime: specialDate?.endTime || "", // Default to empty
    },
  })

  const startTimeValue = form.watch("startTime") // Watch for changes to startTime

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true)
      const payload = {
        ...values,
        // Ensure times are null if empty strings, or formatted if present
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
      }

      let result
      if (specialDate) {
        result = await updateSpecialDate(specialDate._id, payload)
      } else {
        result = await addSpecialDate(payload)
      }

      if (result.success) {
        onSuccess()
      } else {
        toast({
          title: t("common.error"),
          description:
            result.error ||
            (specialDate ? t("workingHours.specialDate.updateError") : t("workingHours.specialDate.createError")),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: specialDate
          ? t("workingHours.specialDate.updateError")
          : t("workingHours.specialDate.createError"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const timeOptions = useMemo(() => generateTimeOptions(), [])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("workingHours.specialDate.fields.date")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP", { locale: dateFnsLocale })
                      ) : (
                        <span>{t("workingHours.specialDate.selectDate")}</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    // disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Allow past dates for record keeping, but default to future
                    initialFocus
                    locale={dateFnsLocale}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>{t("workingHours.specialDate.dateDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("workingHours.specialDate.fields.name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("workingHours.specialDate.namePlaceholder")} {...field} />
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
              <FormLabel>{t("workingHours.specialDate.fields.descriptionOptional")}</FormLabel>
              <FormControl>
                <Textarea placeholder={t("workingHours.specialDate.descriptionPlaceholder")} {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormDescription>{t("workingHours.specialDate.timeDescription")}</FormDescription>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("workingHours.specialDate.fields.startTimeOptional")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("workingHours.selectTimeOptional")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="not-set">{t("common.notSet")}</SelectItem>
                    {timeOptions.map((time) => (
                      <SelectItem key={`start-${time}`} value={time}>
                        {time}
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
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("workingHours.specialDate.fields.endTimeOptional")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("workingHours.selectTimeOptional")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="not-set">{t("common.notSet")}</SelectItem>
                    {timeOptions
                      .filter((time) => !startTimeValue || time > startTimeValue) // Filter only if startTime is set
                      .map((time) => (
                        <SelectItem key={`end-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("workingHours.specialDate.fields.isActive")}</FormLabel>
                <FormDescription>{t("workingHours.specialDate.activeDescriptionForm")}</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label={t("workingHours.specialDate.fields.isActive")}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SaveIcon className="mr-2 h-4 w-4" />}
            {isSubmitting ? t("common.saving") : specialDate ? t("common.saveChanges") : t("common.create")}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function generateTimeOptions() {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      // 15 minute intervals
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      options.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return options
}
