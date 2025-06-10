"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { CalendarIcon, Clock, Plus, Trash2, Edit, AlertTriangle } from "lucide-react"

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
  DialogTrigger,
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

import {
  getWorkingHoursSettings,
  updateFixedHours,
  updateSpecialDates,
  updateSpecialDateEvents,
  deleteSpecialDate,
  deleteSpecialDateEvent,
} from "@/actions/working-hours-actions"
import type { IWorkingHoursSettings, IFixedHours, ISpecialDateEvent } from "@/lib/db/models/working-hours"
import { ISpecialDate } from "@/lib/db/models/working-hours"

const priceAdditionSchema = z
  .object({
    amount: z.number().min(0, "Amount must be positive"),
    type: z.enum(["fixed", "percentage"]),
  })
  .optional()

const fixedHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  isActive: z.boolean(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format HH:MM"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format HH:MM"),
  hasPriceAddition: z.boolean(),
  priceAddition: priceAdditionSchema,
  notes: z.string().max(500, "Notes too long").optional(),
  minimumBookingAdvanceHours: z.number().min(0).max(168).optional(),
  cutoffTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format HH:MM").optional().nullable(),
  professionalSharePercentage: z.number().min(0).max(100).optional(),
})

const fixedHoursFormSchema = z.object({
  fixedHours: z.array(fixedHoursSchema),
})

const specialDateFormSchema = z.object({
  name: z.string().min(1, "Please enter a name").max(100, "Name is too long (max 100 chars)").default(""),
  date: z.date({
    required_error: "Please select a date",
  }),
  isActive: z.boolean().default(true),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM")
    .default("09:00"),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM")
    .default("17:00"),
  hasPriceAddition: z.boolean().default(false),
  priceAddition: priceAdditionSchema,
  notes: z.string().max(500, "Notes are too long (max 500 chars)").optional().default(""),
})

const specialDateEventFormSchema = z.object({
  name: z.string().min(1, "Please enter event name").max(100, "Name is too long (max 100 chars)"),
  description: z.string().max(500, "Description is too long (max 500 chars)").optional(),
  eventType: z.enum(["holiday", "special", "closure", "other"]).default("special"),
  color: z.string().default("#3B82F6"),
  dates: z.array(z.date()).min(1, "At least one date is required"),
  isActive: z.boolean().default(true),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM")
    .default("09:00"),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM")
    .default("17:00"),
  hasPriceAddition: z.boolean().default(false),
  priceAddition: priceAdditionSchema,
  notes: z.string().max(500, "Notes are too long (max 500 chars)").optional().default(""),
  minimumBookingAdvanceHours: z.number().min(0).max(168).optional(),
  cutoffTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format HH:MM").optional().nullable(),
  professionalSharePercentage: z.number().min(0).max(100).optional(),
})

type FixedHoursFormData = z.infer<typeof fixedHoursFormSchema>
type SpecialDateFormData = z.infer<typeof specialDateFormSchema>
type SpecialDateEventFormData = z.infer<typeof specialDateEventFormSchema>

const getDefaultFixedHours = (): IFixedHours[] => {
  const days = []
  for (let i = 0; i < 7; i++) {
    days.push({
      dayOfWeek: i,
      isActive: false,
      startTime: "09:00",
      endTime: "17:00",
      hasPriceAddition: false,
      priceAddition: { amount: 0, type: "fixed" as const },
      notes: "",
      minimumBookingAdvanceHours: 2,
      cutoffTime: undefined,
      professionalSharePercentage: 70,
    })
  }
  return days
}

export default function WorkingHoursClient() {
  const { t, language, dir } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isSpecialDateDialogOpen, setIsSpecialDateDialogOpen] = useState(false)
  const [editingSpecialDateIndex, setEditingSpecialDateIndex] = useState<number | null>(null)
  const [isSpecialEventDialogOpen, setIsSpecialEventDialogOpen] = useState(false)
  const [editingSpecialEventIndex, setEditingSpecialEventIndex] = useState<number | null>(null)

  const { data: workingHoursData, isLoading } = useQuery({
    queryKey: ["workingHours"],
    queryFn: async () => {
      const result = await getWorkingHoursSettings()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data as IWorkingHoursSettings
    },
  })

  const fixedHoursForm = useForm<FixedHoursFormData>({
    resolver: zodResolver(fixedHoursFormSchema),
    defaultValues: {
      fixedHours: getDefaultFixedHours(),
    },
  })

  const specialDateForm = useForm<SpecialDateFormData>({
    resolver: zodResolver(specialDateFormSchema) as Resolver<SpecialDateFormData>,
    defaultValues: {
      name: "",
      date: new Date(),
      isActive: true,
      startTime: "09:00",
      endTime: "17:00",
      hasPriceAddition: false,
      notes: "",
      priceAddition: { amount: 0, type: "fixed" },
    },
  })

  const specialEventForm = useForm<SpecialDateEventFormData>({
    resolver: zodResolver(specialDateEventFormSchema) as Resolver<SpecialDateEventFormData>,
    defaultValues: {
      name: "",
      description: "",
      eventType: "special",
      color: "#3B82F6",
      dates: [new Date()],
      isActive: true,
      startTime: "09:00",
      endTime: "17:00",
      hasPriceAddition: false,
      notes: "",
      minimumBookingAdvanceHours: 2,
      cutoffTime: undefined,
      professionalSharePercentage: 70,
      priceAddition: { amount: 0, type: "fixed" },
    },
  })

  useEffect(() => {
    if (workingHoursData?.fixedHours) {
      fixedHoursForm.reset({ fixedHours: workingHoursData.fixedHours })
    }
  }, [workingHoursData, fixedHoursForm])

  const updateFixedHoursMutation = useMutation({
    mutationFn: updateFixedHours,
    onSuccess: () => {
      toast({
        title: t("workingHours.fixedHoursUpdated"),
        variant: "default",
      })
    },
    onError: (error) => {
      console.error("Error updating fixed hours:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    },
  })

  const addSpecialDateMutation = useMutation({
    mutationFn: updateSpecialDates,
    onSuccess: () => {
      toast({
        title: t("workingHours.specialDateAdded"),
        variant: "default",
      })
      setIsSpecialDateDialogOpen(false)
      specialDateForm.reset()
    },
    onError: (error) => {
      console.error("Error adding special date:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    },
  })

  const updateSpecialDateMutation = useMutation({
    mutationFn: updateSpecialDates,
    onSuccess: () => {
      toast({
        title: t("workingHours.specialDateUpdated"),
        variant: "default",
      })
      setIsSpecialDateDialogOpen(false)
      setEditingSpecialDateIndex(null)
      specialDateForm.reset()
    },
    onError: (error) => {
      console.error("Error updating special date:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    },
  })

  const deleteSpecialDateMutation = useMutation({
    mutationFn: deleteSpecialDate,
    onSuccess: () => {
      toast({
        title: t("workingHours.specialDateDeleted"),
        variant: "default",
      })
    },
    onError: (error) => {
      console.error("Error deleting special date:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    },
  })

  const updateSpecialDateEventsMutation = useMutation({
    mutationFn: updateSpecialDateEvents,
    onSuccess: () => {
      toast({
        title: t("workingHours.specialEventUpdated"),
        variant: "default",
      })
      setIsSpecialEventDialogOpen(false)
      setEditingSpecialEventIndex(null)
      specialEventForm.reset()
    },
    onError: (error) => {
      console.error("Error updating special event:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    },
  })

  const deleteSpecialDateEventMutation = useMutation({
    mutationFn: deleteSpecialDateEvent,
    onSuccess: () => {
      toast({
        title: t("workingHours.specialEventDeleted"),
        variant: "default",
      })
    },
    onError: (error) => {
      console.error("Error deleting special event:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    },
  })

  const handleFixedHoursSubmit = async (data: FixedHoursFormData) => {
    try {
      await updateFixedHoursMutation.mutateAsync(data.fixedHours)
    } catch (error) {
      console.error("Error updating fixed hours:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    }
  }

  const handleAddOrUpdateSpecialDate = async (data: SpecialDateFormData) => {
    try {
      const currentDates = workingHoursData?.specialDates || []
      let updatedDates: ISpecialDate[]

      if (editingSpecialDateIndex !== null) {
        // עדכון תאריך מיוחד קיים
        updatedDates = [...currentDates]
        updatedDates[editingSpecialDateIndex] = {
          ...data,
          date: new Date(data.date),
        }
        await updateSpecialDateMutation.mutateAsync(updatedDates)
      } else {
        // הוספת תאריך מיוחד חדש
        updatedDates = [
          ...currentDates,
          {
            ...data,
            date: new Date(data.date),
          },
        ]
        await addSpecialDateMutation.mutateAsync(updatedDates)
      }
    } catch (error) {
      console.error("Error updating special date:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    }
  }

  const handleEditSpecialDate = (index: number) => {
    const date = workingHoursData?.specialDates?.[index]
    if (!date) return

    specialDateForm.reset({
      ...date,
      date: new Date(date.date),
    })
    setEditingSpecialDateIndex(index)
    setIsSpecialDateDialogOpen(true)
  }

  const handleDeleteSpecialDate = async (index: number) => {
    try {
      await deleteSpecialDateMutation.mutateAsync(index)
    } catch (error) {
      console.error("Error deleting special date:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    }
  }

  const handleDayActiveChange = (index: number, isActive: boolean) => {
    const currentFixedHours = fixedHoursForm.getValues("fixedHours")
    const updatedFixedHours = [...currentFixedHours]
    updatedFixedHours[index] = {
      ...updatedFixedHours[index],
      isActive,
    }
    fixedHoursForm.setValue("fixedHours", updatedFixedHours)
  }

  const dayNames = React.useMemo(
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

  const handleAddOrUpdateSpecialEvent = async (data: SpecialDateEventFormData) => {
    try {
      const currentEvents = workingHoursData?.specialDateEvents || []
      let updatedEvents: ISpecialDateEvent[]

      if (editingSpecialEventIndex !== null) {
        // עדכון אירוע קיים
        updatedEvents = [...currentEvents]
        updatedEvents[editingSpecialEventIndex] = {
          ...data,
          dates: data.dates.map(date => new Date(date)),
          cutoffTime: data.cutoffTime || undefined,
        } as ISpecialDateEvent
      } else {
        // הוספת אירוע חדש
        updatedEvents = [
          ...currentEvents,
          {
            ...data,
            dates: data.dates.map(date => new Date(date)),
            cutoffTime: data.cutoffTime || undefined,
          } as ISpecialDateEvent,
        ]
      }

      await updateSpecialDateEventsMutation.mutateAsync(updatedEvents)
    } catch (error) {
      console.error("Error updating special event:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    }
  }

  const handleEditSpecialEvent = (index: number) => {
    const event = workingHoursData?.specialDateEvents?.[index]
    if (!event) return

    specialEventForm.reset({
      ...event,
      dates: event.dates.map(date => new Date(date)),
      cutoffTime: event.cutoffTime || undefined,
    } as SpecialDateEventFormData)
    setEditingSpecialEventIndex(index)
    setIsSpecialEventDialogOpen(true)
  }

  const handleDeleteSpecialEvent = async (index: number) => {
    try {
      await deleteSpecialDateEventMutation.mutateAsync(index)
    } catch (error) {
      console.error("Error deleting special event:", error)
      toast({
        title: t("common.error"),
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!workingHoursData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-xl font-semibold">{t("common.error")}</p>
        <p>{t("common.errorDescription")}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-hidden p-4 space-y-6">
      <Tabs defaultValue="fixed-hours" className="w-full" dir={dir}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fixed-hours">{t("workingHours.fixedHoursTab")}</TabsTrigger>
          <TabsTrigger value="special-dates">{t("workingHours.specialDatesTab")}</TabsTrigger>
          <TabsTrigger value="special-events">{t("workingHours.specialEventsTab")}</TabsTrigger>
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
              <Form {...fixedHoursForm}>
                <form onSubmit={fixedHoursForm.handleSubmit(handleFixedHoursSubmit)} className="space-y-6">
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("workingHours.day")}</TableHead>
                          <TableHead className="text-center">{t("workingHours.active")}</TableHead>
                          <TableHead>{t("workingHours.startTime")}</TableHead>
                          <TableHead>{t("workingHours.endTime")}</TableHead>
                          <TableHead>{t("workingHours.advancedSettings")}</TableHead>
                          <TableHead>{t("workingHours.priceAddition")}</TableHead>
                          <TableHead>{t("workingHours.notes")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fixedHoursForm.watch("fixedHours")?.map((_, index) => {
                          const dayOfWeek = fixedHoursForm.watch(`fixedHours.${index}.dayOfWeek`)
                          const isActive = fixedHoursForm.watch(`fixedHours.${index}.isActive`)
                          const hasPriceAddition = fixedHoursForm.watch(`fixedHours.${index}.hasPriceAddition`)

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{dayNames[dayOfWeek]}</TableCell>
                              <TableCell className="text-center">
                                <FormField
                                  control={fixedHoursForm.control}
                                  name={`fixedHours.${index}.isActive`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={(checked) => handleDayActiveChange(index, !!checked)}
                                          aria-label={`${t("workingHours.active")} for ${dayNames[dayOfWeek]}`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                {isActive && (
                                  <FormField
                                    control={fixedHoursForm.control}
                                    name={`fixedHours.${index}.startTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            type="time"
                                            {...field}
                                            className="w-full max-w-[120px]"
                                            aria-label={`${t("workingHours.startTime")} for ${dayNames[dayOfWeek]}`}
                                          />
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
                                    control={fixedHoursForm.control}
                                    name={`fixedHours.${index}.endTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            type="time"
                                            {...field}
                                            className="w-full max-w-[120px]"
                                            aria-label={`${t("workingHours.endTime")} for ${dayNames[dayOfWeek]}`}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {isActive && (
                                  <div className="space-y-3 min-w-[200px]">
                                    <FormField
                                      control={fixedHoursForm.control}
                                      name={`fixedHours.${index}.minimumBookingAdvanceHours`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">{t("workingHours.minimumBookingAdvanceHours")}</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min="0"
                                              max="168"
                                              placeholder={t("workingHours.minimumBookingAdvanceHoursPlaceholder")}
                                              {...field}
                                              onChange={(e) =>
                                                field.onChange(Number.parseInt(e.target.value) || 2)
                                              }
                                              className="h-8"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={fixedHoursForm.control}
                                      name={`fixedHours.${index}.cutoffTime`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">{t("workingHours.cutoffTime")}</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="time"
                                              {...field}
                                              value={field.value || ""}
                                              placeholder={t("workingHours.cutoffTimePlaceholder")}
                                              className="h-8"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={fixedHoursForm.control}
                                      name={`fixedHours.${index}.professionalSharePercentage`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">{t("workingHours.professionalSharePercentage")}</FormLabel>
                                          <FormControl>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                placeholder={t("workingHours.professionalSharePercentagePlaceholder")}
                                                {...field}
                                                onChange={(e) =>
                                                  field.onChange(Number.parseInt(e.target.value) || 70)
                                                }
                                                className="h-8 w-16"
                                              />
                                              <span className="text-xs text-muted-foreground">%</span>
                                            </div>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                )}
                                {!isActive && <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                {isActive && (
                                  <div className="space-y-2">
                                    <FormField
                                      control={fixedHoursForm.control}
                                      name={`fixedHours.${index}.hasPriceAddition`}
                                      render={({ field }) => (
                                        <FormItem className="flex items-center gap-2">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                              aria-label={`${t("workingHours.priceAddition")} for ${dayNames[dayOfWeek]}`}
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
                                          control={fixedHoursForm.control}
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
                                                    field.onChange(Number.parseFloat(e.target.value) || 0)
                                                  }
                                                  className="w-20"
                                                  aria-label={`${t("workingHours.amount")} for ${dayNames[dayOfWeek]}`}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={fixedHoursForm.control}
                                          name={`fixedHours.${index}.priceAddition.type`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value || "fixed"}
                                              >
                                                <FormControl>
                                                  <SelectTrigger
                                                    className="w-[90px]"
                                                    aria-label={`${t("workingHours.type")} for ${dayNames[dayOfWeek]}`}
                                                  >
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                  <SelectItem value="fixed">₪</SelectItem>
                                                  <SelectItem value="percentage">%</SelectItem>
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
                                {!isActive && <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                {isActive && (
                                  <FormField
                                    control={fixedHoursForm.control}
                                    name={`fixedHours.${index}.notes`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Textarea
                                            {...field}
                                            placeholder={t("workingHours.notesPlaceholder")}
                                            className="min-h-[60px] w-full max-w-[200px]"
                                            aria-label={`${t("workingHours.notes")} for ${dayNames[dayOfWeek]}`}
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

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {fixedHoursForm.watch("fixedHours")?.map((_, index) => {
                      const dayOfWeek = fixedHoursForm.watch(`fixedHours.${index}.dayOfWeek`)
                      const isActive = fixedHoursForm.watch(`fixedHours.${index}.isActive`)
                      const hasPriceAddition = fixedHoursForm.watch(`fixedHours.${index}.hasPriceAddition`)

                      return (
                        <Card key={index} className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-lg">{dayNames[dayOfWeek]}</h3>
                              <FormField
                                control={fixedHoursForm.control}
                                name={`fixedHours.${index}.isActive`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => handleDayActiveChange(index, !!checked)}
                                        aria-label={`${t("workingHours.active")} for ${dayNames[dayOfWeek]}`}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            {isActive && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={fixedHoursForm.control}
                                    name={`fixedHours.${index}.startTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>{t("workingHours.startTime")}</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="time"
                                            {...field}
                                            className="w-full"
                                            aria-label={`${t("workingHours.startTime")} for ${dayNames[dayOfWeek]}`}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={fixedHoursForm.control}
                                    name={`fixedHours.${index}.endTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>{t("workingHours.endTime")}</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="time"
                                            {...field}
                                            className="w-full"
                                            aria-label={`${t("workingHours.endTime")} for ${dayNames[dayOfWeek]}`}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <FormField
                                  control={fixedHoursForm.control}
                                  name={`fixedHours.${index}.hasPriceAddition`}
                                  render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          aria-label={`${t("workingHours.priceAddition")} for ${dayNames[dayOfWeek]}`}
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
                                      control={fixedHoursForm.control}
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
                                              onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                                              className="w-full"
                                              aria-label={`${t("workingHours.amount")} for ${dayNames[dayOfWeek]}`}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={fixedHoursForm.control}
                                      name={`fixedHours.${index}.priceAddition.type`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("workingHours.type")}</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value || "fixed"}>
                                            <FormControl>
                                              <SelectTrigger
                                                className="w-full"
                                                aria-label={`${t("workingHours.type")} for ${dayNames[dayOfWeek]}`}
                                              >
                                                <SelectValue />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="fixed">₪</SelectItem>
                                              <SelectItem value="percentage">%</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                )}

                                <FormField
                                  control={fixedHoursForm.control}
                                  name={`fixedHours.${index}.notes`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t("workingHours.notes")}</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          {...field}
                                          placeholder={t("workingHours.notesPlaceholder")}
                                          className="min-h-[60px] w-full"
                                          aria-label={`${t("workingHours.notes")} for ${dayNames[dayOfWeek]}`}
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

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={updateFixedHoursMutation.isPending || !fixedHoursForm.formState.isDirty}
                      className="w-full sm:w-auto min-w-[120px]"
                    >
                      {updateFixedHoursMutation.isPending ? t("common.saving") : t("common.saveChanges")}
                    </Button>
                  </div>
                </form>
              </Form>
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
              <Dialog
                open={isSpecialDateDialogOpen}
                onOpenChange={(isOpen) => {
                  setIsSpecialDateDialogOpen(isOpen)
                  if (!isOpen) {
                    setEditingSpecialDateIndex(null)
                    specialDateForm.reset({
                      name: "",
                      date: new Date(),
                      isActive: true,
                      startTime: "09:00",
                      endTime: "17:00",
                      hasPriceAddition: false,
                      notes: "",
                      priceAddition: { amount: 0, type: "fixed" },
                    })
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full">
                    <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                    {t("workingHours.addSpecialDate")}
                  </Button>
                </DialogTrigger>
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
                    <form onSubmit={specialDateForm.handleSubmit(handleAddOrUpdateSpecialDate)} className="space-y-4">
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
                                      format(field.value, "PPP", { locale: language === "he" ? he : enUS })
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
                                onCheckedChange={field.onChange}
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
                                    onCheckedChange={field.onChange}
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
                                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value || "fixed"}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="fixed">₪</SelectItem>
                                        <SelectItem value="percentage">%</SelectItem>
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsSpecialDateDialogOpen(false)
                            setEditingSpecialDateIndex(null)
                            specialDateForm.reset()
                          }}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            specialDateForm.formState.isSubmitting ||
                            addSpecialDateMutation.isPending ||
                            updateSpecialDateMutation.isPending
                          }
                        >
                          {specialDateForm.formState.isSubmitting ||
                          addSpecialDateMutation.isPending ||
                          updateSpecialDateMutation.isPending
                            ? t("common.saving")
                            : editingSpecialDateIndex !== null
                              ? t("common.update")
                              : t("common.create")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {(!workingHoursData?.specialDates || workingHoursData.specialDates.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <CalendarIcon className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-4 text-lg">{t("workingHours.noSpecialDates")}</p>
                  <p>{t("workingHours.noSpecialDatesHint")}</p>
                </div>
              )}

              {workingHoursData?.specialDates && workingHoursData.specialDates.length > 0 && (
                <>
                  {/* Desktop Table */}
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
                        {workingHoursData.specialDates.map((specialDate, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{specialDate.name}</TableCell>
                            <TableCell>
                              {format(new Date(specialDate.date), "PPP", {
                                locale: language === "he" ? he : enUS,
                              })}
                            </TableCell>
                            <TableCell className="text-center">
                              {specialDate.isActive ? t("common.yes") : t("common.no")}
                            </TableCell>
                            <TableCell>
                              {specialDate.isActive ? `${specialDate.startTime} - ${specialDate.endTime}` : "-"}
                            </TableCell>
                            <TableCell>
                              {specialDate.isActive && specialDate.hasPriceAddition && specialDate.priceAddition
                                ? `${specialDate.priceAddition.amount}${specialDate.priceAddition.type === "percentage" ? "%" : "₪"}`
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate" title={specialDate.notes}>
                              {specialDate.notes || "-"}
                            </TableCell>
                            <TableCell className="text-right rtl:text-left">
                              <div className="flex gap-2 justify-end rtl:justify-start">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditSpecialDate(index)}
                                  aria-label={t("workingHours.editSpecialDate")}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDeleteSpecialDate(index)}
                                  aria-label={t("common.delete")}
                                  disabled={deleteSpecialDateMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {workingHoursData.specialDates.map((specialDate, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-lg truncate">{specialDate.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(specialDate.date), "PPP", {
                                  locale: language === "he" ? he : enUS,
                                })}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditSpecialDate(index)}
                                aria-label={t("workingHours.editSpecialDate")}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteSpecialDate(index)}
                                aria-label={t("common.delete")}
                                disabled={deleteSpecialDateMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant={specialDate.isActive ? "default" : "secondary"}>
                              {specialDate.isActive ? t("common.yes") : t("common.no")}
                            </Badge>
                            {specialDate.isActive && (
                              <Badge variant="outline">{`${specialDate.startTime} - ${specialDate.endTime}`}</Badge>
                            )}
                            {specialDate.isActive && specialDate.hasPriceAddition && specialDate.priceAddition && (
                              <Badge variant="outline">
                                {`+${specialDate.priceAddition.amount}${specialDate.priceAddition.type === "percentage" ? "%" : "₪"}`}
                              </Badge>
                            )}
                          </div>

                          {specialDate.notes && (
                            <p className="text-sm text-muted-foreground break-words">{specialDate.notes}</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="special-events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {t("workingHours.specialEvents")}
              </CardTitle>
              <CardDescription>{t("workingHours.specialEventsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Dialog open={isSpecialEventDialogOpen} onOpenChange={setIsSpecialEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                    {t("workingHours.addSpecialEvent")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSpecialEventIndex !== null
                        ? t("workingHours.editSpecialEvent")
                        : t("workingHours.addSpecialEvent")}
                    </DialogTitle>
                    <DialogDescription>{t("workingHours.specialDateDialogDescription")}</DialogDescription>
                  </DialogHeader>

                  <Form {...specialEventForm}>
                    <form
                      onSubmit={specialEventForm.handleSubmit(handleAddOrUpdateSpecialEvent)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={specialEventForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("workingHours.eventName")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder={t("workingHours.eventNamePlaceholder")} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={specialEventForm.control}
                          name="eventType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("workingHours.eventType")}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="holiday">{t("workingHours.eventTypes.holiday")}</SelectItem>
                                  <SelectItem value="special">{t("workingHours.eventTypes.special")}</SelectItem>
                                  <SelectItem value="closure">{t("workingHours.eventTypes.closure")}</SelectItem>
                                  <SelectItem value="other">{t("workingHours.eventTypes.other")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={specialEventForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("workingHours.eventDescription")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t("workingHours.eventDescriptionPlaceholder")}
                                className="min-h-[60px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={specialEventForm.control}
                        name="dates"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>{t("workingHours.eventDates")}</FormLabel>
                            <FormDescription>{t("workingHours.eventDatesDescription")}</FormDescription>
                            <div className="space-y-2">
                              {field.value.map((date, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Input
                                    type="date"
                                    value={format(date, "yyyy-MM-dd")}
                                    onChange={(e) => {
                                      const newDate = new Date(e.target.value)
                                      const updatedDates = [...field.value]
                                      updatedDates[index] = newDate
                                      field.onChange(updatedDates)
                                    }}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const updatedDates = field.value.filter((_, i) => i !== index)
                                      field.onChange(updatedDates)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const tomorrow = new Date()
                                  tomorrow.setDate(tomorrow.getDate() + 1)
                                  field.onChange([...field.value, tomorrow])
                                }}
                                className="w-full"
                              >
                                <Plus className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                                {t("workingHours.addDate")}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center space-x-2">
                        <FormField
                          control={specialEventForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {t("workingHours.active")}
                              </FormLabel>
                              <FormDescription className="text-xs">
                                {t("workingHours.specialDateActiveDescription")}
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>

                      {specialEventForm.watch("isActive") && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                          <h4 className="font-medium">{t("workingHours.advancedSettings")}</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={specialEventForm.control}
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
                              control={specialEventForm.control}
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

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={specialEventForm.control}
                              name="minimumBookingAdvanceHours"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("workingHours.minimumBookingAdvanceHours")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="168"
                                      {...field}
                                      onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 2)}
                                      placeholder={t("workingHours.minimumBookingAdvanceHoursPlaceholder")}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    {t("workingHours.minimumBookingAdvanceHoursDescription")}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={specialEventForm.control}
                              name="cutoffTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("workingHours.cutoffTime")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="time"
                                      {...field}
                                      value={field.value || ""}
                                      placeholder={t("workingHours.cutoffTimePlaceholder")}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    {t("workingHours.cutoffTimeDescription")}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={specialEventForm.control}
                              name="professionalSharePercentage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("workingHours.professionalSharePercentage")}</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        {...field}
                                        onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 70)}
                                        placeholder={t("workingHours.professionalSharePercentagePlaceholder")}
                                        className="flex-1"
                                      />
                                      <span className="text-sm text-muted-foreground">%</span>
                                    </div>
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    {t("workingHours.professionalSharePercentageDescription")}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={specialEventForm.control}
                            name="hasPriceAddition"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {t("workingHours.enablePriceAddition")}
                                </FormLabel>
                              </FormItem>
                            )}
                          />

                          {specialEventForm.watch("hasPriceAddition") && (
                            <div className="flex gap-2">
                              <FormField
                                control={specialEventForm.control}
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
                                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={specialEventForm.control}
                                name="priceAddition.type"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t("workingHours.type")}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || "fixed"}>
                                      <FormControl>
                                        <SelectTrigger className="w-24">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="fixed">₪</SelectItem>
                                        <SelectItem value="percentage">%</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          <FormField
                            control={specialEventForm.control}
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsSpecialEventDialogOpen(false)
                            setEditingSpecialEventIndex(null)
                            specialEventForm.reset()
                          }}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={specialEventForm.formState.isSubmitting}>
                          {specialEventForm.formState.isSubmitting
                            ? t("common.saving")
                            : editingSpecialEventIndex !== null
                              ? t("common.update")
                              : t("common.create")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {(!workingHoursData?.specialDateEvents || workingHoursData.specialDateEvents.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <CalendarIcon className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-4 text-lg">{t("workingHours.noSpecialEvents")}</p>
                  <p>{t("workingHours.noSpecialEventsHint")}</p>
                </div>
              )}

              {workingHoursData?.specialDateEvents && workingHoursData.specialDateEvents.length > 0 && (
                <div className="space-y-4">
                  {workingHoursData.specialDateEvents.map((event, index) => (
                    <Card key={index} className="p-4" style={{ borderLeft: `4px solid ${event.color}` }}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-lg truncate">{event.name}</h3>
                              <Badge variant="outline">{t(`workingHours.eventTypes.${event.eventType}`)}</Badge>
                              <Badge variant={event.isActive ? "default" : "secondary"}>
                                {event.isActive ? t("workingHours.active") : t("common.inactive")}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {event.dates.slice(0, 3).map((date, dateIndex) => (
                                <Badge key={dateIndex} variant="outline" className="text-xs">
                                  {format(new Date(date), "dd/MM", { locale: language === "he" ? he : enUS })}
                                </Badge>
                              ))}
                              {event.dates.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{event.dates.length - 3} {t("common.more")}
                                </Badge>
                              )}
                              {event.dates.length > 1 ? (
                                <span className="text-xs text-muted-foreground">
                                  ({t("workingHours.eventMultiDayInfo")})
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  ({t("workingHours.eventSingleDayInfo")})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditSpecialEvent(index)}
                              aria-label={t("workingHours.editSpecialEvent")}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteSpecialEvent(index)}
                              aria-label={t("common.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {event.isActive && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">{t("workingHours.hours")}: </span>
                              <span>{event.startTime} - {event.endTime}</span>
                            </div>
                            <div>
                              <span className="font-medium">{t("workingHours.minimumBookingAdvanceHours")}: </span>
                              <span>{event.minimumBookingAdvanceHours || 2}h</span>
                            </div>
                            {event.cutoffTime && (
                              <div>
                                <span className="font-medium">{t("workingHours.cutoffTime")}: </span>
                                <span>{event.cutoffTime}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium">{t("workingHours.professionalSharePercentage")}: </span>
                              <span>{event.professionalSharePercentage || 70}%</span>
                            </div>
                          </div>
                        )}

                        {event.hasPriceAddition && event.priceAddition && event.priceAddition.amount > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              +{event.priceAddition.amount}{event.priceAddition.type === "percentage" ? "%" : "₪"} {t("workingHours.priceAddition")}
                            </Badge>
                          </div>
                        )}

                        {event.notes && (
                          <p className="text-sm text-muted-foreground break-words border-t pt-2">{event.notes}</p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
