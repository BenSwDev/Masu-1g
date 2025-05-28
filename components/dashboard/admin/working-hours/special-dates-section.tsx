"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Edit, Trash2, Clock } from "lucide-react"
import type { IWorkingHours } from "@/lib/db/models/working-hours"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface SpecialDatesSectionProps {
  specialDates: IWorkingHours["specialDates"]
  onAdd: () => void
  onEdit: (date: IWorkingHours["specialDates"][0]) => void
  onDelete: (dateId: string) => Promise<void>
}

export function SpecialDatesSection({ specialDates, onAdd, onEdit, onDelete }: SpecialDatesSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (dateId: string) => {
    setDeletingId(dateId)
    try {
      await onDelete(dateId)
    } finally {
      setDeletingId(null)
    }
  }

  const formatPriceAdjustment = (adjustment?: IWorkingHours["specialDates"][0]["priceAdjustment"]) => {
    if (!adjustment) return "ללא תוספת"

    if (adjustment.type === "percentage") {
      return `+${adjustment.value}%`
    } else {
      return `+₪${adjustment.value}`
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            תאריכים מיוחדים
          </CardTitle>
          <Button onClick={onAdd} size="sm">
            <Plus className="h-4 w-4 ml-2" />
            הוסף תאריך מיוחד
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {specialDates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>לא הוגדרו תאריכים מיוחדים</p>
            <Button onClick={onAdd} variant="outline" className="mt-4">
              הוסף תאריך ראשון
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {specialDates.map((date) => (
              <div key={date._id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{date.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(date.date), "dd/MM/yyyy", { locale: he })}
                    </p>
                    {date.description && <p className="text-sm text-muted-foreground mt-1">{date.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(date)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(date._id)}
                      disabled={deletingId === date._id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {date.isActive ? (
                    <>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {date.startTime} - {date.endTime}
                      </Badge>
                      <Badge variant="outline">{formatPriceAdjustment(date.priceAdjustment)}</Badge>
                      {date.priceAdjustment?.reason && <Badge variant="outline">{date.priceAdjustment.reason}</Badge>}
                    </>
                  ) : (
                    <Badge variant="destructive">לא פעיל</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
