"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Plus, Search } from "lucide-react"
import type { ITreatment } from "@/lib/db/models/treatment"
import { TreatmentCard } from "./treatment-card"
import { TreatmentForm } from "./treatment-form"

interface TreatmentsClientProps {
  initialTreatments: ITreatment[]
}

export function TreatmentsClient({ initialTreatments }: TreatmentsClientProps) {
  const [treatments, setTreatments] = useState<ITreatment[]>(initialTreatments)
  const [filteredTreatments, setFilteredTreatments] = useState<ITreatment[]>(initialTreatments)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pricingTypeFilter, setPricingTypeFilter] = useState<string>("all")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<ITreatment | null>(null)

  useEffect(() => {
    filterTreatments()
  }, [treatments, searchQuery, categoryFilter, statusFilter, pricingTypeFilter])

  const filterTreatments = () => {
    let filtered = [...treatments]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (treatment) =>
          treatment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          treatment.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((treatment) => treatment.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((treatment) => (statusFilter === "active" ? treatment.isActive : !treatment.isActive))
    }

    // Pricing type filter
    if (pricingTypeFilter !== "all") {
      filtered = filtered.filter((treatment) => treatment.pricingType === pricingTypeFilter)
    }

    setFilteredTreatments(filtered)
  }

  const handleAddTreatment = () => {
    setEditingTreatment(null)
    setIsDrawerOpen(true)
  }

  const handleEditTreatment = (treatment: ITreatment) => {
    setEditingTreatment(treatment)
    setIsDrawerOpen(true)
  }

  const handleTreatmentSuccess = (treatment: ITreatment) => {
    if (editingTreatment) {
      // Update existing treatment
      setTreatments((prev) => prev.map((t) => (t._id === treatment._id ? treatment : t)))
    } else {
      // Add new treatment
      setTreatments((prev) => [...prev, treatment])
    }
    setIsDrawerOpen(false)
    setEditingTreatment(null)
  }

  const handleUpdateTreatment = (treatment: ITreatment) => {
    setTreatments((prev) => prev.map((t) => (t._id === treatment._id ? treatment : t)))
  }

  const handleDeleteTreatment = (id: string) => {
    setTreatments((prev) => prev.filter((t) => t._id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">ניהול טיפולים</h1>
          <p className="text-muted-foreground">ניהול וצפייה ברשימת הטיפולים במערכת</p>
        </div>
        <Button onClick={handleAddTreatment} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 ml-2" />
          הוסף טיפול חדש
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או תיאור..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="קטגוריה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            <SelectItem value="massages">עיסויים</SelectItem>
            <SelectItem value="facial_treatments">טיפולי פנים</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="active">פעיל</SelectItem>
            <SelectItem value="inactive">לא פעיל</SelectItem>
          </SelectContent>
        </Select>

        <Select value={pricingTypeFilter} onValueChange={setPricingTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="סוג תמחור" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל סוגי התמחור</SelectItem>
            <SelectItem value="fixed">מחיר קבוע</SelectItem>
            <SelectItem value="duration_based">לפי זמנים</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Treatments Grid */}
      {filteredTreatments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">לא נמצאו טיפולים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTreatments.map((treatment) => (
            <TreatmentCard
              key={treatment._id}
              treatment={treatment}
              onEdit={handleEditTreatment}
              onUpdate={handleUpdateTreatment}
              onDelete={handleDeleteTreatment}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{editingTreatment ? "עריכת טיפול" : "הוספת טיפול חדש"}</DrawerTitle>
            <DrawerDescription>
              {editingTreatment
                ? 'ערוך את פרטי הטיפול ולחץ על "עדכן טיפול"'
                : 'מלא את פרטי הטיפול החדש ולחץ על "צור טיפול"'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            <TreatmentForm
              treatment={editingTreatment}
              onSuccess={handleTreatmentSuccess}
              onCancel={() => setIsDrawerOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
