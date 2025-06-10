"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getAdminReviewColumns } from "./admin-reviews-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import type { PopulatedReview } from "@/types/review"
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
 * Admin Reviews Client Component - Mobile First Design
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
    queryFn: () => getAllReviews({
      search: debouncedSearchTerm || undefined,
      rating: ratingFilter === "all" ? undefined : parseInt(ratingFilter),
      response: responseFilter === "all" ? undefined : responseFilter,
      page: currentPage,
      limit: 5, // 5 reviews per page
    }),
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

  const columns = useMemo(() => getAdminReviewColumns(t, language, handleRowClick), [t, language, handleRowClick])

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

  if (isLoading) {
    return (
      <div className="w-full min-h-screen overflow-hidden px-4 py-6 md:px-6 lg:px-8" dir={dir}>
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("adminReviews.title")}</h2>
        </div>
        <BookingsTableSkeleton />
        <p className="mt-4 text-center text-muted-foreground text-sm">{t("common.loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 w-full min-h-screen overflow-hidden px-4 py-6 md:px-6 lg:px-8" dir={dir}>
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("adminReviews.title")}</h2>
        </div>
        <p className="text-sm md:text-base">
          {t("common.error")}: {error.message}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen overflow-hidden px-4 py-6 md:px-6 lg:px-8 space-y-4 md:space-y-6" dir={dir}>
      {/* Header */}
      <div className="text-center md:text-right">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("adminReviews.title")}</h2>
      </div>
      
      {/* Tabs - Mobile First */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10 md:h-12">
          <TabsTrigger value="with-reviews" className="text-xs md:text-sm">
            {t("adminReviews.tabs.withReviews")}
          </TabsTrigger>
          <TabsTrigger value="without-reviews" className="text-xs md:text-sm">
            {t("adminReviews.tabs.withoutReviews")}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="with-reviews" className="space-y-4">
          {/* Search and Filters - Mobile First */}
          <div className="space-y-3 md:space-y-4">
            {/* Search bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("adminReviews.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 md:h-12 text-sm md:text-base w-full"
                />
              </div>
              
              {/* Filter and Refresh buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleRefresh} className="h-10 md:h-12 px-3 md:px-4">
                  <RefreshCw className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-xs md:text-sm">{t("common.refresh")}</span>
                </Button>
                
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 md:h-12 px-3 md:px-4">
                      <Filter className="h-4 w-4 mr-1 md:mr-2" />
                      <span className="text-xs md:text-sm">{t("adminReviews.filters")}</span>
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-1 md:ml-2 h-5 w-5 p-0 text-xs">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 md:w-80" align="end">
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm md:text-base">{t("adminReviews.advancedFilters")}</h4>
                        {activeFiltersCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-xs">{t("common.clearAll")}</span>
                          </Button>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Rating Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("adminReviews.filterByRating")}</label>
                        <Select value={ratingFilter} onValueChange={setRatingFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("adminReviews.allRatings")}</SelectItem>
                            <SelectItem value="5">5 ⭐</SelectItem>
                            <SelectItem value="4">4 ⭐</SelectItem>
                            <SelectItem value="3">3 ⭐</SelectItem>
                            <SelectItem value="2">2 ⭐</SelectItem>
                            <SelectItem value="1">1 ⭐</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Response Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("adminReviews.filterByResponse")}</label>
                        <Select value={responseFilter} onValueChange={setResponseFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("adminReviews.allResponses")}</SelectItem>
                            <SelectItem value="with_response">{t("adminReviews.withResponse")}</SelectItem>
                            <SelectItem value="without_response">{t("adminReviews.withoutResponse")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Table Container - Mobile First */}
          <div className="w-full overflow-hidden rounded-lg border bg-white">
            <div className="w-full overflow-x-auto">
              <DataTable
                columns={columns}
                data={data?.reviews || []}
                searchPlaceholder={t("adminReviews.searchPlaceholder")}
                emptyMessage={t("adminReviews.noReviews")}
                totalPages={data?.totalPages || 1}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                className="min-w-full"
              />
            </div>
          </div>
          
          {/* Results count */}
          {data && data.totalReviews > 0 && (
            <div className="text-xs md:text-sm text-muted-foreground text-center">
              {t("adminReviews.totalReviews", { count: data.totalReviews })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="without-reviews" className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm md:text-base">
              {t("adminReviews.withoutReviewsNote")}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
        />
      )}
    </div>
  )
} 