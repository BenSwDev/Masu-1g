"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button" // Corrected path
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card" // Corrected path
import { Calendar } from "@/components/common/ui/calendar" // Corrected path
import { Badge } from "@/components/common/ui/badge" // Corrected path
import { Dialog, DialogContent } from "@/components/common/ui/dialog" // Corrected path
import { AlertModal } from "@/components/common/modals/alert-modal" // Corrected path
import { PlusCircle, Edit3, Trash2, CalendarDays, Clock, XCircle, CheckCircle2 } from "lucide-react"
import { format, getDay, parseISO } from "date-fns"
import { SpecialDateForm } from "./special-date-form" // Corrected: Named import
import { deleteSpecialDate, toggleSpecialDateStatus } from "@/actions/working-hours-actions"
import { useToast } from "@/components/common/ui/use-toast" // Corrected path
import type { IWorkingHours, ISpecialDate } from "@/lib/db/models/working-hours"

interface SpecialDatesSectionProps {
  specialDates: ISpecialDate[]
  weeklyHours: IWorkingHours["weeklyHours"]
  onRefresh: () => void
}

// This is already a named export, which is correct.
export function SpecialDatesSection({ specialDates, weeklyHours, onRefresh }: SpecialDatesSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSpecialDate, setEditingSpecialDate] = useState<ISpecialDate | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [specialDateToDelete, setSpecialDateToDelete] = useState<ISpecialDate | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDateSelect = (date?: Date) => {
    setSelectedDate(date)
  }

  const openNewForm = () => {
    setEditingSpecialDate(null)
    setIsFormOpen(true)
  }

  const openEditForm = (specialDate: ISpecialDate) => {
    setEditingSpecialDate(specialDate)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingSpecialDate(null)
    onRefresh()
  }

  const confirmDelete = (specialDate: ISpecialDate) => {
    setSpecialDateToDelete(specialDate)
    setIsAlertOpen(true)
  }

  const handleDelete = async () => {
    if (!specialDateToDelete || !specialDateToDelete._id) return
    setIsLoading(true)
    try {
      const result = await deleteSpecialDate(specialDateToDelete._id)
      if (result.success) {
        toast({
          title: t("common.success"),
          description: t("workingHours.specialDate.deleteSuccess"),
          variant: "success",
        })
        onRefresh()
      } else {
        throw new Error(result.error || t("workingHours.specialDate.deleteError"))
      }
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" })
    } finally {
      setIsAlertOpen(false)
      setSpecialDateToDelete(null)
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (specialDate: ISpecialDate) => {
    if (!specialDate._id) return
    setIsLoading(true)
    try {
      // The toggleSpecialDateStatus action now expects the new status.
      // We determine the new status based on the current specialDate.isActive.
      // If it's currently active, the new status will be inactive (and vice-versa).
      // However, the form now uses 'workingTimeType'. If 'closed', it's inactive.
      // This toggle might be simpler if it just flips `isActive` or if the action is smarter.
      // For now, let's assume toggleSpecialDateStatus flips `isActive`.
      // A more robust approach would be to open the form to change status via 'workingTimeType'.
      const result = await toggleSpecialDateStatus(specialDate._id, !specialDate.isActive)
      if (result.success) {
        toast({
          title: t("common.success"),
          description: t("workingHours.specialDate.statusUpdateSuccess"),
          variant: "success",
        })
        onRefresh()
      } else {
        throw new Error(result.error || t("workingHours.specialDate.statusUpdateError"))
      }
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const getDayHours = (date: Date): string => {
    const dayOfWeek = getDay(date) // Sunday = 0, Monday = 1, ...
    const daySetting = weeklyHours.find((wh) => wh.dayOfWeek === dayOfWeek)
    if (daySetting && daySetting.isOpen && daySetting.startTime && daySetting.endTime) {
      return `${daySetting.startTime} - ${daySetting.endTime}`
    }
    return t("workingHours.closed")
  }

  const filteredSpecialDates = selectedDate
    ? specialDates.filter(
        (sd) => format(parseISO(sd.date as unknown as string), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"),
      )
    : specialDates

  const renderSpecialDateStatus = (sd: ISpecialDate) => {
    if (!sd.isActive) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" /> {t("workingHours.specialDate.status.closed")}
        </Badge>
      )
    }
    if (sd.startTime && sd.endTime) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white">
          <Clock className="h-3 w-3" /> {t("workingHours.specialDate.status.openCustom")}
        </Badge>
      )
    }
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> {t("workingHours.specialDate.status.openDefault")}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("workingHours.specialDatesCalendarTitle")}</CardTitle>
          <CardDescription>{t("workingHours.specialDatesCalendarDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6 items-start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border shadow-sm mx-auto md:mx-0"
            dir={t("common.dir") as "ltr" | "rtl" | undefined}
          />
          <div className="flex-1 w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedDate ? format(selectedDate, "PPP") : t("workingHours.allSpecialDates")}
              </h3>
              <Button onClick={openNewForm} size="sm">
                <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> {t("workingHours.specialDate.addNewShort")}
              </Button>
            </div>
            {filteredSpecialDates.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-md">
                <CalendarDays className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p>
                  {selectedDate ? t("workingHours.specialDate.noneOnDate") : t("workingHours.specialDate.noneDefined")}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 rtl:pl-2 rtl:pr-0">
                {filteredSpecialDates.map((sd) => (
                  <Card key={sd._id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-md">{sd.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(sd.date as unknown as string), "PPP")}
                          </p>
                        </div>
                        {renderSpecialDateStatus(sd)}
                      </div>
                      {sd.description && <p className="text-sm text-muted-foreground mt-1 mb-2">{sd.description}</p>}

                      <div className="text-sm mt-2">
                        {sd.isActive ? (
                          sd.startTime && sd.endTime ? (
                            <p>
                              <Clock className="inline h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("workingHours.hours")}: {sd.startTime} - {sd.endTime}
                            </p>
                          ) : (
                            <p>
                              <Clock className="inline h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("workingHours.hours")}: {getDayHours(parseISO(sd.date as unknown as string))}
                            </p>
                          )
                        ) : (
                          <p className="text-destructive">{t("workingHours.dayClosed")}</p>
                        )}
                      </div>

                      {sd.priceAdjustment && sd.isActive && (
                        <div className="mt-2 pt-2 border-t text-xs">
                          <p className="font-medium">{t("workingHours.priceAdjustment.title")}:</p>
                          <p>
                            {sd.priceAdjustment.type === "percentage"
                              ? `${sd.priceAdjustment.value}%`
                              : `${t("common.currencySymbol")}${sd.priceAdjustment.value}`}
                            {sd.priceAdjustment.reason && ` (${sd.priceAdjustment.reason})`}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button variant="outline" size="sm" onClick={() => openEditForm(sd)} disabled={isLoading}>
                          <Edit3 className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" /> {t("common.edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(sd)}
                          disabled={isLoading}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" /> {t("common.delete")}
                        </Button>
                        {/* Simplified toggle: The form is better for status changes via 'workingTimeType' */}
                        {/* <Button variant="outline" size="sm" onClick={() => handleToggleStatus(sd)} disabled={isLoading}>
                          {sd.isActive ? t("common.setInactive") : t("common.setActive")}
                        </Button> */}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-2xl">
          {/* DialogHeader might be part of SpecialDateForm or managed here */}
          {/* <DialogHeader><DialogTitle>{editingSpecialDate ? t("workingHours.specialDate.edit") : t("workingHours.specialDate.addNew")}</DialogTitle></DialogHeader> */}
          <SpecialDateForm
            specialDate={editingSpecialDate || undefined}
            weeklyHours={weeklyHours}
            onSuccess={closeForm}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      <AlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={handleDelete}
        loading={isLoading}
        title={t("workingHours.specialDate.deleteConfirmationTitle")}
        description={t("workingHours.specialDate.deleteConfirmationMessage", { name: specialDateToDelete?.name })}
      />
    </div>
  )
}
