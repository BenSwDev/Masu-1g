"use client"

import { useCallback, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  X,
  SortAsc,
  SortDesc,
  Users,
  Calendar,
  Mail,
  Phone
} from "lucide-react"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { ProfessionalStats } from "@/lib/types/professional"

interface ProfessionalFiltersProps {
  // Current filter values
  searchTerm: string
  statusFilter: ProfessionalStatus | "all"
  sortBy: string
  sortOrder: "asc" | "desc"
  
  // Stats for filter counts
  stats: ProfessionalStats
  
  // Loading states
  loading?: boolean
  refreshing?: boolean
  
  // Callbacks
  onSearchChange: (term: string) => void
  onStatusFilterChange: (status: ProfessionalStatus | "all") => void
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void
  onRefresh: () => void
  onCreateNew: () => void
  
  // Additional props
  className?: string
}

export function ProfessionalFilters({
  searchTerm,
  statusFilter,
  sortBy,
  sortOrder,
  stats,
  loading = false,
  refreshing = false,
  onSearchChange,
  onStatusFilterChange,
  onSortChange,
  onRefresh,
  onCreateNew,
  className = ""
}: ProfessionalFiltersProps) {
  const { t, dir } = useTranslation()

  // Status filter options with counts
  const statusOptions = useMemo(() => {
    const byStatus = stats.byStatus || {}
    
    return [
      {
        value: "all",
        label: "כל הסטטוסים",
        count: stats.total || 0,
        color: "text-blue-600"
      },
      {
        value: "active",
        label: "פעילים",
        count: byStatus.active || 0,
        color: "text-green-600"
      },
      {
        value: "pending_admin_approval",
        label: "ממתינים לאישור מנהל",
        count: byStatus.pending_admin_approval || 0,
        color: "text-orange-600"
      },
      {
        value: "pending_user_action",
        label: "ממתינים לפעולת משתמש",
        count: byStatus.pending_user_action || 0,
        color: "text-blue-600"
      },
      {
        value: "rejected",
        label: "נדחו",
        count: byStatus.rejected || 0,
        color: "text-red-600"
      },
      {
        value: "suspended",
        label: "מושהים",
        count: byStatus.suspended || 0,
        color: "text-gray-600"
      }
    ]
  }, [stats])

  // Sort options
  const sortOptions = [
    { value: "createdAt", label: "תאריך הצטרפות", icon: Calendar },
    { value: "name", label: "שם המטפל", icon: Users },
    { value: "email", label: "כתובת אימייל", icon: Mail },
    { value: "appliedAt", label: "תאריך הגשה", icon: Calendar },
    { value: "status", label: "סטטוס", icon: Filter }
  ]

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: string) => {
    if (newSortBy === sortBy) {
      // Toggle sort order if same field
      onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc")
    } else {
      // New field, default to descending
      onSortChange(newSortBy, "desc")
    }
  }, [sortBy, sortOrder, onSortChange])

  // Get current sort option
  const currentSortOption = sortOptions.find(option => option.value === sortBy)

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count++
    if (statusFilter !== "all") count++
    return count
  }, [searchTerm, statusFilter])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onSearchChange("")
    onStatusFilterChange("all")
    onSortChange("createdAt", "desc")
  }, [onSearchChange, onStatusFilterChange, onSortChange])

  return (
    <Card className={`border-0 shadow-sm ${className}`} dir={dir}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">מסננים וחיפוש</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} פילטרים פעילים
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                נקה הכל
              </Button>
            )}
            
            <Button 
              onClick={onRefresh} 
              disabled={refreshing || loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              רענן
            </Button>

            <Button onClick={onCreateNew} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              הוסף מטפל
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חפש לפי שם, אימייל או טלפון..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pr-10"
              disabled={loading}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => onSearchChange("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={onStatusFilterChange} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="בחר סטטוס" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    <Badge variant="outline" className={`ml-2 text-xs ${option.color}`}>
                      {option.count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={handleSortChange} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="מיין לפי" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => {
                const Icon = option.icon
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                      {option.value === sortBy && (
                        <div className="mr-2">
                          {sortOrder === "asc" ? (
                            <SortAsc className="w-3 h-3" />
                          ) : (
                            <SortDesc className="w-3 h-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <span className="text-sm text-muted-foreground">פילטרים פעילים:</span>
            
            {searchTerm.trim() && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Search className="w-3 h-3" />
                חיפוש: {searchTerm}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => onSearchChange("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Filter className="w-3 h-3" />
                סטטוס: {statusOptions.find(s => s.value === statusFilter)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => onStatusFilterChange("all")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <div>
            {loading ? (
              <span>טוען נתונים...</span>
            ) : (
              <span>
                מציג {stats.total || 0} מטפלים
                {searchTerm && ` (מתוך חיפוש: "${searchTerm}")`}
              </span>
            )}
          </div>
          
          {currentSortOption && (
            <div className="flex items-center gap-2">
              <span>מסודר לפי:</span>
              <Badge variant="outline" className="flex items-center gap-1">
                <currentSortOption.icon className="w-3 h-3" />
                {currentSortOption.label}
                {sortOrder === "asc" ? (
                  <SortAsc className="w-3 h-3" />
                ) : (
                  <SortDesc className="w-3 h-3" />
                )}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 