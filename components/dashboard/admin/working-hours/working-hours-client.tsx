"use client"

import { DialogDescription } from "@/components/common/ui/dialog"
import { DialogTitle } from "@/components/common/ui/dialog"
import { DialogHeader } from "@/components/common/ui/dialog"
import { DialogContent } from "@/components/common/ui/dialog"
import { Dialog } from "@/components/common/ui/dialog"

import { Button } from "@/components/common/ui/button"
import { Card } from "@/components/common/ui/card"
import { Checkbox } from "@/components/common/ui/checkbox"
import type { ColumnDef } from "@tanstack/react-table"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Textarea } from "@/components/common/ui/textarea"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/components/common/ui/use-toast"
import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/common/ui/data-table"
import { formatDate } from "@/lib/utils/utils" // Corrected path for formatDate
import React from "react"
import { useMobile } from "@/components/common/ui/use-mobile"

const dayMapping = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

const fixedHoursSchema = z.object({
  isActive: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  hasPriceOverride: z.boolean().default(false),
  priceOverrideType: z.enum(["amount", "percentage"]).optional(),
  priceOverrideAmount: z.number().optional(),
  priceOverridePercentage: z.number().optional(),
  notes: z.string().optional(),
})

const specialDateSchema = z.object({
  id: z.string().optional(),
  date: z.date(),
  isActive: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  hasPriceOverride: z.boolean().default(false),
  priceOverrideType: z.enum(["amount", "percentage"]).optional(),
  priceOverrideAmount: z.number().optional(),
  priceOverridePercentage: z.number().optional(),
})

type FixedHoursSchemaType = z.infer<typeof fixedHoursSchema>
type SpecialDateSchemaType = z.infer<typeof specialDateSchema>

interface WorkingHoursClientProps {
  initialValues: {
    fixedHours: FixedHoursSchemaType[]
    specialDates: SpecialDateSchemaType[]
  }
  onSubmit: (values: { fixedHours: FixedHoursSchemaType[]; specialDates: SpecialDateSchemaType[] }) => void
}

const WorkingHoursClient: React.FC<WorkingHoursClientProps> = ({ initialValues, onSubmit }) => {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  const { toast } = useToast()
  const [openSpecialDateDialog, setOpenSpecialDateDialog] = React.useState(false)
  const [editingSpecialDateIndex, setEditingSpecialDateIndex] = React.useState<number | null>(null)
  const [editingSpecialDate, setEditingSpecialDate] = React.useState<SpecialDateSchemaType | null>(null)

  const form = useForm({
    resolver: zodResolver(
      z.object({
        fixedHours: z.array(fixedHoursSchema),
        specialDates: z.array(specialDateSchema),
      }),
    ),
    defaultValues: initialValues,
    mode: "onChange",
  })

  const { control, handleSubmit, watch } = form

  const { fields } = useFieldArray({
    // Renamed from 'fields' to avoid conflict if another useFieldArray is named 'fields'
    control,
    name: "fixedHours",
  })

  const {
    fields: specialDateFieldsArray,
    append,
    update,
    remove,
  } = useFieldArray({
    // Destructure with rename
    control,
    name: "specialDates",
  })

  const sortedSpecialDates = React.useMemo(() => {
    const watchedDates = watch("specialDates") || []
    const validDates = [...watchedDates].filter(Boolean)
    return validDates.sort((a, b) => {
      const dateA = a && a.date ? new Date(a.date).getTime() : 0
      const dateB = b && b.date ? new Date(b.date).getTime() : 0

      if (isNaN(dateA) && isNaN(dateB)) return 0
      if (isNaN(dateA)) return 1
      if (isNaN(dateB)) return -1
      return dateA - dateB
    })
  }, [watch("specialDates")])

  const specialDateForm = useForm<SpecialDateSchemaType>({
    resolver: zodResolver(specialDateSchema),
    defaultValues: {
      date: new Date(),
      isActive: false,
      startTime: "08:00",
      endTime: "17:00",
      hasPriceOverride: false,
      priceOverrideType: "amount",
      priceOverrideAmount: 0,
      priceOverridePercentage: 0,
    },
  })

  const handleOpenSpecialDateDialog = (date?: SpecialDateSchemaType, index?: number) => {
    if (date) {
      setEditingSpecialDate(date)
      setEditingSpecialDateIndex(index !== undefined ? index : null)
      // Ensure date is a Date object for the form
      specialDateForm.reset({ ...date, date: date.date ? new Date(date.date) : new Date() })
    } else {
      setEditingSpecialDate(null)
      setEditingSpecialDateIndex(null)
      specialDateForm.reset({
        date: new Date(),
        isActive: false,
        startTime: "08:00",
        endTime: "17:00",
        hasPriceOverride: false,
        priceOverrideType: "amount",
        priceOverrideAmount: 0,
        priceOverridePercentage: 0,
      })
    }
    setOpenSpecialDateDialog(true)
  }

  const handleCloseSpecialDateDialog = () => {
    setOpenSpecialDateDialog(false)
    setEditingSpecialDate(null)
    setEditingSpecialDateIndex(null)
    specialDateForm.reset()
  }

  const onSubmitSpecialDate = (data: SpecialDateSchemaType) => {
    let dateToSave = data.date
    if (!(data.date instanceof Date)) {
      dateToSave = new Date(data.date)
    }

    if (isNaN(dateToSave.getTime())) {
      specialDateForm.setError("date", { type: "manual", message: t("invalidDate") })
      return
    }

    const finalData = { ...data, date: dateToSave, id: data.id || Math.random().toString(36).substring(7) }

    if (
      editingSpecialDateIndex !== null &&
      editingSpecialDateIndex >= 0 &&
      editingSpecialDateIndex < specialDateFieldsArray.length
    ) {
      update(editingSpecialDateIndex, finalData)
    } else {
      append(finalData)
    }
    handleCloseSpecialDateDialog()
    toast({
      title: t("success"),
      description: t("specialDateSaved"),
    })
  }

  const onSubmitForm = (values: { fixedHours: FixedHoursSchemaType[]; specialDates: SpecialDateSchemaType[] }) => {
    onSubmit(values)
  }

  const isMobile = useMobile()

  const columnsSpecial = React.useMemo((): ColumnDef<SpecialDateSchemaType>[] => {
    const getSpecialDatesColumns = (mobile: boolean): ColumnDef<SpecialDateSchemaType>[] => {
      const baseColumns: ColumnDef<SpecialDateSchemaType>[] = [
        {
          accessorKey: "date",
          header: t("date"),
          cell: ({ row }) => {
            const dateValue = row.original?.date
            try {
              return dateValue
                ? formatDate(
                    new Date(dateValue),
                    currentLang,
                    mobile ? { day: "2-digit", month: "2-digit", year: "numeric" } : undefined,
                  )
                : t("invalidDate")
            } catch (error) {
              return t("invalidDate")
            }
          },
        },
        {
          accessorKey: "isActive",
          header: t("active"),
          cell: ({ row }) => (
            <Checkbox checked={row.original.isActive} disabled className={mobile ? "ml-auto mr-auto" : ""} />
          ),
        },
      ]

      const desktopOnlyColumns: ColumnDef<SpecialDateSchemaType>[] = [
        { accessorKey: "startTime", header: t("startTime") },
        { accessorKey: "endTime", header: t("endTime") },
        {
          accessorKey: "hasPriceOverride",
          header: t("priceOverrideShort"),
          cell: ({ row }) => <Checkbox checked={row.original.hasPriceOverride} disabled />,
        },
      ]

      const actionColumn: ColumnDef<SpecialDateSchemaType> = {
        id: "actions",
        cell: ({ row }) => {
          const originalIndex = specialDateFieldsArray.findIndex((sd) => sd.id === row.original.id)
          if (mobile) {
            return (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenSpecialDateDialog(row.original, originalIndex)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t("openMenu")}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenSpecialDateDialog(row.original, originalIndex)}>
                  <Pencil className="mr-2 h-4 w-4" /> {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (originalIndex !== -1) {
                      remove(originalIndex)
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }

      return mobile ? [...baseColumns, actionColumn] : [...baseColumns, ...desktopOnlyColumns, actionColumn]
    }
    return getSpecialDatesColumns(isMobile)
  }, [isMobile, t, currentLang, specialDateFieldsArray, append, update, remove])

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-8">
        {/* Fixed Working Hours */}
        <div>
          <h3 className="text-lg font-medium">{t("fixedWorkingHours")}</h3>
          <p className="text-sm text-muted-foreground">{t("fixedWorkingHoursDescription")}</p>

          <div className="space-y-6">
            {fields.map((fieldItem, index) => {
              // Renamed 'field' to 'fieldItem' to avoid conflict
              const dayIsActive = watch(`fixedHours.${index}.isActive`)
              const hasPriceOverride = watch(`fixedHours.${index}.hasPriceOverride`)
              return (
                <Card key={fieldItem.id} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center justify-between md:justify-start md:w-1/4">
                      <span className="font-medium">{t(`days.${dayMapping[index]}`)}</span>
                      <FormField
                        control={control}
                        name={`fixedHours.${index}.isActive`}
                        render={({ field: checkboxField }) => (
                          <FormItem className="flex items-center space-x-2 ml-4 md:ml-0">
                            <FormControl>
                              <Checkbox checked={checkboxField.value} onCheckedChange={checkboxField.onChange} />
                            </FormControl>
                            <FormLabel className="text-sm md:hidden">{t("active")}</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    {dayIsActive && (
                      <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:flex md:flex-row md:gap-2 md:items-center flex-1">
                          <FormField
                            control={control}
                            name={`fixedHours.${index}.startTime`}
                            render={({ field: timeField }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">{t("startTime")}</FormLabel>
                                <FormControl>
                                  <Input type="time" {...timeField} className="w-full" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name={`fixedHours.${index}.endTime`}
                            render={({ field: timeField }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">{t("endTime")}</FormLabel>
                                <FormControl>
                                  <Input type="time" {...timeField} className="w-full" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:flex md:flex-row md:gap-2 md:items-center md:w-auto mt-2 md:mt-0">
                          <FormField
                            control={control}
                            name={`fixedHours.${index}.hasPriceOverride`}
                            render={({ field: checkboxField }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 py-2">
                                <FormControl>
                                  <Checkbox checked={checkboxField.value} onCheckedChange={checkboxField.onChange} />
                                </FormControl>
                                <FormLabel className="text-sm">{t("priceOverride")}</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {dayIsActive && hasPriceOverride && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                      <FormField
                        control={control}
                        name={`fixedHours.${index}.priceOverrideType`}
                        render={({ field: selectField }) => (
                          <FormItem>
                            <FormLabel>{t("priceOverrideType")}</FormLabel>
                            <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("selectPriceOverrideType")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="amount">{t("amountInNIS")}</SelectItem>
                                <SelectItem value="percentage">{t("percentageAmount")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {watch(`fixedHours.${index}.priceOverrideType`) === "amount" ? (
                        <FormField
                          control={control}
                          name={`fixedHours.${index}.priceOverrideAmount`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <FormLabel>{t("priceOverrideAmount")}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...inputField}
                                  value={inputField.value ?? ""}
                                  onChange={(e) =>
                                    inputField.onChange(
                                      e.target.value === "" ? undefined : Number.parseFloat(e.target.value),
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={control}
                          name={`fixedHours.${index}.priceOverridePercentage`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <FormLabel>{t("priceOverridePercentage")}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...inputField}
                                  value={inputField.value ?? ""}
                                  onChange={(e) =>
                                    inputField.onChange(
                                      e.target.value === "" ? undefined : Number.parseFloat(e.target.value),
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                  {dayIsActive && (
                    <FormField
                      control={control}
                      name={`fixedHours.${index}.notes`}
                      render={(
                        { field: inputField }, // Renamed 'field' to 'inputField'
                      ) => (
                        <FormItem className="mt-4 border-t pt-4">
                          <FormLabel>{t("notes")}</FormLabel>
                          <FormControl>
                            <Textarea {...inputField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </Card>
              )
            })}
          </div>
        </div>

        {/* Special Dates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium">{t("specialDates")}</h3>
              <p className="text-sm text-muted-foreground">{t("specialDatesDescription")}</p>
            </div>
            <Button type="button" onClick={() => handleOpenSpecialDateDialog()}>
              {t("addSpecialDate")}
            </Button>
          </div>
          <DataTable columns={columnsSpecial} data={sortedSpecialDates} />
        </div>

        <Button type="submit">{t("save")}</Button>
      </form>

      {/* Special Date Dialog */}
      {openSpecialDateDialog && (
        <Dialog
          open={openSpecialDateDialog}
          onOpenChange={(isOpen) => {
            if (!isOpen) handleCloseSpecialDateDialog()
            else setOpenSpecialDateDialog(true)
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingSpecialDate ? t("editSpecialDate") : t("addSpecialDate")}</DialogTitle>
              <DialogDescription>{t("addEditSpecialDateDescription")}</DialogDescription>
            </DialogHeader>
            <Form {...specialDateForm}>
              <form onSubmit={specialDateForm.handleSubmit(onSubmitSpecialDate)} className="space-y-4">
                <FormField
                  control={specialDateForm.control}
                  name="date"
                  render={(
                    { field: dateField }, // Renamed 'field' to 'dateField'
                  ) => (
                    <FormItem>
                      <FormLabel>{t("date")}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...dateField}
                          value={dateField.value ? formatDate(new Date(dateField.value), "en-CA") : ""} // 'en-CA' gives YYYY-MM-DD
                          onChange={(e) => dateField.onChange(e.target.value ? new Date(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={specialDateForm.control}
                  name="isActive"
                  render={(
                    { field: checkboxField }, // Renamed 'field' to 'checkboxField'
                  ) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={checkboxField.value} onCheckedChange={checkboxField.onChange} />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">{t("active")}</FormLabel>
                        <FormDescription>{t("activeDescription")}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                {specialDateForm.watch("isActive") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={specialDateForm.control}
                      name="startTime"
                      render={(
                        { field: timeField }, // Renamed 'field' to 'timeField'
                      ) => (
                        <FormItem>
                          <FormLabel>{t("startTime")}</FormLabel>
                          <FormControl>
                            <Input type="time" {...timeField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={specialDateForm.control}
                      name="endTime"
                      render={(
                        { field: timeField }, // Renamed 'field' to 'timeField'
                      ) => (
                        <FormItem>
                          <FormLabel>{t("endTime")}</FormLabel>
                          <FormControl>
                            <Input type="time" {...timeField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                <FormField
                  control={specialDateForm.control}
                  name="hasPriceOverride"
                  render={(
                    { field: checkboxField }, // Renamed 'field' to 'checkboxField'
                  ) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={checkboxField.value} onCheckedChange={checkboxField.onChange} />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">{t("priceOverride")}</FormLabel>
                        <FormDescription>{t("priceOverrideDescription")}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                {specialDateForm.watch("hasPriceOverride") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={specialDateForm.control}
                      name="priceOverrideType"
                      render={(
                        { field: selectField }, // Renamed 'field' to 'selectField'
                      ) => (
                        <FormItem>
                          <FormLabel>{t("priceOverrideType")}</FormLabel>
                          <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("selectPriceOverrideType")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="amount">{t("amountInNIS")}</SelectItem>
                              <SelectItem value="percentage">{t("percentageAmount")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {specialDateForm.watch("priceOverrideType") === "amount" ? (
                      <FormField
                        control={specialDateForm.control}
                        name="priceOverrideAmount"
                        render={(
                          { field: inputField }, // Renamed 'field' to 'inputField'
                        ) => (
                          <FormItem>
                            <FormLabel>{t("priceOverrideAmount")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...inputField}
                                value={inputField.value ?? ""}
                                onChange={(e) =>
                                  inputField.onChange(
                                    e.target.value === "" ? undefined : Number.parseFloat(e.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={specialDateForm.control}
                        name="priceOverridePercentage"
                        render={(
                          { field: inputField }, // Renamed 'field' to 'inputField'
                        ) => (
                          <FormItem>
                            <FormLabel>{t("priceOverridePercentage")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...inputField}
                                value={inputField.value ?? ""}
                                onChange={(e) =>
                                  inputField.onChange(
                                    e.target.value === "" ? undefined : Number.parseFloat(e.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseSpecialDateDialog}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit">{t("save")}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </Form>
  )
}

export default WorkingHoursClient
