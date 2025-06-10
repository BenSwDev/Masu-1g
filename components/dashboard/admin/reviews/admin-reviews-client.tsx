"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getAdminReviewColumns } from "./admin-reviews-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import type { PopulatedReview } from "@/types/review"
import { Heading } from "@/components/common/ui/heading"
import { getAllReviews } from "@/actions/review-actions"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Search, RefreshCw, Filter, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/common/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Separator } from "@/components/common/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import ReviewDetailModal from "./review-detail-modal"

/**
 * Admin Reviews Client Component
 * Displays all reviews in the system with admin controls
 */
export default function AdminReviewsClient() {
  const { t, language, dir } = useTranslation()
  
  // Search and filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [responseFilter, setResponseFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("with-reviews")
  
  // UI state
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedReview, setSelectedReview] = useState<PopulatedReview | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Debounce search term for real-time searching
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, ratingFilter, responseFilter, activeTab])

  // Determine filters based on active tab
  const getFiltersForTab = () => {
    const baseFilters = {
      search: debouncedSearchTerm || undefined,
      rating: ratingFilter === "all" ? undefined : parseInt(ratingFilter),
      page: currentPage,
      limit: 20,
    }

    if (activeTab === "with-reviews") {
      return baseFilters
    } else {
      // For without-reviews tab, we'll handle this differently
      return baseFilters
    }
  }

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<
    { reviews: PopulatedReview[]; totalPages: number; totalReviews: number },
    Error
  >({
    queryKey: ["adminReviews", language, debouncedSearchTerm, ratingFilter, responseFilter, activeTab, currentPage],
    queryFn: () => getAllReviews(getFiltersForTab()),
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
    enabled: activeTab === "with-reviews", // Only fetch when on reviews tab
  })

  const handleRowClick = (review: PopulatedReview) => {
    setSelectedReview(review)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedReview(null)
  }

  const columns = useMemo(() => getAdminReviewColumns(t, language, handleRowClick), [t, language])

  const handleRefresh = () => {
    refetch()
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setRatingFilter("all")
    setResponseFilter("all")
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (ratingFilter !== "all") count++
    if (responseFilter !== "all") count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  const renderContent = () => {
    if (activeTab === "without-reviews") {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {t("adminReviews.withoutReviewsNote")}
          </p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <>
          <BookingsTableSkeleton />
          <p className="mt-4 text-center text-muted-foreground">{t("common.loading")}</p>
        </>
      )
    }

    if (error) {
      return (
        <div className="text-center text-red-500">
          <p>
            {t("common.error")}: {error.message}
          </p>
        </div>
      )
    }

    return (
      <>
        <DataTable
          columns={columns}
          data={data?.reviews || []}
          searchPlaceholder={t("adminReviews.searchPlaceholder")}
          emptyMessage={t("adminReviews.noReviews")}
          totalPages={data?.totalPages || 1}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        
        {data && data.totalReviews > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {t("adminReviews.totalReviews", { count: data.totalReviews })}
          </div>
        )}
      </>
    )
  }

  return (
    <div dir={dir}>
      <div className="mb-6 text-center md:text-right">
        <h2 className="text-3xl font-bold tracking-tight">{t("adminReviews.title")}</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="with-reviews">
            {t("adminReviews.tabs.withReviews")}
          </TabsTrigger>
          <TabsTrigger value="without-reviews">
            {t("adminReviews.tabs.withoutReviews")}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="with-reviews" className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="space-y-4">
            {/* Main search bar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("adminReviews.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      {t("adminReviews.filters")}
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{t("adminReviews.advancedFilters")}</h4>
                        {activeFiltersCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                            <X className="h-4 w-4 mr-1" />
                            {t("common.clearAll")}
                          </Button>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Rating Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("adminReviews.filterByRating")}</label>
                        <Select value={ratingFilter} onValueChange={setRatingFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("adminReviews.allRatings")}</SelectItem>
                            <SelectItem value="5">5 {t("adminReviews.stars")}</SelectItem>
                            <SelectItem value="4">4 {t("adminReviews.stars")}</SelectItem>
                            <SelectItem value="3">3 {t("adminReviews.stars")}</SelectItem>
                            <SelectItem value="2">2 {t("adminReviews.stars")}</SelectItem>
                            <SelectItem value="1">1 {t("adminReviews.star")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Response Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("adminReviews.filterByResponse")}</label>
                        <Select value={responseFilter} onValueChange={setResponseFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("adminReviews.allResponses")}</SelectItem>
                            <SelectItem value="with">{t("adminReviews.withResponse")}</SelectItem>
                            <SelectItem value="without">{t("adminReviews.withoutResponse")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("common.refresh")}
                </Button>
              </div>
            </div>
          </div>
          
          {renderContent()}
        </TabsContent>
        
        <TabsContent value="without-reviews" className="space-y-4">
          {renderContent()}
        </TabsContent>
      </Tabs>

      {/* Review Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          onUpdate={handleRefresh}
        />
      )}
    </div>
  )
} 