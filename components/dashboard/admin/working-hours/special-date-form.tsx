"use client"

import { useEffect } from "react"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { addSpecialDate, updateSpecialDate } from "@/actions/working-hours-actions"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
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
import type { ClientSpecialDateConfig, SpecialDateFormValues, ClientPriceAdjustment } from "./types"
import type { SpecialDateConfig as DbSpecialDateConfig } from "@/lib/db/models/working-hours"

/**
 * @interface SpecialDateFormProps
 * @description Props for the SpecialDateForm component.
 * @property {ClientSpecialDateConfig} [specialDate] - Existing special date data for editing. If undefined, form is for creating.
 * @property {() => void} onSuccess - Callback function executed on successful form submission.
 * @property {() => void} onCancel - Callback function executed when the form is cancelled.
 */
interface SpecialDateFormProps {
  specialDate?: ClientSpecialDateConfig
  onSuccess: () => void
  onCancel: () => void
}

/**
 * @component SpecialDateForm
 * @description Form component for creating or editing special dates, including their specific hours and price adjustments.
 */
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
      startTime: z.string().optional(), // Optional, empty string if not set
      endTime: z.string().optional(), // Optional, empty string if not set
      hasPriceAdjustment: z.boolean().default(false),
      priceAdjustmentType: z.enum(["percentage", "fixed"]).optional(),
      priceAdjustmentValue: z.coerce.number().optional(),
      priceAdjustmentReason: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // Price adjustment validation (only if active and hasPriceAdjustment is true)
      if (data.isActive && data.hasPriceAdjustment) {
        if (!data.priceAdjustmentType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["priceAdjustmentType"],
            message: t("workingHours.priceAdjustment.errors.typeRequired"),
          })
        }
        if (
          data.priceAdjustmentValue === undefined ||
          data.priceAdjustmentValue === null ||
          Number.isNaN(data.priceAdjustmentValue)
        ) {
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
      // Time validation
      if (data.startTime && !data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: t("workingHours.specialDate.errors.endTimeRequiredIfStart"),
        })
      } else if (data.startTime && data.endTime && data.startTime >= data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: t("workingHours.specialDate.errors.endTimeAfterStart"),
        })
      }
      if (data.endTime && !data.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startTime"],
          message: t("workingHours.specialDate.errors.startTimeRequiredIfEnd"),
        })
      }
    })

  const form = useForm<SpecialDateFormValues>({
    resolver: zodResolver(specialDateFormSchema),
    defaultValues: {
      date: specialDate ? new Date(specialDate.date) : new Date(), // Convert ISO string to Date
      name: specialDate?.name || "",
      description: specialDate?.description || "",
      isActive: specialDate?.isActive ?? true,
      startTime: specialDate?.startTime || "", // Default to empty string for select placeholder
      endTime: specialDate?.endTime || "", // Default to empty string
      hasPriceAdjustment: specialDate?.isActive ? (specialDate?.hasPriceAdjustment ?? false) : false,
      priceAdjustmentType: specialDate?.priceAdjustment?.type || "fixed",
      priceAdjustmentValue: specialDate?.priceAdjustment?.value || undefined, // Use undefined for optional number
      priceAdjustmentReason: specialDate?.priceAdjustment?.reason || "",
    },
  })

  const startTimeValue = form.watch("startTime")
  const isActiveValue = form.watch("isActive")
  const hasPriceAdjustmentValue = form.watch("hasPriceAdjustment")
  const priceAdjustmentTypeValue = form.watch("priceAdjustmentType")

  // If isActive becomes false, ensure hasPriceAdjustment is also false
  useEffect(() => {
    if (!isActiveValue) {
      form.setValue("hasPriceAdjustment", false)
    }
  }, [isActiveValue, form])

  const onSubmit = async (values: SpecialDateFormValues) => {
    try {
      setIsSubmitting(true)
      const { hasPriceAdjustment, priceAdjustmentType, priceAdjustmentValue, priceAdjustmentReason, ...coreValues } =
        values

      let priceAdjPayload: ClientPriceAdjustment | undefined = undefined
      if (
        values.isActive &&
        hasPriceAdjustment &&
        priceAdjustmentType &&
        priceAdjustmentValue !== undefined &&
        priceAdjustmentValue !== null &&
        !Number.isNaN(priceAdjustmentValue) &&
        priceAdjustmentValue >= 0
      ) {
        priceAdjPayload = {
          type: priceAdjustmentType,
          value: priceAdjustmentValue,
          reason: priceAdjustmentReason,
        }
      }

      // Prepare payload for server action
      const payload = {
        ...coreValues,
        date: coreValues.date.toISOString(), // Convert Date to ISO string for server
        startTime: coreValues.startTime || undefined, // Send undefined if empty
        endTime: coreValues.endTime || undefined, // Send undefined if empty
        priceAdjustment: priceAdjPayload,
      }

      // If not active, ensure priceAdjustment is not sent or is explicitly undefined
      if (!values.isActive) {
        payload.priceAdjustment = undefined
      }

      let result
      if (specialDate) {
        result = await updateSpecialDate(specialDate._id, payload as Partial<Omit<DbSpecialDateConfig, "_id">>)
      } else {
        result = await addSpecialDate(payload as Omit<DbSpecialDateConfig, "_id">)
      }

      if (result.success) {
        toast({
          title: t("common.success"),
          description: specialDate
            ? t("workingHours.specialDate.updateSuccess")
            : t("workingHours.specialDate.createSuccess"),
          variant: "success",
        })
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
    <Card>
      <CardHeader>
        <CardTitle>{specialDate ? t("workingHours.specialDate.edit") : t("workingHours.specialDate.addNew")}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
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
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("workingHours.specialDate.selectDate")}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50 rtl:mr-auto rtl:ml-0" />
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workingHours.specialDate.fields.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      placeholder={t("workingHours.specialDate.descriptionPlaceholder")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("workingHours.specialDate.fields.startTime")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""} // Ensure value is not null/undefined for Select
                      dir={t("common.dir") as "ltr" | "rtl" | undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("workingHours.specialDate.selectStartTimeOptional")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">{t("workingHours.specialDate.useDefaultDayHours")}</SelectItem>
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
                      value={field.value || ""} // Ensure value is not null/undefined for Select
                      disabled={!startTimeValue} // Disable if startTime is not set
                      dir={t("common.dir") as "ltr" | "rtl" | undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("workingHours.specialDate.selectEndTimeOptional")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">{t("workingHours.specialDate.useDefaultDayHours")}</SelectItem>
                        {timeOptions
                          .filter((time) => !startTimeValue || time > startTimeValue)
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t("workingHours.specialDate.fields.isActive")}</FormLabel>
                    <FormDescription>{t("workingHours.specialDate.activeDescription")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isActiveValue && ( // Only show price adjustment if the event itself is active
              <div className="space-y-4 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="hasPriceAdjustment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 rtl:space-x-reverse">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} id="hasPriceAdjustmentSwitch" />
                      </FormControl>
                      <FormLabel htmlFor="hasPriceAdjustmentSwitch" className="font-medium">
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
                  <>
                    <FormField
                      control={form.control}
                      name="priceAdjustmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("workingHours.priceAdjustment.type")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "fixed"} // Default to 'fixed' if undefined
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
                              value={field.value ?? ""} // Handle undefined for controlled input
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? undefined : Number.parseFloat(e.target.value))
                              }
                              placeholder={t("workingHours.priceAdjustment.valuePlaceholder")}
                              min="0"
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
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {specialDate ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

/**
 * @function generateTimeOptions
 * @description Generates an array of time strings in HH:MM format at 30-minute intervals.
 * @returns {string[]} An array of time strings.
 */
function generateTimeOptions(): string[] {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      options.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return options
}
