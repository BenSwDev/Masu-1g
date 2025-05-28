"use client"

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
import { PlusIcon, ClockIcon, Edit, Trash, Power } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"

interface SpecialDatesSectionProps {
  specialDates: any[]
  onRefresh: () => void
}

export function SpecialDatesSection({ specialDates, onRefresh }: SpecialDatesSectionProps) {
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

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      setIsLoading(true)
      await toggleSpecialDateStatus(id)
      onRefresh()
      toast({
        title: isActive
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":")
    return `${hours}:${minutes}`
  }

  // Filter special dates by selected date if any
  const filteredDates = selectedDate
    ? specialDates.filter((date) => {
        const specialDate = new Date(date.date)
        return (
          specialDate.getDate() === selectedDate.getDate() &&
          specialDate.getMonth() === selectedDate.getMonth() &&
          specialDate.getFullYear() === selectedDate.getFullYear()
        )
      })
    : specialDates

  // Get all dates that have special dates for highlighting in calendar
  const specialDatesArray = specialDates.map((date) => new Date(date.date))

  if (isAddingDate) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">{t("workingHours.specialDate.addNew")}</h2>
        <SpecialDateForm onSuccess={handleAddSuccess} onCancel={handleCancel} />
      </div>
    )
  }

  if (editingDate) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">{t("workingHours.specialDate.edit")}</h2>
        <SpecialDateForm specialDate={editingDate} onSuccess={handleEditSuccess} onCancel={handleCancel} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground">{t("workingHours.specialDate.description")}</p>
        <Button onClick={() => setIsAddingDate(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("workingHours.specialDate.addNew")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("workingHours.specialDate.calendar")}</CardTitle>
            <CardDescription>{t("workingHours.specialDate.calendarDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                specialDate: specialDatesArray,
              }}
              modifiersStyles={{
                specialDate: {
                  fontWeight: "bold",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  borderRadius: "0",
                },
              }}
            />
          </CardContent>
          <CardFooter>
            {selectedDate && (
              <Button variant="outline" onClick={() => setSelectedDate(undefined)} className="w-full">
                {t("workingHours.specialDate.clearSelection")}
              </Button>
            )}
          </CardFooter>
        </Card>

        <div className="col-span-1 lg:col-span-2">
          <h3 className="text-lg font-medium mb-4">
            {selectedDate
              ? `${t("workingHours.specialDate.selectedDate")}: ${new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(selectedDate)}`
              : t("workingHours.specialDate.allDates")}
          </h3>

          {filteredDates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {selectedDate
                    ? t("workingHours.specialDate.noSpecialDatesForSelection")
                    : t("workingHours.specialDate.noSpecialDates")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDates.map((specialDate) => (
                <Card key={specialDate._id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{specialDate.name}</CardTitle>
                      <Badge variant={specialDate.isActive ? "default" : "outline"}>
                        {specialDate.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </div>
                    <CardDescription>{formatDate(specialDate.date)}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {specialDate.description && (
                      <p className="text-sm text-muted-foreground mb-4">{specialDate.description}</p>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      <span>
                        {formatTime(specialDate.startTime)} - {formatTime(specialDate.endTime)}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {t("common.actions")}
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
                        <DropdownMenuItem onClick={() => setDateToDelete(specialDate._id)} className="text-red-600">
                          <Trash className="h-4 w-4 mr-2" />
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
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
              {isLoading ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
