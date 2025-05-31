"use client"

import type React from "react"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"

import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/ui/dialog"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Textarea } from "@/components/common/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { toast } from "@/components/common/ui/use-toast"

import { updateWorkingHoursSettings, getWorkingHoursSettings } from "@/lib/api/working-hours"
import { cn } from "@/lib/utils"

const timeOptions = [
  { value: "00:00", label: "12:00 AM" },
  { value: "01:00", label: "1:00 AM" },
  { value: "02:00", label: "2:00 AM" },
  { value: "03:00", label: "3:00 AM" },
  { value: "04:00", label: "4:00 AM" },
  { value: "05:00", label: "5:00 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
  { value: "23:00", label: "11:00 PM" },
]

interface WorkingHours {
  monday: { open: string; close: string; enabled: boolean }
  tuesday: { open: string; close: string; enabled: boolean }
  wednesday: { open: string; close: string; enabled: boolean }
  thursday: { open: string; close: string; enabled: boolean }
  friday: { open: string; close: string; enabled: boolean }
  saturday: { open: string; close: string; enabled: boolean }
  sunday: { open: string; close: string; enabled: boolean }
  specialDates: { date: string; note: string }[]
}

interface DaySettingsProps {
  day: keyof WorkingHours
}

const DaySettings: React.FC<DaySettingsProps> = ({ day }) => {
  const t = useTranslations("Dashboard.admin")
  const queryClient = useQueryClient()
  const { data: workingHoursSettings } = useQuery({
    queryKey: ["workingHoursSettings"],
    queryFn: getWorkingHoursSettings,
  })

  const [open, setOpen] = useState(false)

  const updateMutation = useMutation(updateWorkingHoursSettings, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workingHoursSettings"] })
      toast({
        title: t("workingHours.success"),
        description: t("workingHours.saveSuccess"),
      })
    },
    onError: () => {
      toast({
        title: t("workingHours.error"),
        description: t("workingHours.saveFailed"),
        variant: "destructive",
      })
    },
  })

  const daySchema = z.object({
    open: z.string(),
    close: z.string(),
    enabled: z.boolean(),
  })

  const dayForm = useForm<z.infer<typeof daySchema>>({
    resolver: zodResolver(daySchema),
    defaultValues: {
      open: workingHoursSettings?.[day]?.open || "09:00",
      close: workingHoursSettings?.[day]?.close || "17:00",
      enabled: workingHoursSettings?.[day]?.enabled || true,
    },
    mode: "onChange",
  })

  const onSubmit = async (values: z.infer<typeof daySchema>) => {
    if (!workingHoursSettings) return

    const updatedSettings = {
      ...workingHoursSettings,
      [day]: values,
    }

    updateMutation.mutate(updatedSettings)
    setOpen(false)
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{t(`workingHours.${day}`)}</TableCell>
      <TableCell>{workingHoursSettings?.[day]?.enabled ? t("workingHours.open") : t("workingHours.closed")}</TableCell>
      <TableCell>{workingHoursSettings?.[day]?.open}</TableCell>
      <TableCell>{workingHoursSettings?.[day]?.close}</TableCell>
      <TableCell className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {t("workingHours.edit")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("workingHours.editDay")}</DialogTitle>
            </DialogHeader>
            <Form {...dayForm}>
              <form onSubmit={dayForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={dayForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium leading-none">{t("workingHours.enabled")}</FormLabel>
                        <FormMessage />
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="ml-2 h-5 w-5 rounded-sm border border-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={dayForm.control}
                  name="open"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("workingHours.openTime")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("workingHours.selectTime")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={dayForm.control}
                  name="close"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("workingHours.closeTime")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("workingHours.selectTime")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">{t("workingHours.save")}</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  )
}

const specialDateSchema = z.object({
  date: z.date(),
  note: z.string().min(2, {
    message: "Note must be at least 2 characters.",
  }),
})

type SpecialDateFormData = z.infer<typeof specialDateSchema>

const SpecialDatesSettings = () => {
  const t = useTranslations("Dashboard.admin")
  const locale = useTranslations("Locale")
  const queryClient = useQueryClient()
  const [isSpecialDateDialogOpen, setIsSpecialDateDialogOpen] = useState(false)
  const [editingSpecialDate, setEditingSpecialDate] = useState<number | null>(null)
  const { data: workingHoursSettings, refetch } = useQuery({
    queryKey: ["workingHoursSettings"],
    queryFn: getWorkingHoursSettings,
  })

  const specialDateForm = useForm<SpecialDateFormData>({
    resolver: zodResolver(specialDateSchema),
    defaultValues: {
      date: new Date(),
      note: "",
    },
  })

  const onSubmitSpecialDate = async (data: SpecialDateFormData) => {
    try {
      const currentSettings = await getWorkingHoursSettings()
      const updatedSpecialDates =
        editingSpecialDate !== null
          ? currentSettings.specialDates.map((date, index) =>
              index === editingSpecialDate ? { ...data, date: data.date.toISOString() } : date,
            )
          : [...currentSettings.specialDates, { ...data, date: data.date.toISOString() }]

      await updateWorkingHoursSettings({
        ...currentSettings,
        specialDates: updatedSpecialDates,
      })

      await refetch()
      setIsSpecialDateDialogOpen(false)
      setEditingSpecialDate(null)
      specialDateForm.reset()

      toast({
        title: t("workingHours.success"),
        description:
          editingSpecialDate !== null ? t("workingHours.specialDateUpdated") : t("workingHours.specialDateAdded"),
      })
    } catch (error) {
      console.error("Error saving special date:", error)
      toast({
        title: t("workingHours.error"),
        description: t("workingHours.saveFailed"),
        variant: "destructive",
      })
    }
  }

  const onEditSpecialDate = (index: number) => {
    setEditingSpecialDate(index)
    const specialDate = workingHoursSettings?.specialDates[index]
    if (specialDate) {
      specialDateForm.setValue("date", new Date(specialDate.date))
      specialDateForm.setValue("note", specialDate.note)
    }
    setIsSpecialDateDialogOpen(true)
  }

  const onDeleteSpecialDate = async (index: number) => {
    try {
      const currentSettings = await getWorkingHoursSettings()
      const updatedSpecialDates = currentSettings.specialDates.filter((_, i) => i !== index)

      await updateWorkingHoursSettings({
        ...currentSettings,
        specialDates: updatedSpecialDates,
      })

      await refetch()
      toast({
        title: t("workingHours.success"),
        description: t("workingHours.specialDateDeleted"),
      })
    } catch (error) {
      console.error("Error deleting special date:", error)
      toast({
        title: t("workingHours.error"),
        description: t("workingHours.deleteFailed"),
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workingHours.specialDates")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("workingHours.date")}</TableHead>
              <TableHead>{t("workingHours.note")}</TableHead>
              <TableHead className="text-right">{t("workingHours.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workingHoursSettings?.specialDates.map((specialDate, index) => (
              <TableRow key={index}>
                <TableCell>
                  {new Date(specialDate.date).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell>{specialDate.note}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEditSpecialDate(index)}>
                    {t("workingHours.edit")}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDeleteSpecialDate(index)}>
                    {t("workingHours.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog open={isSpecialDateDialogOpen} onOpenChange={setIsSpecialDateDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t("workingHours.addSpecialDate")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingSpecialDate !== null ? t("workingHours.editSpecialDate") : t("workingHours.addSpecialDate")}
              </DialogTitle>
            </DialogHeader>
            <Form {...specialDateForm}>
              <form onSubmit={specialDateForm.handleSubmit(onSubmitSpecialDate)} className="space-y-4">
                <FormField
                  control={specialDateForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-3">
                      <FormLabel>{t("workingHours.date")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>{t("workingHours.pickDate")}</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
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
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("workingHours.note")}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t("workingHours.notePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">
                  {editingSpecialDate !== null ? t("workingHours.update") : t("workingHours.save")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

const WorkingHoursClient = () => {
  const t = useTranslations("Dashboard.admin")

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("workingHours.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("workingHours.day")}</TableHead>
                <TableHead>{t("workingHours.status")}</TableHead>
                <TableHead>{t("workingHours.openTime")}</TableHead>
                <TableHead>{t("workingHours.closeTime")}</TableHead>
                <TableHead className="text-right">{t("workingHours.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <DaySettings day="monday" />
              <DaySettings day="tuesday" />
              <DaySettings day="wednesday" />
              <DaySettings day="thursday" />
              <DaySettings day="friday" />
              <DaySettings day="saturday" />
              <DaySettings day="sunday" />
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <SpecialDatesSettings />
    </div>
  )
}

export default WorkingHoursClient
