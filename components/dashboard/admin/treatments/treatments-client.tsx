"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Search, Filter } from "lucide-react"
import { TreatmentCard } from "./treatment-card"
import { TreatmentForm } from "./treatment-form"
import type { ITreatment } from "@/lib/db/models/treatment"
import { getTreatments } from "@/actions/treatment-actions"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"

export function TreatmentsClient() {
  const [treatments, setTreatments] = useState<ITreatment[]>([])
  const [filteredTreatments, setFilteredTreatments] = useState<ITreatment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pricingFilter, setPricingFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<ITreatment | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeView, setActiveView] = useState<"grid" | "list">("grid")

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
    setIsDialogOpen(true)
  }

  const handleEditTreatment = (treatment: ITreatment) => {
    setEditingTreatment(treatment)
    setIsDialogOpen(true)
  }

  const handleTreatmentSaved = (treatment: ITreatment) => {
    if (editingTreatment) {
      // Update existing treatment
      setTreatments((prev) => prev.map((t) => (t._id === treatment._id ? treatment : t)))
    } else {
      // Add new treatment
      setTreatments((prev) => [...prev, treatment])
    }
    setIsDialogOpen(false)
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

  const getCategoryName = (category: string) => {
    switch (category) {
      case "massages":
        return "עיסויים"
      case "facial_treatments":
        return "טיפולי פנים"
      default:
        return category
    }
  }

  const getStatusName = (status: boolean) => {
    return status ? "פעיל" : "לא פעיל"
  }

  const getPricingTypeName = (type: string) => {
    switch (type) {
      case "fixed":
        return "מחיר קבוע"
      case "duration_based":
        return "לפי זמנים"
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Button onClick={handleAddTreatment} className="bg-teal-500 hover:bg-teal-600 w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2" />
          הוסף טיפול חדש
        </Button>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש טיפולים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 w-full"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden"
            aria-label="סינון"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showFilters || window.innerWidth >= 640 ? (
        <div className="flex flex-wrap gap-2 w-full">
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
      ) : null}

      <Tabs defaultValue="grid" className="w-full" onValueChange={(value) => setActiveView(value as "grid" | "list")}>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {filteredTreatments.length} טיפולים{" "}
            {filteredTreatments.length !== treatments.length && `(מתוך ${treatments.length})`}
          </div>
          <TabsList>
            <TabsTrigger value="grid">גריד</TabsTrigger>
            <TabsTrigger value="list">רשימה</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grid" className="mt-0">
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
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredTreatments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">לא נמצאו טיפולים</h3>
              <p className="text-muted-foreground">נסה לשנות את הפילטרים או להוסיף טיפול חדש</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTreatments.map((treatment) => (
                <Card key={treatment._id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex flex-col">
                        <div className="font-medium">{treatment.name}</div>
                        <div className="text-sm text-muted-foreground">{getCategoryName(treatment.category)}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm hidden md:block">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${
                              treatment.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {getStatusName(treatment.isActive)}
                          </span>
                        </div>
                        <div className="text-sm hidden md:block">
                          <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                            {getPricingTypeName(treatment.pricingType)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTreatment(treatment)}
                            className="h-8 px-2"
                          >
                            ערוך
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTreatment ? "עריכת טיפול" : "הוספת טיפול חדש"}</DialogTitle>
            <DialogDescription>
              {editingTreatment ? "ערוך את פרטי הטיפול הקיים" : "הוסף טיפול חדש למערכת"}
            </DialogDescription>
          </DialogHeader>
          <TreatmentForm
            treatment={editingTreatment}
            onSuccess={handleTreatmentSaved}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
