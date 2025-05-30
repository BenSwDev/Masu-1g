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
  Edit,
  Trash,
  Power,
  TagIcon,
  PercentIcon,
  Info,
  MoreVertical,
  CalendarDays,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import { format, parseISO } from "date-fns" // Import parseISO

interface SpecialDatesSectionProps {
  specialDates: any[]
  weeklyHours: any[]
  onRefresh: () => void
}

export function SpecialDatesSection({ specialDates, weeklyHours, onRefresh }: SpecialDatesSectionProps) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [isAddingDate, setIsAddingDate] = useState(false)
  const [editingDate, setEditingDate] = useState<any>(null)
  const [dateToDelete, setDateToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const localeForDateFns = useMemo(() => {
    // Basic mapping, expand as needed
    const lang = i18n.language.split("-")[0]
    if (lang === "he") return import("date-fns/locale/he").then((mod) => mod.default)
    if (lang === "ru") return import("date-fns/locale/ru").then((mod) => mod.default)
    return import("date-fns/locale/en-US").then((mod) => mod.default)
  }, [i18n.language])

  const [dateFnsLocale, setDateFnsLocale] = useState<any>(null)
  localeForDateFns.then(setDateFnsLocale)

  const handleAddSuccess = () => {
    setIsAddingDate(false)
    onRefresh()
  }

  const handleEditSuccess = () => {
    setEditingDate(null)
    onRefresh()
  }

  const handleCancel = () => {
    setIsAddingDate(false)
    setEditingDate(null)
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
    if (!dateFnsLocale) return dateString // Fallback if locale not loaded
    const date = parseISO(dateString) // Use parseISO for robust parsing
    return format(date, "PPP", { locale: dateFnsLocale })
  }

  const formatTime = (timeString: string) => {
    if (!timeString || !timeString.includes(":")) return t("common.notSet")
    const [hours, minutes] = timeString.split(":")
    return `${hours}:${minutes}`
  }

  const filteredDates = useMemo(() => {
    const sorted = [...specialDates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (!selectedDate) return sorted
    return sorted.filter((date) => {
      const specialDateObj = new Date(date.date)
      return (
        specialDateObj.getDate() === selectedDate.getDate() &&
        specialDateObj.getMonth() === selectedDate.getMonth() &&
        specialDateObj.getFullYear() === selectedDate.getFullYear()
      )
    })
  }, [specialDates, selectedDate])

  const specialDatesForCalendar = useMemo(() => specialDates.map((date) => new Date(date.date)), [specialDates])

  if (isAddingDate || editingDate) {
    return (
      <SpecialDateForm
        specialDate={editingDate}
        onSuccess={editingDate ? handleEditSuccess : handleAddSuccess}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle>{t("workingHours.specialDates")}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t("workingHours.specialDate.sectionDescription")}</p>
        </div>
        <Button onClick={() => setIsAddingDate(true)} className="w-full sm:w-auto">
          <PlusIcon className="h-4 w-4 mr-2 rtl:ml-2" />
          {t("workingHours.specialDate.addNew")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>{t("workingHours.specialDate.calendarTitle")}</CardTitle>
            <CardDescription>{t("workingHours.specialDate.calendarDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border p-0"
              modifiers={{
                special: specialDatesForCalendar,
              }}
              modifiersClassNames={{
                special: "font-bold bg-primary/10 text-primary rounded-md",
              }}
              dir={t("common.dir") as "ltr" | "rtl" | undefined}
              locale={dateFnsLocale}
            />
          </CardContent>
          {selectedDate && (
            <CardFooter>
              <Button variant="outline" onClick={() => setSelectedDate(undefined)} className="w-full">
                {t("workingHours.specialDate.clearSelection")}
              </Button>
            </CardFooter>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-semibold">
            {selectedDate
              ? `${t("workingHours.specialDate.eventsFor")}: ${formatDateDisplay(selectedDate.toISOString())}`
              : t("workingHours.specialDate.allEvents")}
          </h3>

          {filteredDates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>
                  {selectedDate
                    ? t("workingHours.specialDate.noEventsForSelection")
                    : t("workingHours.specialDate.noEventsInList")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDates.map((specialDate) => {
                const dayOfWeek = new Date(specialDate.date).getDay()
                const weeklyDaySetting = weeklyHours.find((wh) => wh.day === dayOfWeek)

                const displayStartTime =
                  specialDate.startTime ||
                  (weeklyDaySetting && weeklyDaySetting.isActive ? weeklyDaySetting.startTime : "")
                const displayEndTime =
                  specialDate.endTime || (weeklyDaySetting && weeklyDaySetting.isActive ? weeklyDaySetting.endTime : "")
                const areHoursInherited =
                  !specialDate.startTime && !specialDate.endTime && weeklyDaySetting && weeklyDaySetting.isActive
                const isTimeNotSet = !displayStartTime && !displayEndTime

                return (
                  <Card key={specialDate._id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{specialDate.name}</CardTitle>
                        <Badge variant={specialDate.isActive ? "success" : "outline"}>
                          {specialDate.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </div>
                      <CardDescription>{formatDateDisplay(specialDate.date)}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 space-y-2 flex-grow">
                      {specialDate.description && (
                        <p className="text-sm text-muted-foreground italic">{specialDate.description}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <ClockIcon className="h-4 w-4 mr-2 rtl:ml-2 flex-shrink-0" />
                        <span>
                          {isTimeNotSet && specialDate.isActive ? (
                            t("workingHours.specialDate.closedAllDay")
                          ) : isTimeNotSet && !specialDate.isActive ? (
                            t("common.notSet")
                          ) : (
                            <>
                              {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
                              {areHoursInherited && specialDate.isActive && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1 rtl:mr-1 text-muted-foreground inline-block cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t("workingHours.specialDate.defaultHoursIndicator")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      {specialDate.priceAdjustment && specialDate.isActive && (
                        <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                          <p className="font-medium text-foreground mb-1">{t("workingHours.priceAdjustment.title")}:</p>
                          <div className="flex items-center">
                            {specialDate.priceAdjustment.type === "percentage" ? (
                              <PercentIcon className="h-4 w-4 mr-2 rtl:ml-2 flex-shrink-0 text-primary" />
                            ) : (
                              <TagIcon className="h-4 w-4 mr-2 rtl:ml-2 flex-shrink-0 text-primary" />
                            )}
                            <span>
                              {specialDate.priceAdjustment.value}
                              {specialDate.priceAdjustment.type === "percentage" ? "%" : ` ${t("common.currency")}`}
                              {` (${t(`workingHours.priceAdjustment.types.${specialDate.priceAdjustment.type}`)})`}
                            </span>
                          </div>
                          {specialDate.priceAdjustment.reason && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-start mt-1">
                                    <Info className="h-4 w-4 mr-2 rtl:ml-2 mt-0.5 flex-shrink-0 text-blue-500" />
                                    <p className="truncate italic text-xs">{specialDate.priceAdjustment.reason}</p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="start">
                                  <p className="max-w-xs">{specialDate.priceAdjustment.reason}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse border-t pt-3 mt-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">{t("common.actions")}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDate(specialDate)}>
                            <Edit className="h-4 w-4 mr-2 rtl:ml-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(specialDate._id, specialDate.isActive)}>
                            <Power className="h-4 w-4 mr-2 rtl:ml-2" />
                            {specialDate.isActive ? t("common.deactivate") : t("common.activate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDateToDelete(specialDate._id)}
                            className="text-red-600 hover:!text-red-600 focus:!text-red-600 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500"
                          >
                            <Trash className="h-4 w-4 mr-2 rtl:ml-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!dateToDelete} onOpenChange={(open) => !open && setDateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workingHours.specialDate.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("workingHours.specialDate.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} variant="destructive">
              {isLoading ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
