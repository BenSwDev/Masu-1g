"use client"

import React from "react"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { he, enUS } from "date-fns/locale"
import { Calendar, Clock, Plus, Trash2, Edit } from "lucide-react"

import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Textarea } from "@/components/common/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/ui/dialog"
import { Calendar as CalendarComponent } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { useToast } from "@/components/common/ui/use-toast"
import { useTranslation } from "@/lib/translations/i18n"

import { getWorkingHoursSettings, updateWorkingHoursSettings } from "@/actions/working-hours-actions"

const priceAdditionSchema = z.object({
  amount: z.number().min(0),
  type: z.enum(["fixed", "percentage"]),
})

const fixedHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  isActive: z.boolean(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  hasPriceAddition: z.boolean(),
  priceAddition: priceAdditionSchema.optional(),
  notes: z.string().max(500).optional(),
})

const specialDateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  isActive: z.boolean(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  hasPriceAddition: z.boolean(),
  priceAddition: priceAdditionSchema.optional(),
  notes: z.string().max(500).optional(),
})

const workingHoursSchema = z.object({
  fixedHours: z.array(fixedHoursSchema),
  specialDates: z.array(specialDateSchema),
})

const specialDateFormSchema = z.object({
  date: z.date({
    required_error: "Please select a date",
  }),
  isActive: z.boolean().default(true),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
    .default("09:00"),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
    .default("17:00"),
  hasPriceAddition: z.boolean().default(false),
  priceAddition: priceAdditionSchema.optional(),
  notes: z.string().max(500).optional().default(""),
})

type WorkingHoursFormData = z.infer<typeof workingHoursSchema>
type SpecialDateFormData = z.infer<typeof specialDateFormSchema>

export default function WorkingHoursClient() {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isSpecialDateDialogOpen, setIsSpecialDateDialogOpen] = useState(false)
  const [editingSpecialDateIndex, setEditingSpecialDateIndex] = useState<number | null>(null)

  const { data: workingHoursData, isLoading } = useQuery({
    queryKey: ["working-hours-settings"],
    queryFn: async () => {
      const result = await getWorkingHoursSettings()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  })

  const form = useForm<WorkingHoursFormData>({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: {
      fixedHours: [],
      specialDates: [],
    },
  })

  const specialDateForm = useForm<SpecialDateFormData>({
    resolver: zodResolver(specialDateFormSchema),
    defaultValues: {
      isActive: true,
      startTime: "09:00",
      endTime: "17:00",
      hasPriceAddition: false,
      notes: "",
    },
  })

  const {
    fields: specialDateFields,
    append: appendSpecialDate,
    remove: removeSpecialDate,
    update: updateSpecialDate,
  } = useFieldArray({
    control: form.control,
    name: "specialDates",
  })

  // Update form when data is loaded
  React.useEffect(() => {
    if (workingHoursData) {
      form.reset({
        fixedHours: workingHoursData.fixedHours || [],
        specialDates: workingHoursData.specialDates || [],
      })
    }
  }, [workingHoursData, form])

  const updateMutation = useMutation({
    mutationFn: updateWorkingHoursSettings,
    onSuccess: () => {
      toast({
        title: t("workingHours.updateSuccess"),
        description: t("workingHours.updateSuccessDescription"),
      })
      queryClient.invalidateQueries({ queryKey: ["working-hours-settings"] })
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
    updateMutation.mutate(data)
  }

  const handleAddSpecialDate = (data: SpecialDateFormData) => {
    const specialDateData = {
      ...data,
      date: format(data.date, "yyyy-MM-dd"),
      priceAddition: data.hasPriceAddition ? data.priceAddition : undefined,
    }

    if (editingSpecialDateIndex !== null) {
      updateSpecialDate(editingSpecialDateIndex, specialDateData)
      setEditingSpecialDateIndex(null)
    } else {
      appendSpecialDate(specialDateData)
    }

    specialDateForm.reset()
    setIsSpecialDateDialogOpen(false)
  }

  const handleEditSpecialDate = (index: number) => {
    const specialDate = form.getValues(`specialDates.${index}`)
    specialDateForm.reset({
      ...specialDate,
      date: new Date(specialDate.date),
    })
    setEditingSpecialDateIndex(index)
    setIsSpecialDateDialogOpen(true)
  }

  const handleDeleteSpecialDate = (index: number) => {
    removeSpecialDate(index)
  }

  const dayNames = [
    t("workingHours.days.sunday"),
    t("workingHours.days.monday"),
    t("workingHours.days.tuesday"),
    t("workingHours.days.wednesday"),
    t("workingHours.days.thursday"),
    t("workingHours.days.friday"),
    t("workingHours.days.saturday"),
  ]

  if (isLoading) {
    return <div className="flex justify-center p-8">{t("common.loading")}</div>
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Fixed Hours Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("workingHours.fixedHours")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("workingHours.day")}</TableHead>
                    <TableHead>{t("workingHours.active")}</TableHead>
                    <TableHead>{t("workingHours.startTime")}</TableHead>
                    <TableHead>{t("workingHours.endTime")}</TableHead>
                    <TableHead>{t("workingHours.priceAddition")}</TableHead>
                    <TableHead>{t("workingHours.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.watch("fixedHours")?.map((_, index) => {
                    const dayOfWeek = form.watch(`fixedHours.${index}.dayOfWeek`)
                    const isActive = form.watch(`fixedHours.${index}.isActive`)
                    const hasPriceAddition = form.watch(`fixedHours.${index}.hasPriceAddition`)

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{dayNames[dayOfWeek]}</TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`fixedHours.${index}.isActive`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
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
                                    <Input type="time" {...field} className="w-32" />
                                  </FormControl>
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
                                    <Input type="time" {...field} className="w-32" />
                                  </FormControl>
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
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
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
                                            onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                                            className="w-20"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`fixedHours.${index}.priceAddition.type`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger className="w-20">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="fixed">₪</SelectItem>
                                            <SelectItem value="percentage">%</SelectItem>
                                          </SelectContent>
                                        </Select>
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
                                      className="min-h-[60px] w-40"
                                    />
                                  </FormControl>
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
            </CardContent>
          </Card>

          {/* Special Dates Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("workingHours.specialDates")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Dialog open={isSpecialDateDialogOpen} onOpenChange={setIsSpecialDateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("workingHours.addSpecialDate")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingSpecialDateIndex !== null
                          ? t("workingHours.editSpecialDate")
                          : t("workingHours.addSpecialDate")}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...specialDateForm}>
                      <form onSubmit={specialDateForm.handleSubmit(handleAddSpecialDate)} className="space-y-4">
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
                                      className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP", { locale: language === "he" ? he : enUS })
                                      ) : (
                                        <span>{t("workingHours.selectDate")}</span>
                                      )}
                                      <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date()}
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
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>{t("workingHours.active")}</FormLabel>
                            </FormItem>
                          )}
                        />

                        {specialDateForm.watch("isActive") && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
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
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                  <FormLabel>{t("workingHours.priceAddition")}</FormLabel>
                                </FormItem>
                              )}
                            />

                            {specialDateForm.watch("hasPriceAddition") && (
                              <div className="grid grid-cols-2 gap-4">
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
                          </>
                        )}

                        <div className="flex justify-end gap-2">
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
                          <Button type="submit">
                            {editingSpecialDateIndex !== null ? t("common.update") : t("common.add")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                {specialDateFields.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("workingHours.date")}</TableHead>
                        <TableHead>{t("workingHours.active")}</TableHead>
                        <TableHead>{t("workingHours.hours")}</TableHead>
                        <TableHead>{t("workingHours.priceAddition")}</TableHead>
                        <TableHead>{t("workingHours.notes")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specialDateFields.map((field, index) => {
                        const specialDate = form.watch(`specialDates.${index}`)
                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              {format(new Date(specialDate.date), "PPP", { locale: language === "he" ? he : enUS })}
                            </TableCell>
                            <TableCell>{specialDate.isActive ? t("common.yes") : t("common.no")}</TableCell>
                            <TableCell>
                              {specialDate.isActive ? `${specialDate.startTime} - ${specialDate.endTime}` : "-"}
                            </TableCell>
                            <TableCell>
                              {specialDate.hasPriceAddition && specialDate.priceAddition
                                ? `${specialDate.priceAddition.amount}${specialDate.priceAddition.type === "percentage" ? "%" : "₪"}`
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{specialDate.notes || "-"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSpecialDate(index)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
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
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} className="min-w-[120px]">
              {updateMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
