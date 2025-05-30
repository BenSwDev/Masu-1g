"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { addSpecialDate, updateSpecialDate } from "@/actions/working-hours-actions"
import { Button } from "@/components/common/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/common/ui/dialog"
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
import { CalendarIcon, Info, Loader2, SaveIcon, XIcon } from "lucide-react"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import type { ClientWorkingHours } from "@/lib/db/models/working-hours"

type SpecialDateClient = ClientWorkingHours["specialDates"][0]

interface SpecialDateFormProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  specialDate?: SpecialDateClient
  onSuccess: () => void
}

export function SpecialDateForm({ isOpen, onOpenChange, specialDate, onSuccess }: SpecialDateFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const specialDateFormSchema = z
    .object({
      date: z.date({ required_error: t("workingHours.specialDate.errors.dateRequired") }),
      name: z
        .string()
        .min(2, { message: t("workingHours.specialDate.errors.nameMinLength") })
        .max(100, { message: t("workingHours.specialDate.errors.nameMaxLength") }),
      description: z
        .string()
        .max(500, { message: t("workingHours.specialDate.errors.descriptionMaxLength") })
        .optional(),
      isActive: z.boolean().default(true),
      isClosed: z.boolean().default(false), // New field
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      priceAdjustment: z
        .object({
          type: z.enum(["percentage", "fixed"]),
          value: z.coerce.number().min(0, { message: t("workingHours.priceAdjustment.errors.valueNegative") }),
          reason: z
            .string()
            .max(200, { message: t("workingHours.priceAdjustment.errors.reasonMaxLength") })
            .optional(),
        })
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.isClosed) return // If closed, no need to validate times

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

      if (data.priceAdjustment && data.priceAdjustment.value < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["priceAdjustment.value"],
          message: t("workingHours.priceAdjustment.errors.valueNegative"),
        })
      }
    })

  type SpecialDateFormValues = z.infer<typeof specialDateFormSchema>

  const form = useForm<SpecialDateFormValues>({
    resolver: zodResolver(specialDateFormSchema),
    defaultValues: {
      date: specialDate?.date ? new Date(specialDate.date) : new Date(),
      name: specialDate?.name || "",
      description: specialDate?.description || "",
      isActive: specialDate?.isActive ?? true,
      isClosed: specialDate?.isClosed ?? false,
      startTime: specialDate?.startTime || "",
      endTime: specialDate?.endTime || "",
      priceAdjustment: specialDate?.priceAdjustment || undefined,
    },
  })

  useEffect(() => {
    form.reset({
      date: specialDate?.date ? new Date(specialDate.date) : new Date(),
      name: specialDate?.name || "",
      description: specialDate?.description || "",
      isActive: specialDate?.isActive ?? true,
      isClosed: specialDate?.isClosed ?? false,
      startTime: specialDate?.startTime || "",
      endTime: specialDate?.endTime || "",
      priceAdjustment: specialDate?.priceAdjustment || undefined,
    })
  }, [specialDate, form, isOpen])

  const watchIsClosed = form.watch("isClosed")
  const watchHasPriceAdjustment = form.watch("priceAdjustment") !== undefined

  const onSubmit = async (values: SpecialDateFormValues) => {
    setIsSubmitting(true)
    try {
      const payload: any = {
        ...values,
        date: values.date.toISOString(), // Ensure date is ISO string for server
        startTime: values.isClosed ? undefined : values.startTime || undefined,
        endTime: values.isClosed ? undefined : values.endTime || undefined,
        priceAdjustment:
          values.priceAdjustment && values.priceAdjustment.value > 0 ? values.priceAdjustment : undefined,
      }

      if (!values.isActive) {
        // If not active, no price adjustment should apply
        payload.priceAdjustment = undefined
      }

      let result
      if (specialDate?._id) {
        result = await updateSpecialDate(specialDate._id, payload)
      } else {
        result = await addSpecialDate(payload)
      }

      if (result.success) {
        toast({
          title: t("common.success"),
          description: t(
            specialDate ? "workingHours.specialDate.updateSuccess" : "workingHours.specialDate.createSuccess",
          ),
          variant: "success",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(result.error || t("common.unknownError"))
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description:
          error instanceof Error
            ? error.message
            : t(specialDate ? "workingHours.specialDate.updateError" : "workingHours.specialDate.createError"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const timeOptions = generateTimeOptions()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {specialDate ? t("workingHours.specialDate.form.title.edit") : t("workingHours.specialDate.form.title.add")}
          </DialogTitle>
          <DialogDescription>{t("workingHours.specialDate.form.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-2">
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
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                    <Textarea {...field} rows={2} placeholder={t("workingHours.specialDate.descriptionPlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm">{t("workingHours.specialDate.fields.isActiveEvent")}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isClosed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">{t("workingHours.specialDate.fields.isClosed")}</FormLabel>
                    <FormDescription className="text-xs">
                      {t("workingHours.specialDate.isClosedDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {!watchIsClosed && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        value={field.value || ""}
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
                            .filter((time) => !form.getValues("startTime") || time > form.getValues("startTime")!)
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

            {form.getValues("isActive") && (
              <div className="space-y-4 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="priceAdjustment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 rtl:space-x-reverse">
                      <FormControl>
                        <Switch
                          checked={!!field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? { type: "fixed", value: 0, reason: "" } : undefined)
                          }
                          id="hasPriceAdjustmentSwitch"
                        />
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
                {watchHasPriceAdjustment && form.getValues("priceAdjustment") && (
                  <>
                    <FormField
                      control={form.control}
                      name="priceAdjustment.type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("workingHours.priceAdjustment.type")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
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
                      name="priceAdjustment.value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("workingHours.priceAdjustment.value")} (
                            {form.getValues("priceAdjustment.type") === "percentage" ? "%" : t("common.currency")})
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
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
                      name="priceAdjustment.reason"
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
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  <XIcon className="mr-2 h-4 w-4" />
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <SaveIcon className="mr-2 h-4 w-4" />
                {specialDate ? t("common.save") : t("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function generateTimeOptions() {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      // 15-minute intervals
      options.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`)
    }
  }
  return options
}
