"use client"

import { Suspense } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/common/ui/button"

// Import our new components
import { useProfessionalManagement } from "./hooks/use-professional-management"
import { ProfessionalStats, DetailedProfessionalStats } from "./components/ProfessionalStats"
import { ProfessionalFilters } from "./components/ProfessionalFilters"
import { ProfessionalTable } from "./components/ProfessionalTable"

// Import types
import type { 
  Professional, 
  ProfessionalStats as ProfessionalStatsType,
  ProfessionalManagementProps 
} from "@/lib/types/professional"

/**
 * Main Professional Management Component
 * 
 * This is the new, refactored main component that uses all the modular components
 * and the custom hook for state management.
 */
export function ProfessionalManagement({ 
  initialProfessionals = [], 
  totalPages = 1, 
  currentPage = 1, 
  initialSearch = "",
  initialStats = { total: 0, active: 0, byStatus: {} }
}: ProfessionalManagementProps) {
  const { t, dir } = useTranslation()

  // Use our custom hook for all state management
  const {
    professionals,
    stats,
    pagination,
    loading,
    refreshing,
    error,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    setSearchTerm,
    setStatusFilter,
    setSortBy,
    setSortOrder,
    refreshData,
    loadPage,
    updateProfessional,
    navigateToEdit,
    navigateToCreate
  } = useProfessionalManagement({
    initialProfessionals,
    initialStats,
    initialPage: currentPage,
    initialSearch
  })

  // Handle professional click
  const handleProfessionalClick = (professional: Professional) => {
    navigateToEdit(professional._id)
  }

  // Handle sort change
  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6" dir={dir}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              נסה שוב
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProfessionalStats 
            stats={stats}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-1">
          <DetailedProfessionalStats 
            stats={stats}
            loading={loading}
          />
        </div>
      </div>

      {/* Filters Section */}
      <ProfessionalFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        stats={stats}
        loading={loading}
        refreshing={refreshing}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onSortChange={handleSortChange}
        onRefresh={refreshData}
        onCreateNew={navigateToCreate}
      />

      {/* Table Section */}
      <ProfessionalTable
        professionals={professionals}
        pagination={pagination}
        loading={loading}
        onProfessionalClick={handleProfessionalClick}
        onPageChange={loadPage}
      />
    </div>
  )
}

/**
 * Loading component for the professional management page
 */
export function ProfessionalManagementLoading() {
  const { dir } = useTranslation()
  
  return (
    <div className="space-y-6" dir={dir}>
      {/* Stats Loading */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`stats-loading-${index}`} className="p-6 border rounded-lg space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`detailed-stats-loading-${index}`} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Loading */}
      <div className="p-6 border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Table Loading */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`table-header-${index}`} className="h-4 w-20" />
            ))}
          </div>
        </div>
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`table-row-loading-${index}`} className="p-4 border-b last:border-b-0">
              <div className="grid grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Error boundary component for professional management
 */
interface ProfessionalManagementErrorProps {
  error: Error
  reset: () => void
}

export function ProfessionalManagementError({ 
  error, 
  reset 
}: ProfessionalManagementErrorProps) {
  const { t, dir } = useTranslation()
  
  return (
    <div className="space-y-6" dir={dir}>
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">אירעה שגיאה בטעינת נתוני המטפלים</h3>
              <p className="text-sm">
                {error.message || "שגיאה לא צפויה. אנא נסה שוב או פנה לתמיכה טכנית."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={reset}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                נסה שוב
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                רענן את הדף
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
      
      {/* Fallback content */}
      <ProfessionalManagementLoading />
    </div>
  )
}

/**
 * Professional Management with Suspense wrapper
 */
interface ProfessionalManagementWrapperProps extends ProfessionalManagementProps {
  fallback?: React.ReactNode
}

export function ProfessionalManagementWrapper({
  fallback = <ProfessionalManagementLoading />,
  ...props
}: ProfessionalManagementWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      <ProfessionalManagement {...props} />
    </Suspense>
  )
}

// Export default
export default ProfessionalManagement 