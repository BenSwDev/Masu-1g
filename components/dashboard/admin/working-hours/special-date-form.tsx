"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { addSpecialDate, updateSpecialDate } from "@/actions/working-hours-actions"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card"
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
import { CalendarIcon, Info, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"

interface SpecialDateFormProps {
  specialDate?: any
  onSuccess: () => void
  onCancel: () => void
}

const USE_DEFAULT_HOURS_VALUE = "_use_default_hours_"

export function SpecialDateForm({ specialDate, onSuccess, onCancel }: SpecialDateFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const specialDateFormSchema = z
    .object({
      date: z.date({
        required_error: t("workingHours.specialDate.errors.dateRequired"),
      }),
      name: z.string().min(2, { message: t("workingHours.specialDate.errors.nameRequired") }),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      hasPriceAdjustment: z.boolean().default(false),
      priceAdjustmentType: z.enum(["percentage", "fixed"]).optional(),
      priceAdjustmentValue: z.coerce.number().optional(),
      priceAdjustmentReason: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.hasPriceAdjustment && data.isActive) {
        if (!data.priceAdjustmentType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["priceAdjustmentType"],
            message: t("workingHours.priceAdjustment.errors.typeRequired"),
          })
        }
        if (data.priceAdjustmentValue === undefined || data.priceAdjustmentValue === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["priceAdjustmentValue"],
            message: t("workingHours.priceAdjustment.errors.valueRequired"),
          })
        } else if (data.priceAdjustmentValue < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["priceAdjustmentValue"],
            message: t("workingHours.priceAdjustment.errors.valueNegative"),
          })
        }
      }

      const startTimeIsSet = data.startTime && data.startTime !== USE_DEFAULT_HOURS_VALUE
      const endTimeIsSet = data.endTime && data.endTime !== USE_DEFAULT_HOURS_VALUE

      if (startTimeIsSet && !endTimeIsSet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: t("workingHours.specialDate.errors.endTimeRequiredIfStart"),
        })
      } else if (startTimeIsSet && endTimeIsSet && data.startTime! >= data.endTime!) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: t("workingHours.specialDate.errors.endTimeAfterStart"),
        })
      }
      if (endTimeIsSet && !startTimeIsSet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startTime"],
          message: t("workingHours.specialDate.errors.startTimeRequiredIfEnd"),
        })
      }
    })

  type SpecialDateFormValues = z.infer<typeof specialDateFormSchema>

  const form = useForm<SpecialDateFormValues>({
    resolver: zodResolver(specialDateFormSchema),
    defaultValues: {
      date: specialDate ? new Date(specialDate.date) : new Date(),
      name: specialDate?.name || "",
      description: specialDate?.description || "",
      isActive: specialDate?.isActive ?? true,
      startTime: specialDate?.startTime || USE_DEFAULT_HOURS_VALUE,
      endTime: specialDate?.endTime || USE_DEFAULT_HOURS_VALUE,
      hasPriceAdjustment: !!specialDate?.priceAdjustment && (specialDate?.isActive ?? true),
      priceAdjustmentType: specialDate?.priceAdjustment?.type || "fixed",
      priceAdjustmentValue: specialDate?.priceAdjustment?.value || 0,
      priceAdjustmentReason: specialDate?.priceAdjustment?.reason || "",
    },
  })

  const startTimeValue = form.watch("startTime")
  const hasPriceAdjustmentValue = form.watch("hasPriceAdjustment")
  const priceAdjustmentTypeValue = form.watch("priceAdjustmentType")

  const onSubmit = async (values: SpecialDateFormValues) => {
    try {
      setIsSubmitting(true)
      const { hasPriceAdjustment, priceAdjustmentType, priceAdjustmentValue, priceAdjustmentReason, ...coreValues } =
        values

      const payload: any = {
        ...coreValues,
        startTime: coreValues.startTime === USE_DEFAULT_HOURS_VALUE ? undefined : coreValues.startTime,
        endTime: coreValues.endTime === USE_DEFAULT_HOURS_VALUE ? undefined : coreValues.endTime,
      }

      if (
        values.isActive &&
        hasPriceAdjustment &&
        priceAdjustmentType &&
        priceAdjustmentValue !== undefined &&
        priceAdjustmentValue !== null &&
        priceAdjustmentValue >= 0 // Ensure value is not negative for submission
      ) {
        payload.priceAdjustment = {
          type: priceAdjustmentType,
          value: priceAdjustmentValue,
          reason: priceAdjustmentReason,
        }
      } else {
        payload.priceAdjustment = undefined // Explicitly set to undefined if not active or not applicable
      }

      if (!values.isActive) {
        // If not active, ensure price adjustment is cleared
        payload.priceAdjustment = undefined
      }

      if (specialDate) {
        await updateSpecialDate(specialDate._id, payload)
      } else {
        await addSpecialDate(payload)
      }

      toast({
        title: t("common.success"),
        description: specialDate
          ? t("workingHours.specialDate.updateSuccess")
          : t("workingHours.specialDate.createSuccess"),
        variant: "success",
      })
      onSuccess()
    } catch (error) {
      console.error("Error submitting special date form:", error)
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

  const timeOptions = generateTimeOptions()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{specialDate ? t("workingHours.specialDate.edit") : t("workingHours.specialDate.addNew")}</CardTitle>
        <CardDescription>{t("workingHours.specialDate.formDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{t("workingHours.specialDate.selectDate")}</span>
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
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) && !specialDate}
                          initialFocus
                          dir={t("common.dir") as "ltr" | "rtl" | undefined}
                        />
                      </PopoverContent>
                    </Popover>
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
                      <Input {...field} placeholder={t("workingHours.specialDate.namePlaceholder")} />
                    </FormControl>
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
                  <FormLabel>{t("workingHours.specialDate.fields.description")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={t("workingHours.specialDate.descriptionPlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("workingHours.specialDate.fields.startTime")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || USE_DEFAULT_HOURS_VALUE}
                      dir={t("common.dir") as "ltr" | "rtl" | undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("workingHours.specialDate.selectStartTimeOptional")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={USE_DEFAULT_HOURS_VALUE}>
                          {t("workingHours.specialDate.useDefaultDayHours")}
                        </SelectItem>
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
                    <FormLabel>{t("workingHours.specialDate.fields.endTime")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || USE_DEFAULT_HOURS_VALUE}
                      dir={t("common.dir") as "ltr" | "rtl" | undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("workingHours.specialDate.selectEndTimeOptional")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={USE_DEFAULT_HOURS_VALUE}>
                          {t("workingHours.specialDate.useDefaultDayHours")}
                        </SelectItem>
                        {timeOptions
                          .filter(
                            (time) =>
                              startTimeValue === USE_DEFAULT_HOURS_VALUE || !startTimeValue || time > startTimeValue,
                          )
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
                    <FormLabel className="text-base font-medium">
                      {t("workingHours.specialDate.fields.isActive")}
                    </FormLabel>
                    <FormDescription>{t("workingHours.specialDate.activeDescription")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isActive") && (
              <Card className="pt-4 border shadow-sm">
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="hasPriceAdjustment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 rtl:space-x-reverse">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="hasPriceAdjustmentSwitch"
                          />
                        </FormControl>
                        <FormLabel htmlFor="hasPriceAdjustmentSwitch" className="font-medium text-base">
                          {t("workingHours.priceAdjustment.toggleLabel")}
                        </FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("workingHours.priceAdjustment.tooltipInfo")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormItem>
                    )}
                  />
                  {hasPriceAdjustmentValue && (
                    <div className="space-y-4 pl-2">
                      <FormField
                        control={form.control}
                        name="priceAdjustmentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("workingHours.priceAdjustment.type")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || "fixed"}
                              dir={t("common.dir") as "ltr" | "rtl" | undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("workingHours.priceAdjustment.selectTypePlaceholder")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="fixed">{t("workingHours.priceAdjustment.types.fixed")}</SelectItem>
                                <SelectItem value="percentage">
                                  {t("workingHours.priceAdjustment.types.percentage")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priceAdjustmentValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("workingHours.priceAdjustment.value")} (
                              {priceAdjustmentTypeValue === "percentage" ? "%" : t("common.currency")})
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? null : Number.parseFloat(e.target.value))
                                }
                                placeholder={t("workingHours.priceAdjustment.valuePlaceholder")}
                                min="0"
                                step="any"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priceAdjustmentReason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("workingHours.priceAdjustment.reason")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value ?? ""}
                                rows={2}
                                placeholder={t("workingHours.priceAdjustment.reasonPlaceholder")}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-6">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />}
                {specialDate ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function generateTimeOptions() {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      options.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return options
}
