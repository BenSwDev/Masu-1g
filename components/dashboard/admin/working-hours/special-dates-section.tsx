"use client"

import { useState, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { deleteSpecialDate, toggleSpecialDateStatus } from "@/actions/working-hours-actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Calendar } from "@/components/common/ui/calendar"
import { SpecialDateForm } from "./special-date-form"
import { useToast } from "@/components/common/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/common/ui/alert-dialog"
import {
  PlusIcon,
  ClockIcon,
  EditIcon,
  TrashIcon,
  PowerIcon,
  CalendarDaysIcon,
  ListChecksIcon,
  XCircleIcon,
  Loader2,
} from "lucide-react" // Updated icons
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { format, isSameDay } from "date-fns"
import { enUS, he, ru } from "date-fns/locale" // Import locales

interface SpecialDatesSectionProps {
  specialDates: any[]
  onRefresh: () => void
}

export function SpecialDatesSection({ specialDates, onRefresh }: SpecialDatesSectionProps) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDate, setEditingDate] = useState<any>(null)
  const [dateToDelete, setDateToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined)

  const dateFnsLocale = useMemo(() => {
    if (i18n.language.startsWith("he")) return he
    if (i18n.language.startsWith("ru")) return ru
    return enUS
  }, [i18n.language])

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingDate(null)
    onRefresh()
    toast({
      title: editingDate ? t("workingHours.specialDate.updateSuccess") : t("workingHours.specialDate.createSuccess"),
      variant: "success",
    })
  }

  const handleCancelForm = () => {
    setIsFormOpen(false)
    setEditingDate(null)
  }

  const handleAddNew = () => {
    setEditingDate(null)
    setIsFormOpen(true)
  }

  const handleEdit = (specialDate: any) => {
    setEditingDate(specialDate)
    setIsFormOpen(true)
  }

  const handleToggleStatus = async (id: string, currentIsActive: boolean) => {
    try {
      setIsLoading(true)
      await toggleSpecialDateStatus(id)
      onRefresh()
      toast({
        title: currentIsActive
          ? t("workingHours.specialDate.deactivateSuccess")
          : t("workingHours.specialDate.activateSuccess"),
        variant: "success",
      })
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("workingHours.specialDate.statusUpdateError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!dateToDelete) return

    try {
      setIsLoading(true)
      await deleteSpecialDate(dateToDelete)
      onRefresh()
      toast({
        title: t("workingHours.specialDate.deleteSuccess"),
        variant: "success",
      })
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("workingHours.specialDate.deleteError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setDateToDelete(null)
    }
  }

  const formatDateDisplay = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateFnsLocale })
  }

  const formatTimeDisplay = (timeString: string) => {
    if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) return t("common.notSet") // Handle invalid or missing time
    const [hours, minutes] = timeString.split(":")
    return format(new Date(0, 0, 0, Number.parseInt(hours), Number.parseInt(minutes)), "p", { locale: dateFnsLocale })
  }

  const filteredDates = useMemo(() => {
    const dates = [...specialDates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (selectedCalendarDate) {
      return dates.filter((date) => isSameDay(new Date(date.date), selectedCalendarDate))
    }
    return dates
  }, [specialDates, selectedCalendarDate])

  const calendarEventDates = useMemo(() => specialDates.map((date) => new Date(date.date)), [specialDates])

  if (isFormOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {editingDate ? t("workingHours.specialDate.formTitleEdit") : t("workingHours.specialDate.formTitleCreate")}
          </CardTitle>
          <CardDescription>
            {editingDate
              ? t("workingHours.specialDate.formDescriptionEdit")
              : t("workingHours.specialDate.formDescriptionCreate")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpecialDateForm specialDate={editingDate} onSuccess={handleFormSuccess} onCancel={handleCancelForm} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>{t("workingHours.specialDatesManagement")}</CardTitle>
            <CardDescription>{t("workingHours.specialDate.description")}</CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t("workingHours.specialDate.addNew")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:sticky lg:top-20">
            {" "}
            {/* Make calendar sticky */}
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2 text-primary" />
                {t("workingHours.specialDate.filterByDate")}
              </CardTitle>
              <CardDescription>{t("workingHours.specialDate.calendarDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedCalendarDate}
                onSelect={setSelectedCalendarDate}
                className="rounded-md border shadow-sm"
                locale={dateFnsLocale}
                modifiers={{
                  event: calendarEventDates,
                }}
                modifiersStyles={{
                  event: {
                    fontWeight: "bold",
                    color: "var(--primary-foreground)",
                    backgroundColor: "var(--primary)",
                    borderRadius: "9999px",
                  },
                }}
                footer={
                  selectedCalendarDate && (
                    <Button variant="ghost" onClick={() => setSelectedCalendarDate(undefined)} className="w-full mt-2">
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      {t("workingHours.specialDate.clearSelection")}
                    </Button>
                  )
                }
              />
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <CardHeader className="p-0">
              <CardTitle className="text-lg flex items-center">
                <ListChecksIcon className="h-5 w-5 mr-2 text-primary" />
                {selectedCalendarDate
                  ? `${t("workingHours.specialDate.eventsForDate")}: ${format(selectedCalendarDate, "PPP", { locale: dateFnsLocale })}`
                  : t("workingHours.specialDate.allUpcomingEvents")}
              </CardTitle>
            </CardHeader>
            {filteredDates.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="p-6 text-center">
                  <CalendarDaysIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    {selectedCalendarDate
                      ? t("workingHours.specialDate.noSpecialDatesForSelection")
                      : t("workingHours.specialDate.noSpecialDates")}
                  </p>
                  <Button variant="outline" onClick={handleAddNew} className="mt-4">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {t("workingHours.specialDate.addNewFromEmpty")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDates.map((specialDate) => (
                  <Card key={specialDate._id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{specialDate.name}</CardTitle>
                        <Badge variant={specialDate.isActive ? "success" : "outline"}>
                          {" "}
                          {/* Use success badge */}
                          {specialDate.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </div>
                      <CardDescription>{formatDateDisplay(specialDate.date)}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 space-y-2">
                      {specialDate.description && (
                        <p className="text-sm text-muted-foreground">{specialDate.description}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {specialDate.startTime ? formatTimeDisplay(specialDate.startTime) : t("common.notSet")} -{" "}
                          {specialDate.endTime ? formatTimeDisplay(specialDate.endTime) : t("common.notSet")}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-0 pb-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">{t("common.actions")}</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <circle cx="12" cy="12" r="1"></circle>
                              <circle cx="19" cy="12" r="1"></circle>
                              <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(specialDate)}>
                            <EditIcon className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(specialDate._id, specialDate.isActive)}>
                            <PowerIcon className="h-4 w-4 mr-2" />
                            {specialDate.isActive ? t("common.deactivate") : t("common.activate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDateToDelete(specialDate._id)}
                            className="text-red-500 hover:!text-red-500 focus:!text-red-500"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <AlertDialog open={!!dateToDelete} onOpenChange={(open) => !open && setDateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("workingHours.specialDate.deleteConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>{t("workingHours.specialDate.deleteConfirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isLoading} variant="destructive">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrashIcon className="h-4 w-4 mr-2" />}
                {isLoading ? t("common.deleting") : t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
