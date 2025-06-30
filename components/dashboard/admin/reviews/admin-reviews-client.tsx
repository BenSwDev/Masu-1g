"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getAdminReviewColumns } from "./admin-reviews-columns"
import { DataTable } from "@/components/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import type { PopulatedReview } from "@/types/review"
import { Heading } from "@/components/ui/heading"
import { getAllReviews } from "@/actions/review-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, RefreshCw, Filter, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReviewDetailModal from "./review-detail-modal"
import { toast } from "sonner"

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

  const { data, isLoading, error, refetch } = useQuery<
    { reviews: PopulatedReview[]; totalPages: number; totalReviews: number },
    Error
  >({
    queryKey: [
      "adminReviews",
      language,
      debouncedSearchTerm,
      ratingFilter,
      responseFilter,
      activeTab,
      currentPage,
    ],
    queryFn: async () => {
      try {
        const result = await getAllReviews(getFiltersForTab())
        // The function from actions/review-actions returns a different structure
        return {
          reviews: result.reviews || [],
          totalPages: result.totalPages || 1,
          totalReviews: result.totalReviews || 0,
        }
      } catch (error) {
        console.error("Error in getAllReviews query:", error)
        throw error
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
    enabled: activeTab === "with-reviews", // Only fetch when on reviews tab
  })

  const handleRowClick = (review: PopulatedReview) => {
    if (!review) {
      console.warn("Attempted to click on null/undefined review")
      return
    }
    setSelectedReview(review)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedReview(null)
  }

  const columns = useMemo(() => {
    try {
      return getAdminReviewColumns(t, language, handleRowClick)
    } catch (error) {
      console.error("Error creating review columns:", error)
      return []
    }
  }, [t, language])

  const handleRefresh = () => {
    try {
      refetch()
    } catch (error) {
      console.error("Error refreshing reviews:", error)
      toast.error(t("common.refreshError"))
    }
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
          <p className="text-muted-foreground">{t("adminReviews.withoutReviewsNote")}</p>
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
          hideDefaultPagination={true}
          hideColumnsSelector={true}
          onRowClick={handleRowClick}
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
    <div dir={dir} className="h-full flex flex-col space-y-4">
      <div className="flex-shrink-0">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-3xl font-bold tracking-tight">{t("adminReviews.title")}</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="with-reviews">{t("adminReviews.tabs.withReviews")}</TabsTrigger>
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
                    onChange={e => setSearchTerm(e.target.value)}
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
                          <label className="text-sm font-medium">
                            {t("adminReviews.filterByRating")}
                          </label>
                          <Select value={ratingFilter} onValueChange={setRatingFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("adminReviews.allRatings")}</SelectItem>
                              <SelectItem value="5">⭐⭐⭐⭐⭐ (5)</SelectItem>
                              <SelectItem value="4">⭐⭐⭐⭐ (4)</SelectItem>
                              <SelectItem value="3">⭐⭐⭐ (3)</SelectItem>
                              <SelectItem value="2">⭐⭐ (2)</SelectItem>
                              <SelectItem value="1">⭐ (1)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Response Filter */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("adminReviews.filterByResponse")}
                          </label>
                          <Select value={responseFilter} onValueChange={setResponseFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("adminReviews.allResponses")}</SelectItem>
                              <SelectItem value="with_response">
                                {t("adminReviews.withResponse")}
                              </SelectItem>
                              <SelectItem value="without_response">
                                {t("adminReviews.withoutResponse")}
                              </SelectItem>
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

              {/* Active filters display */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ratingFilter !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {t("adminReviews.filterByRating")}: {ratingFilter} ⭐
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setRatingFilter("all")}
                      />
                    </Badge>
                  )}
                  {responseFilter !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {t("adminReviews.filterByResponse")}: {t(`adminReviews.${responseFilter}`)}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setResponseFilter("all")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="without-reviews" className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("adminReviews.withoutReviewsNote")}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 flex flex-col">{renderContent()}</div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between border-t pt-4 bg-white">
          <div className="text-sm text-muted-foreground">
            {t("adminReviews.showingPage", {
              current: currentPage,
              total: data.totalPages,
              totalReviews: data.totalReviews,
            })}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {t("common.pagination.first")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {t("common.pagination.previous")}
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                const page = Math.max(1, currentPage - 2) + i
                if (page > data.totalPages) return null

                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
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
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === data.totalPages}
            >
              {t("common.pagination.next")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(data.totalPages)}
              disabled={currentPage === data.totalPages}
            >
              {t("common.pagination.last")}
            </Button>
          </div>
        </div>
      )}

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReview}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdate={refetch}
      />
    </div>
  )
}
