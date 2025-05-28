"use client"

import { useState } from "react"
import { WeeklyHoursSection } from "./weekly-hours-section"
import { SpecialDatesSection } from "./special-dates-section"
import { SpecialDateForm } from "./special-date-form"
import type { IWorkingHours } from "@/lib/db/models/working-hours"
import {
  updateWeeklyHours,
  addSpecialDate,
  updateSpecialDate,
  deleteSpecialDate,
} from "@/actions/working-hours-actions"
import { toast } from "sonner"

interface WorkingHoursClientProps {
  initialData: IWorkingHours
}

export function WorkingHoursClient({ initialData }: WorkingHoursClientProps) {
  const [workingHours, setWorkingHours] = useState<IWorkingHours>(initialData)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDate, setEditingDate] = useState<IWorkingHours["specialDates"][0] | null>(null)

  const handleUpdateWeeklyHours = async (weeklyHours: IWorkingHours["weeklyHours"]) => {
    const result = await updateWeeklyHours(weeklyHours)
    if (result.success) {
      setWorkingHours(result.data)
    } else {
      throw new Error(result.error)
    }
  }

  const handleAddSpecialDate = async (specialDate: Omit<IWorkingHours["specialDates"][0], "_id">) => {
    const result = await addSpecialDate(specialDate)
    if (result.success) {
      setWorkingHours(result.data)
    } else {
      throw new Error(result.error)
    }
  }

  const handleUpdateSpecialDate = async (specialDate: Omit<IWorkingHours["specialDates"][0], "_id">) => {
    if (!editingDate) return

    const result = await updateSpecialDate(editingDate._id, specialDate)
    if (result.success) {
      setWorkingHours(result.data)
    } else {
      throw new Error(result.error)
    }
  }

  const handleDeleteSpecialDate = async (dateId: string) => {
    const result = await deleteSpecialDate(dateId)
    if (result.success) {
      setWorkingHours(result.data)
      toast.success("התאריך נמחק בהצלחה")
    } else {
      toast.error(result.error || "שגיאה במחיקת התאריך")
    }
  }

  const openAddForm = () => {
    setEditingDate(null)
    setIsFormOpen(true)
  }

  const openEditForm = (date: IWorkingHours["specialDates"][0]) => {
    setEditingDate(date)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingDate(null)
  }

  const handleFormSubmit = async (data: Omit<IWorkingHours["specialDates"][0], "_id">) => {
    if (editingDate) {
      await handleUpdateSpecialDate(data)
    } else {
      await handleAddSpecialDate(data)
    }
  }

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <WeeklyHoursSection weeklyHours={workingHours.weeklyHours} onUpdate={handleUpdateWeeklyHours} />

      <SpecialDatesSection
        specialDates={workingHours.specialDates}
        onAdd={openAddForm}
        onEdit={openEditForm}
        onDelete={handleDeleteSpecialDate}
      />

      <SpecialDateForm isOpen={isFormOpen} onClose={closeForm} onSubmit={handleFormSubmit} editingDate={editingDate} />
    </div>
  )
}
