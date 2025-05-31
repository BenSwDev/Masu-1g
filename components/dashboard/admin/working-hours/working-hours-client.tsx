"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray, Controller, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Label } from "@/components/common/ui/label"
import { Textarea } from "@/components/common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/common/ui/dialog"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { toast } from "@/components/common/ui/use-toast"
import { getWorkingHoursSettings, updateWorkingHoursSettings } from "@/actions/working-hours-actions"
import type { IWorkingHoursSettings } from "@/lib/db/models/working-hours"
import { CalendarIcon, PlusCircle, Trash2, Edit, Save } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils/utils"

// Zod Schemas for validation
const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/

const fixedWorkingDaySchema = z
  .object({
    dayOfWeek: z.number().min(0).max(6),
    isActive: z.boolean(),
    startTime: z
      .string()
      .optional()
      .refine((val) => !val || timeRegex.test(val), { message: "Invalid start time format (HH:mm)" }),
    endTime: z
      .string()
      .optional()
      .refine((val) => !val || timeRegex.test(val), { message: "Invalid end time format (HH:mm)" }),
    hasSurcharge: z.boolean(),
    surchargeType: z.enum(["fixed", "percentage"]).optional(),
    surchargeAmount: z.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isActive) {
        return (
          data.startTime &&
          data.endTime &&
          timeRegex.test(data.startTime) &&
          timeRegex.test(data.endTime) &&
          data.startTime < data.endTime
        )
      }
      return true
    },
    {
      message: "If active, start and end times are required, and start time must be before end time.",
      path: ["startTime"],
    },
  )
  .refine((data) => !data.hasSurcharge || (data.surchargeType && data.surchargeAmount !== undefined), {
    message: "If surcharge is enabled, type and amount are required.",
    path: ["surchargeType"],
  })

const specialDateWorkingHoursSchema = z
  .object({
    _id: z.string().optional(), // Mongoose ObjectId as string
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }), // Date as string YYYY-MM-DD
    description: z.string().optional(),
    isActive: z.boolean(),
    startTime: z
      .string()
      .optional()
      .refine((val) => !val || timeRegex.test(val), { message: "Invalid start time format (HH:mm)" }),
    endTime: z
      .string()
      .optional()
      .refine((val) => !val || timeRegex.test(val), { message: "Invalid end time format (HH:mm)" }),
    hasSurcharge: z.boolean(),
    surchargeType: z.enum(["fixed", "percentage"]).optional(),
    surchargeAmount: z.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isActive) {
        return (
          data.startTime &&
          data.endTime &&
          timeRegex.test(data.startTime) &&
          timeRegex.test(data.endTime) &&
          data.startTime < data.endTime
        )
      }
      return true
    },
    {
      message: "If active, start and end times are required, and start time must be before end time.",
      path: ["startTime"],
    },
  )
  .refine((data) => !data.hasSurcharge || (data.surchargeType && data.surchargeAmount !== undefined), {
    message: "If surcharge is enabled, type and amount are required.",
    path: ["surchargeType"],
  })

const workingHoursSettingsSchema = z.object({
  fixedHours: z.array(fixedWorkingDaySchema).length(7),
  specialDates: z.array(specialDateWorkingHoursSchema),
})

type WorkingHoursFormData = z.infer<typeof workingHoursSettingsSchema>

const dayOfWeekMapping: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
}

export function WorkingHoursClient() {
  const { t, dir } = useTranslation()
  const queryClient = useQueryClient()
  const [isSpecialDateDialogOpen, setIsSpecialDateDialogOpen] = useState(false)
  const [editingSpecialDateIndex, setEditingSpecialDateIndex] = useState<number | null>(null)

  const {
    data: settings,
    isLoading,
    error: fetchError,
  } = useQuery<IWorkingHoursSettings, Error>({
    queryKey: ["workingHoursSettings"],
    queryFn: async () => {
      const result = await getWorkingHoursSettings()
      if (!result.success || !result.settings) {
        throw new Error(result.error || t("workingHours.errorFetching"))
      }
      // Ensure fixedHours is sorted and has 7 days
      const sortedFixedHours = result.settings.fixedHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      const completeFixedHours = Array.from({ length: 7 }, (_, i) => {
        const day = sortedFixedHours.find((d) => d.dayOfWeek === i)
        return day || { dayOfWeek: i, isActive: false, hasSurcharge: false, startTime: "09:00", endTime: "17:00" }
      })
      return { ...result.settings, fixedHours: completeFixedHours }
    },
  })

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isValid },
  } = useForm<WorkingHoursFormData>({
    resolver: zodResolver(workingHoursSettingsSchema),
    defaultValues: {
      fixedHours: Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        isActive: false,
        hasSurcharge: false,
        startTime: "09:00",
        endTime: "17:00",
        notes: "",
        surchargeAmount: 0,
        surchargeType: "fixed",
      })),
      specialDates: [],
    },
  })

  const {
    fields: specialDateFields,
    append: appendSpecialDate,
    remove: removeSpecialDate,
    update: updateSpecialDate,
  } = useFieldArray({
    control,
    name: "specialDates",
  })

  useEffect(() => {
    if (settings) {
      const transformedSettings = {
        ...settings,
        fixedHours: settings.fixedHours.map((fh) => ({
          ...fh,
          startTime: fh.startTime || "",
          endTime: fh.endTime || "",
          surchargeAmount: fh.surchargeAmount === undefined ? undefined : Number(fh.surchargeAmount),
          notes: fh.notes || "",
        })),
        specialDates: settings.specialDates.map((sd) => ({
          ...sd,
          _id: sd._id?.toString(),
          date: sd.date ? format(parseISO(sd.date as unknown as string), "yyyy-MM-dd") : "",
          startTime: sd.startTime || "",
          endTime: sd.endTime || "",
          surchargeAmount: sd.surchargeAmount === undefined ? undefined : Number(sd.surchargeAmount),
          notes: sd.notes || "",
          description: sd.description || "",
        })),
      }
      reset(transformedSettings)
    }
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: updateWorkingHoursSettings,
    onSuccess: (data) => {
      if (data.success && data.settings) {
        queryClient.setQueryData(["workingHoursSettings"], data.settings)
        toast({ title: t("workingHours.changesSaved"), variant: "default" })
        reset(data.settings) // Reset form with new data to clear dirty state
      } else {
        toast({ title: t("workingHours.errorSaving"), description: data.error, variant: "destructive" })
      }
    },
    onError: (error: Error) => {
      toast({ title: t("workingHours.errorSaving"), description: error.message, variant: "destructive" })
    },
  })

  const onSubmit: SubmitHandler<WorkingHoursFormData> = (data) => {
    const dataToSubmit = {
      ...data,
      specialDates: data.specialDates.map((sd) => ({
        ...sd,
        surchargeAmount: sd.surchargeAmount !== undefined ? Number(sd.surchargeAmount) : undefined,
      })),
      fixedHours: data.fixedHours.map((fh) => ({
        ...fh,
        surchargeAmount: fh.surchargeAmount !== undefined ? Number(fh.surchargeAmount) : undefined,
      })),
    }
    mutation.mutate(dataToSubmit)
  }

  const handleAddSpecialDate = () => {
    setEditingSpecialDateIndex(null)
    appendSpecialDate({
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      isActive: true,
      startTime: "09:00",
      endTime: "17:00",
      hasSurcharge: false,
      notes: "",
    })
    setIsSpecialDateDialogOpen(true)
    setEditingSpecialDateIndex(specialDateFields.length) // New item will be at the end
  }

  const handleEditSpecialDate = (index: number) => {
    setEditingSpecialDateIndex(index)
    setIsSpecialDateDialogOpen(true)
  }

  const handleSaveSpecialDate = () => {
    // Validation for the specific special date being edited can be done here if needed
    // For now, relying on the main form validation
    setIsSpecialDateDialogOpen(false)
    setEditingSpecialDateIndex(null)
  }

  if (isLoading) return <p>{t("common.loading")}</p>
  if (fetchError)
    return (
      <p>
        {t("workingHours.errorFetching")}: {fetchError.message}
      </p>
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("workingHours.fixedHoursTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("workingHours.day")}</TableHead>
                <TableHead>{t("workingHours.active")}</TableHead>
                <TableHead>{t("workingHours.startTime")}</TableHead>
                <TableHead>{t("workingHours.endTime")}</TableHead>
                <TableHead>{t("workingHours.priceSurcharge")}</TableHead>
                <TableHead>{t("workingHours.surchargeType")}</TableHead>
                <TableHead>{t("workingHours.surchargeAmount")}</TableHead>
                <TableHead>{t("workingHours.notes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {watch("fixedHours")?.map((day, index) => (
                <TableRow key={day.dayOfWeek}>
                  <TableCell>{t(`workingHours.${dayOfWeekMapping[day.dayOfWeek]}`)}</TableCell>
                  <TableCell>
                    <Controller
                      name={`fixedHours.${index}.isActive`}
                      control={control}
                      render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
                    />
                  </TableCell>
                  {watch(`fixedHours.${index}.isActive`) && (
                    <>
                      <TableCell>
                        <Input type="time" {...register(`fixedHours.${index}.startTime`)} className="w-32" />
                        {errors.fixedHours?.[index]?.startTime && (
                          <p className="text-red-500 text-xs">{errors.fixedHours[index]?.startTime?.message}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input type="time" {...register(`fixedHours.${index}.endTime`)} className="w-32" />
                        {errors.fixedHours?.[index]?.endTime && (
                          <p className="text-red-500 text-xs">{errors.fixedHours[index]?.endTime?.message}</p>
                        )}
                        {errors.fixedHours?.[index]?.startTime?.message?.includes("before end time") && (
                          <p className="text-red-500 text-xs">{errors.fixedHours[index]?.startTime?.message}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`fixedHours.${index}.hasSurcharge`}
                          control={control}
                          render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
                        />
                      </TableCell>
                      {watch(`fixedHours.${index}.hasSurcharge`) && (
                        <>
                          <TableCell>
                            <Controller
                              name={`fixedHours.${index}.surchargeType`}
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder={t("workingHours.surchargeType")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">{t("workingHours.fixedAmount")}</SelectItem>
                                    <SelectItem value="percentage">{t("workingHours.percentage")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              {...register(`fixedHours.${index}.surchargeAmount`, { valueAsNumber: true })}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Textarea {...register(`fixedHours.${index}.notes`)} className="min-w-[150px]" />
                          </TableCell>
                        </>
                      )}
                      {/* Placeholders for empty cells if surcharge not active */}
                      {!watch(`fixedHours.${index}.hasSurcharge`) && (
                        <>
                          <TableCell />
                          <TableCell />
                          <TableCell />
                        </>
                      )}
                    </>
                  )}
                  {/* Placeholders for empty cells if day not active */}
                  {!watch(`fixedHours.${index}.isActive`) && (
                    <>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {errors.fixedHours && errors.fixedHours.root && (
            <p className="text-red-500 text-sm mt-2">{errors.fixedHours.root.message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("workingHours.specialDatesTitle")}</CardTitle>
          <Button type="button" onClick={handleAddSpecialDate} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> {t("workingHours.addSpecialDate")}
          </Button>
        </CardHeader>
        <CardContent>
          {specialDateFields.length === 0 ? (
            <p>{t("common.noResults", { results: t("workingHours.specialDatesTitle").toLowerCase() })}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("workingHours.date")}</TableHead>
                  <TableHead>{t("workingHours.description")}</TableHead>
                  <TableHead>{t("workingHours.active")}</TableHead>
                  <TableHead>{t("workingHours.startTime")}</TableHead>
                  <TableHead>{t("workingHours.endTime")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialDateFields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>{field.date ? format(parseISO(field.date), "dd/MM/yyyy") : ""}</TableCell>
                    <TableCell>{field.description}</TableCell>
                    <TableCell>
                      <Checkbox checked={field.isActive} disabled />
                    </TableCell>
                    <TableCell>{field.isActive ? field.startTime : "-"}</TableCell>
                    <TableCell>{field.isActive ? field.endTime : "-"}</TableCell>
                    <TableCell className="space-x-2 flex">
                      <Button type="button" variant="outline" size="icon" onClick={() => handleEditSpecialDate(index)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeSpecialDate(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isSpecialDateDialogOpen}
        onOpenChange={(open) => {
          setIsSpecialDateDialogOpen(open)
          if (!open) setEditingSpecialDateIndex(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSpecialDateIndex !== null && specialDateFields[editingSpecialDateIndex]
                ? t("workingHours.editSpecialDate")
                : t("workingHours.addSpecialDate")}
            </DialogTitle>
          </DialogHeader>
          {editingSpecialDateIndex !== null && specialDateFields[editingSpecialDateIndex] && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`specialDates.${editingSpecialDateIndex}.date`}>{t("workingHours.date")}</Label>
                  <Controller
                    name={`specialDates.${editingSpecialDateIndex}.date`}
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(parseISO(field.value), "PPP", {
                                locale:
                                  dir === "rtl" ? require("date-fns/locale/he") : require("date-fns/locale/en-US"),
                              })
                            ) : (
                              <span>{t("common.pickDate")}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.specialDates?.[editingSpecialDateIndex]?.date && (
                    <p className="text-red-500 text-xs">
                      {errors.specialDates[editingSpecialDateIndex]?.date?.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`specialDates.${editingSpecialDateIndex}.description`}>
                    {t("workingHours.description")}
                  </Label>
                  <Input {...register(`specialDates.${editingSpecialDateIndex}.description`)} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name={`specialDates.${editingSpecialDateIndex}.isActive`}
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id={`specialDates.${editingSpecialDateIndex}.isActive`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor={`specialDates.${editingSpecialDateIndex}.isActive`}>{t("workingHours.active")}</Label>
              </div>

              {watch(`specialDates.${editingSpecialDateIndex}.isActive`) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                  <div>
                    <Label htmlFor={`specialDates.${editingSpecialDateIndex}.startTime`}>
                      {t("workingHours.startTime")}
                    </Label>
                    <Input type="time" {...register(`specialDates.${editingSpecialDateIndex}.startTime`)} />
                    {errors.specialDates?.[editingSpecialDateIndex]?.startTime && (
                      <p className="text-red-500 text-xs">
                        {errors.specialDates[editingSpecialDateIndex]?.startTime?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`specialDates.${editingSpecialDateIndex}.endTime`}>
                      {t("workingHours.endTime")}
                    </Label>
                    <Input type="time" {...register(`specialDates.${editingSpecialDateIndex}.endTime`)} />
                    {errors.specialDates?.[editingSpecialDateIndex]?.endTime && (
                      <p className="text-red-500 text-xs">
                        {errors.specialDates[editingSpecialDateIndex]?.endTime?.message}
                      </p>
                    )}
                    {errors.specialDates?.[editingSpecialDateIndex]?.startTime?.message?.includes(
                      "before end time",
                    ) && (
                      <p className="text-red-500 text-xs">
                        {errors.specialDates[editingSpecialDateIndex]?.startTime?.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Controller
                  name={`specialDates.${editingSpecialDateIndex}.hasSurcharge`}
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id={`specialDates.${editingSpecialDateIndex}.hasSurcharge`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor={`specialDates.${editingSpecialDateIndex}.hasSurcharge`}>
                  {t("workingHours.priceSurcharge")}
                </Label>
              </div>

              {watch(`specialDates.${editingSpecialDateIndex}.hasSurcharge`) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                  <div>
                    <Label htmlFor={`specialDates.${editingSpecialDateIndex}.surchargeType`}>
                      {t("workingHours.surchargeType")}
                    </Label>
                    <Controller
                      name={`specialDates.${editingSpecialDateIndex}.surchargeType`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("workingHours.surchargeType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">{t("workingHours.fixedAmount")}</SelectItem>
                            <SelectItem value="percentage">{t("workingHours.percentage")}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`specialDates.${editingSpecialDateIndex}.surchargeAmount`}>
                      {t("workingHours.surchargeAmount")}
                    </Label>
                    <Input
                      type="number"
                      {...register(`specialDates.${editingSpecialDateIndex}.surchargeAmount`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`specialDates.${editingSpecialDateIndex}.notes`}>{t("workingHours.notes")}</Label>
                    <Textarea {...register(`specialDates.${editingSpecialDateIndex}.notes`)} />
                  </div>
                </div>
              )}
              {errors.specialDates?.[editingSpecialDateIndex]?.surchargeType && (
                <p className="text-red-500 text-xs">
                  {errors.specialDates[editingSpecialDateIndex]?.surchargeType?.message}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsSpecialDateDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleSaveSpecialDate}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={mutation.isPending || !isDirty || !isValid}>
          {mutation.isPending ? t("common.saving") : t("workingHours.saveChanges")} <Save className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
