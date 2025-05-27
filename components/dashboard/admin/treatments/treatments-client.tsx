"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { Plus, Search } from "lucide-react"
import { TreatmentCard } from "./treatment-card"
import { TreatmentForm } from "./treatment-form"
import type { ITreatment } from "@/lib/db/models/treatment"
import { getTreatments } from "@/actions/treatment-actions"
import { toast } from "@/components/ui/use-toast"

export function TreatmentsClient() {
  const [treatments, setTreatments] = useState<ITreatment[]>([])
  const [filteredTreatments, setFilteredTreatments] = useState<ITreatment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pricingFilter, setPricingFilter] = useState<string>("all")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<ITreatment | null>(null)

  useEffect(() => {
    const fetchTreatments = async () => {
      setIsLoading(true)
      try {
        const result = await getTreatments()
        if (result.success) {
          setTreatments(result.treatments)
          setFilteredTreatments(result.treatments)
        } else {
          toast({
            title: "שגיאה בטעינת הטיפולים",
            description: result.error,
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "שגיאה בטעינת הטיפולים",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTreatments()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, categoryFilter, statusFilter, pricingFilter, treatments])

  const applyFilters = () => {
    let filtered = [...treatments]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((treatment) => treatment.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((treatment) => treatment.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active"
      filtered = filtered.filter((treatment) => treatment.isActive === isActive)
    }

    // Pricing filter
    if (pricingFilter !== "all") {
      filtered = filtered.filter((treatment) => treatment.pricingType === pricingFilter)
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

  const handleTreatmentSaved = (treatment: ITreatment) => {
    if (editingTreatment) {
      // Update existing treatment
      setTreatments((prev) => prev.map((t) => (t._id === treatment._id ? treatment : t)))
    } else {
      // Add new treatment
      setTreatments((prev) => [...prev, treatment])
    }
    setIsDrawerOpen(false)
  }

  const handleTreatmentUpdated = (updatedTreatment: ITreatment) => {
    setTreatments((prev) => prev.map((t) => (t._id === updatedTreatment._id ? updatedTreatment : t)))
  }

  const handleTreatmentDuplicated = (newTreatment: ITreatment) => {
    setTreatments((prev) => [...prev, newTreatment])
  }

  const handleTreatmentDeleted = (id: string) => {
    setTreatments((prev) => prev.filter((t) => t._id !== id))
  }

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Button onClick={handleAddTreatment} className="bg-teal-500 hover:bg-teal-600 w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2" />
          הוסף טיפול חדש
        </Button>

        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש טיפולים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                <SelectItem value="massages">עיסויים</SelectItem>
                <SelectItem value="facial_treatments">טיפולי פנים</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="inactive">לא פעיל</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pricingFilter} onValueChange={setPricingFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="תמחור" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל סוגי התמחור</SelectItem>
                <SelectItem value="fixed">מחיר קבוע</SelectItem>
                <SelectItem value="duration_based">לפי זמנים</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredTreatments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">לא נמצאו טיפולים</h3>
          <p className="text-muted-foreground">נסה לשנות את הפילטרים או להוסיף טיפול חדש</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTreatments.map((treatment) => (
            <TreatmentCard
              key={treatment._id}
              treatment={treatment}
              onEdit={handleEditTreatment}
              onUpdate={handleTreatmentUpdated}
              onDuplicate={handleTreatmentDuplicated}
              onDelete={handleTreatmentDeleted}
            />
          ))}
        </div>
      )}

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{editingTreatment ? "עריכת טיפול" : "הוספת טיפול חדש"}</DrawerTitle>
            <DrawerDescription>
              {editingTreatment ? "ערוך את פרטי הטיפול הקיים" : "הוסף טיפול חדש למערכת"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto">
            <TreatmentForm
              treatment={editingTreatment}
              onSave={handleTreatmentSaved}
              onCancel={() => setIsDrawerOpen(false)}
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">סגור</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
