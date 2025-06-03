"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod" // Removed 'type ZodType' as it's not explicitly used now
import { format, parse } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"
import { CalendarIcon, Clock, Plus, Trash2, Edit, AlertTriangle } from "lucide-react"
import type { TFunction } from "i18next"

import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Textarea } from "@/components/common/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/common/ui/dialog"
import { Calendar as CalendarComponent } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/common/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { useToast } from "@/components/common/ui/use-toast"
import { useTranslation } from "@/lib/translations/i18n"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Badge } from "@/components/common/ui/badge"

import { getWorkingHoursSettings, updateWorkingHoursSettings } from "@/actions/working-hours-actions"
import type { IWorkingHoursSettings, IFixedHours } from "@/lib/db/models/working-hours"

// Schemas with translation function
// Return types will be inferred by TypeScript
const getPriceAdditionSchema = (t: TFunction) =>
  z.object({
    amount: z
      .number({
        required_error: t("workingHours.validation.amountRequired"),
        invalid_type_error: t("workingHours.validation.amountMustBeNumber"),
      })
      .min(0, t("workingHours.validation.amountPositive")),
    type: z.enum(["fixed", "percentage"], {
      required_error: t("workingHours.validation.typeRequired"),
    }),
  })

const getFixedHoursSchema = (t: TFunction) =>
  z
    .object({
      dayOfWeek: z.number().min(0).max(6),
      isActive: z.boolean(),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t("workingHours.validation.invalidTimeFormat")),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t("workingHours.validation.invalidTimeFormat")),
      hasPriceAddition: z.boolean(),
      priceAddition: getPriceAdditionSchema(t).optional(),
      notes: z.string().max(500, t("workingHours.validation.notesTooLong")).optional(),
    })
    .refine(
      (data) => {
        if (data.isActive && (!data.startTime || !data.endTime)) {
          return false
        }
        return true
      },
      {
        message: t("workingHours.validation.timeRequiredWhenActive"),
        path: ["startTime"],
      },
    )
    .refine(
      (data) => {
        if (data.hasPriceAddition && !data.priceAddition) {
          return false
        }
        return true
      },
      {
        message: t("workingHours.validation.priceAdditionDetailsRequired"),
        path: ["priceAddition"], // Changed path to be more general for the object
      },
    )

const getSpecialDateSchema = (t: TFunction) =>
  z
    .object({
      _id: z.string().optional(),
      name: z
        .string()
        .min(1, t("workingHours.validation.nameRequired"))
        .max(100, t("workingHours.validation.nameTooLong")),
      date: z.string().min(1, t("workingHours.validation.dateRequired")),
      isActive: z.boolean(),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t("workingHours.validation.invalidTimeFormat")),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t("workingHours.validation.invalidTimeFormat")),
      hasPriceAddition: z.boolean(),
      priceAddition: getPriceAdditionSchema(t).optional(),
      notes: z.string().max(500, t("workingHours.validation.notesTooLong")).optional(),
    })
    .refine(
      (data) => {
        if (data.isActive && (!data.startTime || !data.endTime)) {
          return false
        }
        return true
      },
      {
        message: t("workingHours.validation.timeRequiredWhenActive"),
        path: ["startTime"],
      },
    )
    .refine(
      (data) => {
        if (data.hasPriceAddition && !data.priceAddition) {
          return false
        }
        return true
      },
      {
        message: t("workingHours.validation.priceAdditionDetailsRequired"),
        path: ["priceAddition"], // Changed path
      },
    )

const getWorkingHoursSchema = (t: TFunction) =>
  z.object({
    fixedHours: z.array(getFixedHoursSchema(t)),
    specialDates: z.array(getSpecialDateSchema(t)),
  })

const getSpecialDateFormSchema = (t: TFunction) =>
  z
    .object({
      name: z
        .string()
        .min(1, t("workingHours.validation.nameRequired"))
        .max(100, t("workingHours.validation.nameTooLong")),
      date: z.date({
        required_error: t("workingHours.validation.dateRequiredCalendar"),
        invalid_type_error: t("workingHours.validation.dateInvalidCalendar"),
      }),
      isActive: z.boolean(),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t("workingHours.validation.invalidTimeFormat")),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t("workingHours.validation.invalidTimeFormat")),
      hasPriceAddition: z.boolean(),
      priceAddition: getPriceAdditionSchema(t).optional(),
      notes: z.string().max(500, t("workingHours.validation.notesTooLong")).optional(),
    })
    .refine(
      (data) => {
        if (data.isActive && (!data.startTime || !data.endTime)) {
          return false
        }
        return true
      },
      {
        message: t("workingHours.validation.timeRequiredWhenActive"),
        path: ["startTime"],
      },
    )
    .refine(
      (data) => {
        if (data.hasPriceAddition && !data.priceAddition) {
          return false
        }
        return true
      },
      {
        message: t("workingHours.validation.priceAdditionDetailsRequired"),
        path: ["priceAddition"], // Changed path
      },
    )

type WorkingHoursFormData = z.infer<ReturnType<typeof getWorkingHoursSchema>>
type SpecialDateFormData = z.infer<ReturnType<typeof getSpecialDateFormSchema>>

const defaultPriceAddition = { amount: 0, type: "fixed" as "fixed" | "percentage" }

const getDefaultFixedHours = (): IFixedHours[] => {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isActive: false,
    startTime: "09:00",
    endTime: "17:00",
    hasPriceAddition: false,
    priceAddition: undefined,
    notes: "",
  }))
}

const defaultSpecialDateFormValues: SpecialDateFormData = {
  name: "",
  date: new Date(),
  isActive: true,
  startTime: "09:00",
  endTime: "17:00",
  hasPriceAddition: false,
  priceAddition: undefined,
  notes: "",
}

export default function WorkingHoursClient() {
  const { t, language, dir } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isSpecialDateDialogOpen, setIsSpecialDateDialogOpen] = useState(false)
  const [editingSpecialDateIndex, setEditingSpecialDateIndex] = useState<number | null>(null)

  const workingHoursSchema = useMemo(() => getWorkingHoursSchema(t), [t])
  const specialDateFormSchema = useMemo(() => getSpecialDateFormSchema(t), [t])

  const {
    data: workingHoursData,
    isLoading,
    error: queryError,
  } = useQuery<IWorkingHoursSettings, Error>({
    queryKey: ["working-hours-settings"],
    queryFn: async () => {
      const result = await getWorkingHoursSettings()
      if (!result.success || !result.data) {
        toast({
          title: t("common.error"),
          description: result.error || t("workingHours.fetchError"),
          variant: "destructive",
        })
        return {
          _id: "",
          fixedHours: getDefaultFixedHours(),
          specialDates: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }
      const fixedHours =
        result.data.fixedHours && result.data.fixedHours.length === 7
          ? result.data.fixedHours.map((fh) => ({
              ...fh,
              priceAddition: fh.hasPriceAddition && fh.priceAddition ? fh.priceAddition : undefined,
            }))
          : getDefaultFixedHours()

      const specialDates = (result.data.specialDates || []).map((sd) => ({
        ...sd,
        date: format(new Date(sd.date), "yyyy-MM-dd"),
        priceAddition: sd.hasPriceAddition && sd.priceAddition ? sd.priceAddition : undefined,
      }))
      return { ...result.data, fixedHours, specialDates }
    },
    refetchOnWindowFocus: false,
  })

  const form = useForm<WorkingHoursFormData>({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: {
      fixedHours: getDefaultFixedHours(),
      specialDates: [],
    },
  })

  const specialDateForm = useForm<SpecialDateFormData>({
    resolver: zodResolver(specialDateFormSchema),
    defaultValues: defaultSpecialDateFormValues,
  })

  const {
    fields: specialDateFields,
    append: appendSpecialDate,
    remove: removeSpecialDate,
    update: updateSpecialDate,
  } = useFieldArray({
    control: form.control,
    name: "specialDates",
    keyName: "fieldId",
  })

  useEffect(() => {
    if (workingHoursData) {
      form.reset({
        fixedHours: workingHoursData.fixedHours.map((fh) => ({
          ...fh,
          priceAddition:
            fh.hasPriceAddition && fh.priceAddition
              ? fh.priceAddition
              : fh.hasPriceAddition
                ? defaultPriceAddition
                : undefined,
        })),
        specialDates: workingHoursData.specialDates.map((sd) => ({
          ...sd,
          date: sd.date,
          priceAddition:
            sd.hasPriceAddition && sd.priceAddition
              ? sd.priceAddition
              : sd.hasPriceAddition
                ? defaultPriceAddition
                : undefined,
        })),
      })
    }
  }, [workingHoursData, form, t])

  const updateMutation = useMutation({
    mutationFn: updateWorkingHoursSettings,
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t("workingHours.updateSuccess"),
          description: t("workingHours.updateSuccessDescription"),
        })
        queryClient.invalidateQueries({ queryKey: ["working-hours-settings"] })
      } else {
        toast({
          title: t("workingHours.updateError"),
          description: data.error || t("workingHours.updateErrorDescription"),
          variant: "destructive",
        })
      }
    },
    onError: (error: any) => {
      toast({
        title: t("workingHours.updateError"),
        description: error.message || t("workingHours.updateErrorDescription"),
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: WorkingHoursFormData) => {
    const processedData = {
      ...data,
      fixedHours: data.fixedHours.map((fh) => ({
        ...fh,
        priceAddition: fh.hasPriceAddition ? fh.priceAddition || defaultPriceAddition : undefined,
      })),
      specialDates: data.specialDates.map((sd) => ({
        ...sd,
        priceAddition: sd.hasPriceAddition ? sd.priceAddition || defaultPriceAddition : undefined,
      })),
    }
    updateMutation.mutate(processedData)
  }

  const handleOpenSpecialDateDialog = (index: number | null) => {
    if (index !== null) {
      const specialDate = form.getValues(`specialDates.${index}`)
      specialDateForm.reset({
        ...specialDate,
        date: parse(specialDate.date, "yyyy-MM-dd", new Date()),
        priceAddition:
          specialDate.hasPriceAddition && specialDate.priceAddition
            ? specialDate.priceAddition
            : specialDate.hasPriceAddition
              ? defaultPriceAddition
              : undefined,
      })
      setEditingSpecialDateIndex(index)
    } else {
      specialDateForm.reset(defaultSpecialDateFormValues)
      setEditingSpecialDateIndex(null)
    }
    setIsSpecialDateDialogOpen(true)
  }

  const handleSpecialDateFormSubmit = (data: SpecialDateFormData) => {
    const specialDateToSave = {
      ...data,
      date: format(data.date, "yyyy-MM-dd"),
      priceAddition: data.hasPriceAddition ? data.priceAddition || defaultPriceAddition : undefined,
    }

    if (editingSpecialDateIndex !== null) {
      updateSpecialDate(editingSpecialDateIndex, specialDateToSave)
    } else {
      appendSpecialDate(specialDateToSave)
    }
    setIsSpecialDateDialogOpen(false)
  }

  const handleDeleteSpecialDate = (index: number) => {
    removeSpecialDate(index)
    toast({ title: t("workingHours.specialDateDeleted") })
  }

  const dayNames = useMemo(
    () => [
      t("workingHours.days.sunday"),
      t("workingHours.days.monday"),
      t("workingHours.days.tuesday"),
      t("workingHours.days.wednesday"),
      t("workingHours.days.thursday"),
      t("workingHours.days.friday"),
      t("workingHours.days.saturday"),
    ],
    [t],
  )

  const dateLocale = useMemo(() => {
    if (language === "he") return he
    if (language === "ru") return ru
    return enUS
  }, [language])

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-8 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (queryError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-xl font-semibold">{t("common.errorOccurred")}</p>
        <p>{queryError.message || t("workingHours.fetchError")}</p>
      </div>
    )
  }

  const watchedFixedHours = form.watch("fixedHours")
  const watchedSpecialDates = form.watch("specialDates")

  return (
    <div className="w-full max-w-full overflow-hidden p-4 space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Form errors:", errors))}
          className="space-y-6"
        >
          <Tabs defaultValue="fixed-hours" className="w-full" dir={dir}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fixed-hours">{t("workingHours.fixedHoursTab")}</TabsTrigger>
              <TabsTrigger value="special-dates">{t("workingHours.specialDatesTab")}</TabsTrigger>
            </TabsList>

            <TabsContent value="fixed-hours">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t("workingHours.fixedHours")}
                  </CardTitle>
                  <CardDescription>{t("workingHours.fixedHoursDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("workingHours.day")}</TableHead>
                          <TableHead className="text-center">{t("workingHours.active")}</TableHead>
                          <TableHead>{t("workingHours.startTime")}</TableHead>
                          <TableHead>{t("workingHours.endTime")}</TableHead>
                          <TableHead>{t("workingHours.priceAddition")}</TableHead>
                          <TableHead>{t("workingHours.notes")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {watchedFixedHours?.map((_, index) => {
                          const dayOfWeek = watchedFixedHours[index]?.dayOfWeek
                          const isActive = watchedFixedHours[index]?.isActive
                          const hasPriceAddition = watchedFixedHours[index]?.hasPriceAddition

                          return (
                            <TableRow key={`fixed-${index}`}>
                              <TableCell className="font-medium">{dayNames[dayOfWeek]}</TableCell>
                              <TableCell className="text-center">
                                <FormField
                                  control={form.control}
                                  name={`fixedHours.${index}.isActive`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={(checked) => {
                                            field.onChange(checked)
                                            if (!checked) {
                                              form.setValue(`fixedHours.${index}.hasPriceAddition`, false)
                                              form.setValue(`fixedHours.${index}.priceAddition`, undefined)
                                            }
                                          }}
                                          aria-label={`${t("workingHours.active")} for ${dayNames[dayOfWeek]}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                {isActive && (
                                  <FormField
                                    control={form.control}
                                    name={`fixedHours.${index}.startTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input type="time" {...field} className="w-full max-w-[120px]" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {isActive && (
                                  <FormField
                                    control={form.control}
                                    name={`fixedHours.${index}.endTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input type="time" {...field} className="w-full max-w-[120px]" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {isActive && (
                                  <div className="space-y-2">
                                    <FormField
                                      control={form.control}
                                      name={`fixedHours.${index}.hasPriceAddition`}
                                      render={({ field }) => (
                                        <FormItem className="flex items-center gap-2">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value}
                                              onCheckedChange={(checked) => {
                                                field.onChange(checked)
                                                if (checked && !form.getValues(`fixedHours.${index}.priceAddition`)) {
                                                  form.setValue(
                                                    `fixedHours.${index}.priceAddition`,
                                                    defaultPriceAddition,
                                                  )
                                                } else if (!checked) {
                                                  form.setValue(`fixedHours.${index}.priceAddition`, undefined)
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="text-sm font-normal">
                                            {t("workingHours.enablePriceAddition")}
                                          </FormLabel>
                                        </FormItem>
                                      )}
                                    />
                                    {hasPriceAddition && (
                                      <div className="flex gap-2">
                                        <FormField
                                          control={form.control}
                                          name={`fixedHours.${index}.priceAddition.amount`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  placeholder="0"
                                                  {...field}
                                                  onChange={(e) =>
                                                    field.onChange(
                                                      e.target.value === ""
                                                        ? undefined
                                                        : Number.parseFloat(e.target.value),
                                                    )
                                                  }
                                                  className="w-20"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={form.control}
                                          name={`fixedHours.${index}.priceAddition.type`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <Select onValueChange={field.onChange} value={field.value || "fixed"}>
                                                <FormControl>
                                                  <SelectTrigger className="w-[90px]">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                  <SelectItem value="fixed">
                                                    {t("workingHours.priceAdditionTypes.fixed")}
                                                  </SelectItem>
                                                  <SelectItem value="percentage">
                                                    {t("workingHours.priceAdditionTypes.percentage")}
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {isActive && (
                                  <FormField
                                    control={form.control}
                                    name={`fixedHours.${index}.notes`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Textarea
                                            {...field}
                                            placeholder={t("workingHours.notesPlaceholder")}
                                            className="min-h-[60px] w-full max-w-[200px]"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden space-y-4">
                    {watchedFixedHours?.map((_, index) => {
                      const dayOfWeek = watchedFixedHours[index]?.dayOfWeek
                      const isActive = watchedFixedHours[index]?.isActive
                      const hasPriceAddition = watchedFixedHours[index]?.hasPriceAddition
                      return (
                        <Card key={`fixed-mobile-${index}`} className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-lg">{dayNames[dayOfWeek]}</h3>
                              <FormField
                                control={form.control}
                                name={`fixedHours.${index}.isActive`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                          field.onChange(checked)
                                          if (!checked) {
                                            form.setValue(`fixedHours.${index}.hasPriceAddition`, false)
                                            form.setValue(`fixedHours.${index}.priceAddition`, undefined)
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            {isActive && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name={`fixedHours.${index}.startTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>{t("workingHours.startTime")}</FormLabel>
                                        <FormControl>
                                          <Input type="time" {...field} className="w-full" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`fixedHours.${index}.endTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>{t("workingHours.endTime")}</FormLabel>
                                        <FormControl>
                                          <Input type="time" {...field} className="w-full" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name={`fixedHours.${index}.hasPriceAddition`}
                                  render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={(checked) => {
                                            field.onChange(checked)
                                            if (checked && !form.getValues(`fixedHours.${index}.priceAddition`)) {
                                              form.setValue(`fixedHours.${index}.priceAddition`, defaultPriceAddition)
                                            } else if (!checked) {
                                              form.setValue(`fixedHours.${index}.priceAddition`, undefined)
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">
                                        {t("workingHours.enablePriceAddition")}
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                                {hasPriceAddition && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name={`fixedHours.${index}.priceAddition.amount`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("workingHours.amount")}</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              placeholder="0"
                                              {...field}
                                              onChange={(e) =>
                                                field.onChange(
                                                  e.target.value === "" ? undefined : Number.parseFloat(e.target.value),
                                                )
                                              }
                                              className="w-full"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`fixedHours.${index}.priceAddition.type`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("workingHours.type")}</FormLabel>
                                          <Select onValueChange={field.onChange} value={field.value || "fixed"}>
                                            <FormControl>
                                              <SelectTrigger className="w-full">
                                                <SelectValue />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="fixed">
                                                {t("workingHours.priceAdditionTypes.fixed")}
                                              </SelectItem>
                                              <SelectItem value="percentage">
                                                {t("workingHours.priceAdditionTypes.percentage")}
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                )}
                                <FormField
                                  control={form.control}
                                  name={`fixedHours.${index}.notes`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t("workingHours.notes")}</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          {...field}
                                          placeholder={t("workingHours.notesPlaceholder")}
                                          className="min-h-[60px] w-full"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="special-dates">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {t("workingHours.specialDates")}
                  </CardTitle>
                  <CardDescription>{t("workingHours.specialDatesDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOpenSpecialDateDialog(null)}
                  >
                    <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                    {t("workingHours.addSpecialDate")}
                  </Button>

                  {specialDateFields.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <CalendarIcon className="mx-auto h-12 w-12 opacity-50" />
                      <p className="mt-4 text-lg">{t("workingHours.noSpecialDates")}</p>
                      <p>{t("workingHours.noSpecialDatesHint")}</p>
                    </div>
                  )}

                  {specialDateFields.length > 0 && (
                    <>
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("workingHours.specialDateName")}</TableHead>
                              <TableHead>{t("workingHours.date")}</TableHead>
                              <TableHead className="text-center">{t("workingHours.active")}</TableHead>
                              <TableHead>{t("workingHours.hours")}</TableHead>
                              <TableHead>{t("workingHours.priceAddition")}</TableHead>
                              <TableHead>{t("workingHours.notes")}</TableHead>
                              <TableHead className="text-right rtl:text-left">{t("common.actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {specialDateFields.map((field, index) => {
                              const specialDate = watchedSpecialDates[index]
                              if (!specialDate) return null
                              return (
                                <TableRow key={field.fieldId}>
                                  <TableCell className="font-medium">{specialDate.name}</TableCell>
                                  <TableCell>
                                    {format(parse(specialDate.date, "yyyy-MM-dd", new Date()), "PPP", {
                                      locale: dateLocale,
                                    })}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {specialDate.isActive ? (
                                      <Badge>{t("common.yes")}</Badge>
                                    ) : (
                                      <Badge variant="secondary">{t("common.no")}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {specialDate.isActive ? `${specialDate.startTime} - ${specialDate.endTime}` : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {specialDate.isActive && specialDate.hasPriceAddition && specialDate.priceAddition
                                      ? `${specialDate.priceAddition.amount}${specialDate.priceAddition.type === "percentage" ? t("workingHours.priceAdditionTypes.percentage") : t("workingHours.priceAdditionTypes.fixed")}`
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="max-w-[150px] truncate" title={specialDate.notes || ""}>
                                    {specialDate.notes || "-"}
                                  </TableCell>
                                  <TableCell className="text-right rtl:text-left">
                                    <div className="flex gap-2 justify-end rtl:justify-start">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleOpenSpecialDateDialog(index)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDeleteSpecialDate(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-4">
                        {specialDateFields.map((field, index) => {
                          const specialDate = watchedSpecialDates[index]
                          if (!specialDate) return null
                          return (
                            <Card key={field.fieldId} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-lg truncate">{specialDate.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {format(parse(specialDate.date, "yyyy-MM-dd", new Date()), "PPP", {
                                        locale: dateLocale,
                                      })}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 ml-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleOpenSpecialDateDialog(index)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => handleDeleteSpecialDate(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant={specialDate.isActive ? "default" : "secondary"}>
                                    {specialDate.isActive ? t("common.active") : t("common.inactive")}
                                  </Badge>
                                  {specialDate.isActive && (
                                    <Badge variant="outline">{`${specialDate.startTime} - ${specialDate.endTime}`}</Badge>
                                  )}
                                  {specialDate.isActive &&
                                    specialDate.hasPriceAddition &&
                                    specialDate.priceAddition && (
                                      <Badge variant="outline">{`+${specialDate.priceAddition.amount}${specialDate.priceAddition.type === "percentage" ? t("workingHours.priceAdditionTypes.percentage") : t("workingHours.priceAdditionTypes.fixed")}`}</Badge>
                                    )}
                                </div>
                                {specialDate.notes && (
                                  <p className="text-sm text-muted-foreground break-words">{specialDate.notes}</p>
                                )}
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={isSpecialDateDialogOpen} onOpenChange={setIsSpecialDateDialogOpen}>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSpecialDateIndex !== null
                    ? t("workingHours.editSpecialDate")
                    : t("workingHours.addSpecialDate")}
                </DialogTitle>
                <DialogDescription>{t("workingHours.specialDateDialogDescription")}</DialogDescription>
              </DialogHeader>
              <Form {...specialDateForm}>
                <form
                  onSubmit={specialDateForm.handleSubmit(handleSpecialDateFormSubmit, (errors) =>
                    console.log("Special Date Form Errors:", errors),
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={specialDateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("workingHours.specialDateName")}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t("workingHours.specialDateNamePlaceholder")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={specialDateForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t("workingHours.date")}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                <CalendarIcon className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP", { locale: dateLocale })
                                ) : (
                                  <span>{t("workingHours.selectDate")}</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={specialDateForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 rtl:space-x-reverse space-y-0 rounded-md border p-4 shadow">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked)
                              if (!checked) {
                                specialDateForm.setValue("hasPriceAddition", false)
                                specialDateForm.setValue("priceAddition", undefined)
                              }
                            }}
                            id="specialDateIsActive"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel htmlFor="specialDateIsActive">{t("workingHours.active")}</FormLabel>
                          <FormDescription>{t("workingHours.specialDateActiveDescription")}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  {specialDateForm.watch("isActive") && (
                    <div className="space-y-4 p-4 border rounded-md">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={specialDateForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("workingHours.startTime")}</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={specialDateForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("workingHours.endTime")}</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={specialDateForm.control}
                        name="hasPriceAddition"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 rtl:space-x-reverse space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked)
                                  if (checked && !specialDateForm.getValues("priceAddition")) {
                                    specialDateForm.setValue("priceAddition", defaultPriceAddition)
                                  } else if (!checked) {
                                    specialDateForm.setValue("priceAddition", undefined)
                                  }
                                }}
                                id="specialDateHasPriceAddition"
                              />
                            </FormControl>
                            <FormLabel htmlFor="specialDateHasPriceAddition">
                              {t("workingHours.enablePriceAddition")}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      {specialDateForm.watch("hasPriceAddition") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={specialDateForm.control}
                            name="priceAddition.amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("workingHours.amount")}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === "" ? undefined : Number.parseFloat(e.target.value),
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={specialDateForm.control}
                            name="priceAddition.type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("workingHours.type")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || "fixed"}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="fixed">{t("workingHours.priceAdditionTypes.fixed")}</SelectItem>
                                    <SelectItem value="percentage">
                                      {t("workingHours.priceAdditionTypes.percentage")}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      <FormField
                        control={specialDateForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("workingHours.notes")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("workingHours.notesPlaceholder")}
                                className="min-h-[80px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setIsSpecialDateDialogOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={specialDateForm.formState.isSubmitting}>
                      {specialDateForm.formState.isSubmitting
                        ? t("common.saving")
                        : editingSpecialDateIndex !== null
                          ? t("common.update")
                          : t("common.add")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={updateMutation.isPending || !form.formState.isDirty}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {updateMutation.isPending ? t("common.saving") : t("common.saveChanges")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
