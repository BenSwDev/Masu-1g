"use client"

import type React from "react"

import { useState } from "react"
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
import { PlusIcon, ClockIcon, Edit, Trash, Power, TagIcon, PercentIcon, Info } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"

interface SpecialDatesSectionProps {
  specialDates: any[]
  weeklyHours: any[] // Add this prop
  onRefresh: () => void
}

export function SpecialDatesSection({ specialDates, weeklyHours, onRefresh }: SpecialDatesSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isAddingDate, setIsAddingDate] = useState(false)
  const [editingDate, setEditingDate] = useState<any>(null)
  const [dateToDelete, setDateToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const handleAddSuccess = () => {
    setIsAddingDate(false)
    onRefresh()
    toast({
      title: t("workingHours.specialDate.createSuccess"),
      variant: "success",
    })
  }

  const handleEditSuccess = () => {
    setEditingDate(null)
    onRefresh()
    toast({
      title: t("workingHours.specialDate.updateSuccess"),
      variant: "success",
    })
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
    const date = new Date(dateString)
    return new Intl.DateTimeFormat((t("common.locale") as string) || "en-US", {
      // Use locale from translations
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  const formatTime = (timeString: string) => {
    if (!timeString || !timeString.includes(":")) return t("common.notSet")
    const [hours, minutes] = timeString.split(":")
    return `${hours}:${minutes}`
  }

  const filteredDates = selectedDate
    ? specialDates.filter((date) => {
        const specialDateObj = new Date(date.date)
        return (
          specialDateObj.getDate() === selectedDate.getDate() &&
          specialDateObj.getMonth() === selectedDate.getMonth() &&
          specialDateObj.getFullYear() === selectedDate.getFullYear()
        )
      })
    : specialDates

  const specialDatesForCalendar = specialDates.map((date) => new Date(date.date))

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
        <CardTitle>{t("workingHours.specialDates")}</CardTitle>
        <Button onClick={() => setIsAddingDate(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("workingHours.specialDate.addNew")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("workingHours.specialDate.sectionDescription")}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("workingHours.specialDate.calendarTitle")}</CardTitle>
            <CardDescription>{t("workingHours.specialDate.calendarDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                special: specialDatesForCalendar,
              }}
              modifiersStyles={{
                special: {
                  fontWeight: "bold",
                  backgroundColor: "hsl(var(--primary) / 0.1)",
                  color: "hsl(var(--primary))",
                  borderRadius: "var(--radius)",
                },
              }}
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
          <h3 className="text-lg font-medium">
            {selectedDate
              ? `${t("workingHours.specialDate.eventsFor")}: ${formatDateDisplay(selectedDate.toISOString())}`
              : t("workingHours.specialDate.allEvents")}
          </h3>

          {filteredDates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
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
                  <Card key={specialDate._id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{specialDate.name}</CardTitle>
                        <Badge variant={specialDate.isActive ? "default" : "outline"}>
                          {specialDate.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </div>
                      <CardDescription>{formatDateDisplay(specialDate.date)}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 space-y-2 flex-grow">
                      {specialDate.description && (
                        <p className="text-sm text-muted-foreground">{specialDate.description}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <ClockIcon className="h-4 w-4 me-2 flex-shrink-0" />
                        <span>
                          {isTimeNotSet ? (
                            t("common.notSet")
                          ) : (
                            <>
                              {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
                              {areHoursInherited &&
                                specialDate.isActive && ( // Show indicator only if active and inherited
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 ms-1 text-muted-foreground inline-block cursor-help" />
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
                      {specialDate.priceAdjustment && (
                        <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                          <p className="font-medium text-foreground mb-1">{t("workingHours.priceAdjustment.title")}:</p>
                          <div className="flex items-center">
                            {specialDate.priceAdjustment.type === "percentage" ? (
                              <PercentIcon className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                            ) : (
                              <TagIcon className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
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
                                    <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                                    <p className="truncate italic">{specialDate.priceAdjustment.reason}</p>
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
                    <CardFooter className="flex justify-end space-x-2 border-t pt-3 mt-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {t("common.actions")}
                            <ChevronDownIcon className="h-4 w-4 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDate(specialDate)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(specialDate._id, specialDate.isActive)}>
                            <Power className="h-4 w-4 mr-2" />
                            {specialDate.isActive ? t("common.deactivate") : t("common.activate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDateToDelete(specialDate._id)}
                            className="text-red-500 hover:!text-red-500 focus:!text-red-500"
                          >
                            <Trash className="h-4 w-4 mr-2" />
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
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
              {isLoading ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Helper icon, you might want to put this in a shared icons file
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
)
