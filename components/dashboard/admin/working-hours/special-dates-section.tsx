"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Edit, Trash2, Clock, Search } from "lucide-react"
import type { IWorkingHours } from "@/lib/db/models/working-hours"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SpecialDatesSectionProps {
  specialDates: IWorkingHours["specialDates"]
  onAdd: () => void
  onEdit: (date: IWorkingHours["specialDates"][0]) => void
  onDelete: (dateId: string) => Promise<void>
}

export function SpecialDatesSection({ specialDates, onAdd, onEdit, onDelete }: SpecialDatesSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"all" | "active" | "inactive">("all")

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

  // סינון תאריכים לפי חיפוש ומצב פעילות
  const filteredDates = specialDates.filter((date) => {
    const matchesSearch =
      date.name.includes(searchTerm) ||
      (date.description && date.description.includes(searchTerm)) ||
      format(new Date(date.date), "dd/MM/yyyy").includes(searchTerm)

    if (viewMode === "all") return matchesSearch
    if (viewMode === "active") return matchesSearch && date.isActive
    if (viewMode === "inactive") return matchesSearch && !date.isActive

    return matchesSearch
  })

  // מיון תאריכים לפי תאריך (מהקרוב לרחוק)
  const sortedDates = [...filteredDates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // קבוצות תאריכים לפי חודש
  const groupedDates: Record<string, typeof sortedDates> = {}
  sortedDates.forEach((date) => {
    const monthYear = format(new Date(date.date), "MMMM yyyy", { locale: he })
    if (!groupedDates[monthYear]) {
      groupedDates[monthYear] = []
    }
    groupedDates[monthYear].push(date)
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5" />
            תאריכים מיוחדים
          </CardTitle>
          <Button onClick={onAdd} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">
            <Plus className="h-4 w-4 ml-1" />
            הוסף תאריך מיוחד
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש תאריכים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-3 pr-8"
            />
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs px-2">
                הכל
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs px-2">
                פעילים
              </TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs px-2">
                לא פעילים
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {sortedDates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>לא נמצאו תאריכים מיוחדים</p>
            <Button onClick={onAdd} variant="outline" className="mt-4">
              הוסף תאריך ראשון
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDates).map(([monthYear, dates]) => (
              <div key={monthYear} className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground mb-2">{monthYear}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dates.map((date) => (
                    <Card
                      key={date._id}
                      className={`border-2 ${date.isActive ? "border-teal-500" : "border-gray-200"} hover:shadow-md transition-all`}
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={date.isActive ? "default" : "secondary"}
                                className={date.isActive ? "bg-teal-500" : ""}
                              >
                                {format(new Date(date.date), "dd/MM/yyyy")}
                              </Badge>
                              {!date.isActive && <Badge variant="outline">לא פעיל</Badge>}
                            </div>
                            <h3 className="font-medium mt-1">{date.name}</h3>
                            {date.description && (
                              <p className="text-xs text-muted-foreground mt-1">{date.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(date)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500"
                              onClick={() => handleDelete(date._id)}
                              disabled={deletingId === date._id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {date.isActive && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="outline" className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {date.startTime} - {date.endTime}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {formatPriceAdjustment(date.priceAdjustment)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
