"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getAllTreatments, toggleTreatmentStatus, deleteTreatment, duplicateTreatment } from "@/app/dashboard/(user)/(roles)/admin/treatments/actions"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Avatar, AvatarFallback } from "@/components/common/ui/avatar"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/common/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/common/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
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
import { Skeleton } from "@/components/common/ui/skeleton"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Power, 
  PowerOff,
  Stethoscope,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Package,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { TreatmentCreateDialog } from "./treatment-create-dialog"
import { TreatmentEditDialog } from "./treatment-edit-dialog"
import { TreatmentViewDialog } from "./treatment-view-dialog"
import { cn } from "@/lib/utils"

// Types
interface Treatment {
  _id: string
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations: Array<{
    _id: string
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }>
  isActive: boolean
  allowTherapistGenderSelection?: boolean
  createdAt: string
  updatedAt: string
}

interface Filters {
  search: string
  category: string
  pricingType: string
  isActive?: boolean
  sortBy: string
  sortOrder: "asc" | "desc"
}

export function TreatmentsClient() {
  const { t, dir } = useTranslation()
  const { toast } = useToast()

  // State
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "",
    pricingType: "",
    isActive: undefined,
    sortBy: "createdAt",
    sortOrder: "desc"
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [treatmentToDelete, setTreatmentToDelete] = useState<Treatment | null>(null)

  // Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["treatments", filters, currentPage, pageSize],
    queryFn: async () => {
      const result = await getAllTreatments({
        ...filters,
        page: currentPage,
        limit: pageSize
      })
      return result
    },
    refetchOnWindowFocus: false
  })

  // Handlers
  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      setFilters(prev => ({ 
        ...prev, 
        sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" 
      }))
    } else {
      setFilters(prev => ({ 
        ...prev, 
        sortBy: column, 
        sortOrder: "asc" 
      }))
    }
  }

  const handleToggleStatus = async (treatment: Treatment) => {
    try {
      const result = await toggleTreatmentStatus(treatment._id)
      if (result.success) {
        toast({
          title: "הסטטוס עודכן בהצלחה",
          description: result.data?.message || "הסטטוס של הטיפול עודכן",
        })
        refetch()
      } else {
        throw new Error(result.error || "Failed to toggle status")
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הסטטוס",
      })
    }
  }

  const handleDuplicate = async (treatment: Treatment) => {
    try {
      const result = await duplicateTreatment(treatment._id)
      if (result.success) {
        toast({
          title: "הטיפול שוכפל בהצלחה",
          description: "נוצר עותק של הטיפול",
        })
        refetch()
      } else {
        throw new Error(result.error || "Failed to duplicate")
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בשכפול הטיפול",
      })
    }
  }

  const handleDelete = async () => {
    if (!treatmentToDelete) return

    try {
      const result = await deleteTreatment(treatmentToDelete._id)
      if (result.success) {
        toast({
          title: "הטיפול נמחק בהצלחה",
          description: "הטיפול הוסר מהמערכת",
        })
        refetch()
      } else {
        throw new Error(result.error || "Failed to delete")
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הטיפול",
      })
    } finally {
      setTreatmentToDelete(null)
    }
  }

  // Computed values
  const categoryOptions = [
    { value: "", label: "כל הקטגוריות" },
    { value: "massages", label: "עיסויים" },
    { value: "facial_treatments", label: "טיפולי פנים" },
    { value: "other", label: "אחר" }
  ]

  const pricingTypeOptions = [
    { value: "", label: "כל סוגי התמחור" },
    { value: "fixed", label: "מחיר קבוע" },
    { value: "duration_based", label: "לפי משך זמן" }
  ]

  const statusOptions = [
    { value: "", label: "כל הסטטוסים" },
    { value: "true", label: "פעיל" },
    { value: "false", label: "לא פעיל" }
  ]

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "massages": return "עיסויים"
      case "facial_treatments": return "טיפולי פנים"
      default: return "אחר"
    }
  }

  const getPricingTypeLabel = (pricingType: string) => {
    return pricingType === "fixed" ? "מחיר קבוע" : "לפי משך זמן"
  }

  const formatPrice = (treatment: Treatment) => {
    if (treatment.pricingType === "fixed") {
      return `₪${treatment.fixedPrice}`
    } else {
      const activeDurations = treatment.durations.filter(d => d.isActive)
      if (activeDurations.length === 0) return "לא הוגדר"
      const prices = activeDurations.map(d => d.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      return minPrice === maxPrice ? `₪${minPrice}` : `₪${minPrice}-${maxPrice}`
    }
  }

  const formatDuration = (treatment: Treatment) => {
    if (treatment.pricingType === "fixed") {
      return `${treatment.defaultDurationMinutes} דק'`
    } else {
      const activeDurations = treatment.durations.filter(d => d.isActive)
      if (activeDurations.length === 0) return "לא הוגדר"
      const durations = activeDurations.map(d => d.minutes)
      const minDuration = Math.min(...durations)
      const maxDuration = Math.max(...durations)
      return minDuration === maxDuration ? `${minDuration} דק'` : `${minDuration}-${maxDuration} דק'`
    }
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">שגיאה בטעינת הטיפולים</h3>
            <p className="text-muted-foreground mb-4">
              אירעה שגיאה בטעינת רשימת הטיפולים
            </p>
            <Button onClick={() => refetch()}>נסה שוב</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">רשימת טיפולים</h2>
          <p className="text-muted-foreground">
            {data ? `${data.totalTreatments} טיפולים במערכת` : "טוען..."}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          הוסף טיפול חדש
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            סינון וחיפוש
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder="חיפוש טיפולים..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className={`${dir === 'rtl' ? 'pr-10' : 'pl-10'}`}
              />
            </div>

            {/* Category Filter */}
            <Select 
              value={filters.category} 
              onValueChange={(value) => handleFilterChange("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Pricing Type Filter */}
            <Select 
              value={filters.pricingType} 
              onValueChange={(value) => handleFilterChange("pricingType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="סוג תמחור" />
              </SelectTrigger>
              <SelectContent>
                {pricingTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select 
              value={filters.isActive?.toString() || ""} 
              onValueChange={(value) => handleFilterChange("isActive", value === "" ? undefined : value === "true")}
            >
              <SelectTrigger>
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            </div>
          ) : data?.treatments.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">אין טיפולים</h3>
              <p className="text-muted-foreground mb-4">
                לא נמצאו טיפולים התואמים לקריטריונים שנבחרו
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                הוסף טיפול ראשון
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      שם הטיפול
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-2">
                      קטגוריה
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>סוג תמחור</TableHead>
                  <TableHead>מחיר</TableHead>
                  <TableHead>משך זמן</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("isActive")}
                  >
                    <div className="flex items-center gap-2">
                      סטטוס
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-2">
                      תאריך יצירה
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.treatments.map((treatment) => (
                  <TableRow key={treatment._id} className="hover:bg-muted/50">
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {treatment.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{treatment.name}</div>
                        {treatment.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {treatment.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {getCategoryLabel(treatment.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getPricingTypeLabel(treatment.pricingType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{formatPrice(treatment)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDuration(treatment)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={treatment.isActive ? "default" : "secondary"}
                        className={cn(
                          "gap-1",
                          treatment.isActive 
                            ? "bg-green-100 text-green-800 hover:bg-green-200" 
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        )}
                      >
                        {treatment.isActive ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {treatment.isActive ? "פעיל" : "לא פעיל"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(treatment.createdAt).toLocaleDateString('he-IL')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedTreatment(treatment)
                              setIsViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            צפייה
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedTreatment(treatment)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            עריכה
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(treatment)}>
                            {treatment.isActive ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                השבת
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                הפעל
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(treatment)}>
                            <Copy className="h-4 w-4 mr-2" />
                            שכפל
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setTreatmentToDelete(treatment)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            מציג {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, data.totalTreatments)} מתוך {data.totalTreatments} טיפולים
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
              הקודם
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(data.totalPages, prev + 1))}
              disabled={currentPage === data.totalPages}
            >
              הבא
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <TreatmentCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          refetch()
          toast({
            title: "הטיפול נוצר בהצלחה",
            description: "הטיפול החדש נוסף למערכת",
          })
        }}
      />

      {selectedTreatment && (
        <>
          <TreatmentEditDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            treatment={selectedTreatment}
            onSuccess={() => {
              refetch()
              setSelectedTreatment(null)
              toast({
                title: "הטיפול עודכן בהצלחה",
                description: "השינויים נשמרו במערכת",
              })
            }}
          />

          <TreatmentViewDialog
            open={isViewDialogOpen}
            onOpenChange={setIsViewDialogOpen}
            treatment={selectedTreatment}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!treatmentToDelete} onOpenChange={() => setTreatmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת טיפול</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הטיפול "{treatmentToDelete?.name}"?
              פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
