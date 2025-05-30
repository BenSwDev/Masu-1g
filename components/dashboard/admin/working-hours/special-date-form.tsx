"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { addSpecialDate, updateSpecialDate } from "@/actions/working-hours-actions"
import { Button } from "@/components/common/ui/button" // Corrected path
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card" // Corrected path
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form" // Corrected path
import { Input } from "@/components/common/ui/input" // Corrected path
import { Textarea } from "@/components/common/ui/textarea" // Corrected path
import { Switch } from "@/components/common/ui/switch" // Corrected path
import { Calendar } from "@/components/common/ui/calendar" // Corrected path
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover" // Corrected path
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group" // Corrected path
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select" // Corrected path
import { useToast } from "@/components/common/ui/use-toast" // Corrected path
import { CalendarIcon, Info, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip" // Corrected path
import type { IWorkingHours, ISpecialDate } from "@/lib/db/models/working-hours"

// Define a type for the radio group options
type WorkingTimeType = "default" | "custom" | "closed"

interface SpecialDateFormProps {
  specialDate?: ISpecialDate // Use ISpecialDate from models
  weeklyHours: IWorkingHours["weeklyHours"] // Added this prop
  onSuccess: () => void
  onCancel: () => void
}

// This is already a named export, which is correct.
export function SpecialDateForm({ specialDate, weeklyHours, onSuccess, onCancel }: SpecialDateFormProps) {
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
      workingTimeType: z.enum(["default", "custom", "closed"]),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      hasPriceAdjustment: z.boolean().default(false),
      priceAdjustmentType: z.enum(["percentage", "fixed"]).optional(),
      priceAdjustmentValue: z.coerce.number().optional(),
      priceAdjustmentReason: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.workingTimeType === "custom") {
        if (!data.startTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["startTime"],
            message: t("workingHours.specialDate.errors.startTimeRequiredIfCustom"),
          })
        }
        if (!data.endTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["endTime"],
            message: t("workingHours.specialDate.errors.endTimeRequiredIfCustom"),
          })
        }
        if (data.startTime && data.endTime && data.startTime >= data.endTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["endTime"],
            message: t("workingHours.specialDate.errors.endTimeAfterStart"),
          })
        }
      }

      if (data.hasPriceAdjustment && data.workingTimeType !== "closed") {
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
    })

  type SpecialDateFormValues = z.infer<typeof specialDateFormSchema>

  const getInitialWorkingTimeType = (): WorkingTimeType => {
    if (specialDate) {
      if (!specialDate.isActive) return "closed"
      if (specialDate.startTime && specialDate.endTime) return "custom"
    }
    return "default"
  }

  const form = useForm<SpecialDateFormValues>({
    resolver: zodResolver(specialDateFormSchema),
    defaultValues: {
      date: specialDate ? new Date(specialDate.date) : new Date(),
      name: specialDate?.name || "",
      description: specialDate?.description || "",
      workingTimeType: getInitialWorkingTimeType(),
      startTime: specialDate?.startTime || "",
      endTime: specialDate?.endTime || "",
      hasPriceAdjustment: !!specialDate?.priceAdjustment && specialDate?.isActive !== false,
      priceAdjustmentType: specialDate?.priceAdjustment?.type || "fixed",
      priceAdjustmentValue: specialDate?.priceAdjustment?.value || 0,
      priceAdjustmentReason: specialDate?.priceAdjustment?.reason || "",
    },
  })

  const workingTimeTypeValue = form.watch("workingTimeType")
  const hasPriceAdjustmentValue = form.watch("hasPriceAdjustment")
  const priceAdjustmentTypeValue = form.watch("priceAdjustmentType")

  useEffect(() => {
    if (workingTimeTypeValue === "default" || workingTimeTypeValue === "closed") {
      form.setValue("startTime", "")
      form.setValue("endTime", "")
    }
    if (workingTimeTypeValue === "closed") {
      form.setValue("hasPriceAdjustment", false)
    }
  }, [workingTimeTypeValue, form])

  const onSubmit = async (values: SpecialDateFormValues) => {
    try {
      setIsSubmitting(true)
      const {
        hasPriceAdjustment,
        priceAdjustmentType,
        priceAdjustmentValue,
        priceAdjustmentReason,
        workingTimeType: type, // Renamed to avoid conflict
        ...coreValues
      } = values

      const payload: Partial<ISpecialDate> & { date: Date; name: string } = {
        // Ensure required fields are present
        ...coreValues,
        date: new Date(coreValues.date), // Ensure date is a Date object
        isActive: type !== "closed",
        startTime: type === "custom" ? coreValues.startTime : null, // Use null for clearing
        endTime: type === "custom" ? coreValues.endTime : null, // Use null for clearing
        priceAdjustment: undefined, // Default to undefined
      }

      if (
        type !== "closed" &&
        hasPriceAdjustment &&
        priceAdjustmentType &&
        priceAdjustmentValue !== undefined &&
        priceAdjustmentValue !== null
      ) {
        payload.priceAdjustment = {
          type: priceAdjustmentType,
          value: priceAdjustmentValue,
          reason: priceAdjustmentReason || "", // Ensure reason is a string
        }
      }

      if (specialDate && specialDate._id) {
        // Check for _id for update
        await updateSpecialDate(specialDate._id, payload)
      } else {
        // For addSpecialDate, ensure all required fields of ISpecialDate are met
        // The action might need to handle default values for non-provided optional fields
        await addSpecialDate(payload as Omit<ISpecialDate, "_id" | "createdAt" | "updatedAt">)
      }

      toast({
        title: t("common.success"),
        description: specialDate
          ? t("workingHours.specialDate.updateSuccess")
          : t("workingHours.specialDate.createSuccess"),
        variant: "success",
      })
      onSuccess()
    } catch (error: any) {
      console.error("Error submitting special date form:", error)
      toast({
        title: t("common.error"),
        description:
          error.message ||
          (specialDate ? t("workingHours.specialDate.updateError") : t("workingHours.specialDate.createError")),
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
        {specialDate && <CardDescription>{format(new Date(specialDate.date), "PPP")}</CardDescription>}
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {!specialDate && ( // Only show date picker for new special dates
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
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          dir={t("common.dir") as "ltr" | "rtl" | undefined}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                    <Textarea {...field} rows={3} placeholder={t("workingHours.specialDate.descriptionPlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workingTimeType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t("workingHours.specialDate.fields.workingTimeType")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value} // Ensure value is controlled
                      className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 rtl:sm:space-x-reverse"
                    >
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem value="default" id="default-hours" />
                        </FormControl>
                        <FormLabel htmlFor="default-hours" className="font-normal cursor-pointer">
                          {t("workingHours.specialDate.types.defaultDayHours")}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem value="custom" id="custom-hours" />
                        </FormControl>
                        <FormLabel htmlFor="custom-hours" className="font-normal cursor-pointer">
                          {t("workingHours.specialDate.types.customHours")}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem value="closed" id="closed-day" />
                        </FormControl>
                        <FormLabel htmlFor="closed-day" className="font-normal cursor-pointer">
                          {t("workingHours.specialDate.types.closed")}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {workingTimeTypeValue === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("workingHours.specialDate.fields.startTime")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        dir={t("common.dir") as "ltr" | "rtl" | undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("workingHours.selectTime")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                        value={field.value || ""}
                        dir={t("common.dir") as "ltr" | "rtl" | undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("workingHours.selectTime")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions
                            .filter((time) => !form.getValues("startTime") || time > form.getValues("startTime"))
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
            )}

            {workingTimeTypeValue !== "closed" && (
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
                            value={field.value} // Ensure value is controlled
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
                            {priceAdjustmentTypeValue === "percentage" ? "%" : t("common.currencySymbol")}){" "}
                            {/* Use currencySymbol */}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)} // Ensure number
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
                {specialDate ? t("common.saveChanges") : t("common.create")} {/* More specific save text */}
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
