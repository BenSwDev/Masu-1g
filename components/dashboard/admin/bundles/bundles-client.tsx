"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { BundleCard } from "./bundle-card"
import { BundleForm } from "./bundle-form"
import type { IBundle } from "@/lib/db/models/bundle"
import { createBundle, updateBundle, deleteBundle, duplicateBundle, toggleBundleStatus } from "@/actions/bundle-actions"
import { Plus, Search, Loader2 } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"

interface BundlesClientProps {
  initialBundles: IBundle[]
  treatments: any[]
  categories: string[]
}

export function BundlesClient({ initialBundles, treatments, categories }: BundlesClientProps) {
  const [bundles, setBundles] = useState<IBundle[]>(initialBundles || [])
  const [filteredBundles, setFilteredBundles] = useState<IBundle[]>(initialBundles || [])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState<IBundle | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Apply filters when bundles, search query, or filters change
  useEffect(() => {
    let filtered = [...bundles]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((bundle) => bundle.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter((bundle) => bundle.category === categoryFilter)
    }

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((bundle) => bundle.isActive)
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((bundle) => !bundle.isActive)
    }

    setFilteredBundles(filtered)
  }, [bundles, searchQuery, categoryFilter, statusFilter])

  // Handle bundle creation
  const handleCreateBundle = async (data: any) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await createBundle(data)
      if (result.success && result.bundle) {
        setBundles((prev) => [result.bundle, ...prev])
        toast({
          title: "חבילה נוצרה בהצלחה",
          description: `החבילה "${data.name}" נוצרה בהצלחה.`,
        })
        return true
      } else {
        setError(result.error || "שגיאה ביצירת חבילה")
        toast({
          title: "שגיאה ביצירת חבילה",
          description: result.error || "אירעה שגיאה. נסה שוב.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("Error creating bundle:", error)
      setError("שגיאה בלתי צפויה ביצירת חבילה")
      toast({
        title: "שגיאה ביצירת חבילה",
        description: "אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Handle bundle update
  const handleUpdateBundle = async (data: any) => {
    if (!selectedBundle) return false

    setIsLoading(true)
    setError(null)
    try {
      const result = await updateBundle(selectedBundle._id.toString(), data)
      if (result.success && result.bundle) {
        setBundles((prev) =>
          prev.map((bundle) => (bundle._id.toString() === selectedBundle._id.toString() ? result.bundle : bundle)),
        )
        toast({
          title: "חבילה עודכנה בהצלחה",
          description: `החבילה "${data.name}" עודכנה בהצלחה.`,
        })
        return true
      } else {
        setError(result.error || "שגיאה בעדכון חבילה")
        toast({
          title: "שגיאה בעדכון חבילה",
          description: result.error || "אירעה שגיאה. נסה שוב.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("Error updating bundle:", error)
      setError("שגיאה בלתי צפויה בעדכון חבילה")
      toast({
        title: "שגיאה בעדכון חבילה",
        description: "אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Handle bundle deletion
  const handleDeleteBundle = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await deleteBundle(id)
      if (result.success) {
        setBundles((prev) => prev.filter((bundle) => bundle._id.toString() !== id))
        toast({
          title: "חבילה נמחקה בהצלחה",
          description: "החבילה נמחקה בהצלחה מהמערכת.",
        })
        return true
      } else {
        setError(result.error || "שגיאה במחיקת חבילה")
        toast({
          title: "שגיאה במחיקת חבילה",
          description: result.error || "אירעה שגיאה. נסה שוב.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("Error deleting bundle:", error)
      setError("שגיאה בלתי צפויה במחיקת חבילה")
      toast({
        title: "שגיאה במחיקת חבילה",
        description: "אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Handle bundle duplication
  const handleDuplicateBundle = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await duplicateBundle(id)
      if (result.success && result.bundle) {
        setBundles((prev) => [result.bundle, ...prev])
        toast({
          title: "חבילה שוכפלה בהצלחה",
          description: `החבילה שוכפלה בהצלחה.`,
        })
        return true
      } else {
        setError(result.error || "שגיאה בשכפול חבילה")
        toast({
          title: "שגיאה בשכפול חבילה",
          description: result.error || "אירעה שגיאה. נסה שוב.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("Error duplicating bundle:", error)
      setError("שגיאה בלתי צפויה בשכפול חבילה")
      toast({
        title: "שגיאה בשכפול חבילה",
        description: "אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Handle bundle status toggle
  const handleToggleBundleStatus = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await toggleBundleStatus(id)
      if (result.success && result.bundle) {
        setBundles((prev) => prev.map((bundle) => (bundle._id.toString() === id ? result.bundle : bundle)))
        toast({
          title: "סטטוס חבילה עודכן",
          description: `החבילה ${result.bundle.isActive ? "הופעלה" : "הושבתה"} בהצלחה.`,
        })
        return true
      } else {
        setError(result.error || "שגיאה בעדכון סטטוס")
        toast({
          title: "שגיאה בעדכון סטטוס",
          description: result.error || "אירעה שגיאה. נסה שוב.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("Error toggling bundle status:", error)
      setError("שגיאה בלתי צפויה בעדכון סטטוס")
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: "אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Open form for editing
  const handleEditBundle = (bundle: IBundle) => {
    setSelectedBundle(bundle)
    setIsFormOpen(true)
  }

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    let success = false
    if (selectedBundle) {
      success = await handleUpdateBundle(data)
    } else {
      success = await handleCreateBundle(data)
    }

    if (success) {
      handleCloseForm()
    }

    return success
  }

  // Close form and reset selected bundle
  const handleCloseForm = () => {
    setIsFormOpen(false)
    setSelectedBundle(undefined)
  }

  // Check if treatments are available
  const hasTreatments = Array.isArray(treatments) && treatments.length > 0
  const hasCategories = Array.isArray(categories) && categories.length > 0

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>שגיאה</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          onClick={() => {
            setSelectedBundle(undefined)
            setIsFormOpen(true)
          }}
          className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600"
          disabled={isLoading || !hasTreatments || !hasCategories}
        >
          {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
          הוסף חבילה חדשה
        </Button>

        <div className="w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש חבילות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-3 pr-10 w-full"
            />
          </div>
        </div>
      </div>

      {(!hasTreatments || !hasCategories) && (
        <Alert className="mb-4">
          <AlertTitle>שים לב</AlertTitle>
          <AlertDescription>
            {!hasTreatments && !hasCategories
              ? "לא ניתן ליצור חבילות כרגע. נדרש להגדיר טיפולים וקטגוריות תחילה."
              : !hasTreatments
                ? "לא ניתן ליצור חבילות כרגע. נדרש להגדיר טיפולים תחילה."
                : "לא ניתן ליצור חבילות כרגע. נדרש להגדיר קטגוריות תחילה."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
          disabled={!hasCategories}
        >
          <option value="">כל הקטגוריות</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="inactive">לא פעיל</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      )}

      {!isLoading && filteredBundles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBundles.map((bundle) => (
            <BundleCard
              key={bundle._id.toString()}
              bundle={bundle}
              onEdit={handleEditBundle}
              onDelete={handleDeleteBundle}
              onDuplicate={handleDuplicateBundle}
              onToggleStatus={handleToggleBundleStatus}
            />
          ))}
        </div>
      ) : (
        !isLoading && (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-gray-500">לא נמצאו חבילות</p>
            {(searchQuery || categoryFilter || statusFilter) && (
              <p className="text-sm text-gray-400 mt-2">נסה לשנות את הסינון או החיפוש</p>
            )}
            {!bundles.length && !searchQuery && !categoryFilter && !statusFilter && hasTreatments && hasCategories && (
              <Button
                onClick={() => {
                  setSelectedBundle(undefined)
                  setIsFormOpen(true)
                }}
                variant="outline"
                className="mt-4"
                disabled={isLoading}
              >
                הוסף חבילה ראשונה
              </Button>
            )}
          </div>
        )
      )}

      <BundleForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        bundle={selectedBundle}
        treatments={treatments || []}
        categories={categories || []}
        isSubmitting={isLoading}
      />
    </div>
  )
}
