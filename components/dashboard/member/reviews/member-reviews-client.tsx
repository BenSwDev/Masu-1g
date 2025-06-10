"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { DataTable } from "@/components/common/ui/data-table"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Separator } from "@/components/common/ui/separator"
import { Search, RefreshCw, Filter, X, Star, Eye } from "lucide-react"
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"
import { useDebounce } from "@/hooks/use-debounce"
import { getUserReviews } from "@/actions/review-actions"
import { CreateReviewModal } from "./create-review-modal"
import type { PopulatedReview } from "@/types/review"
import { getMemberReviewColumns } from "./member-reviews-columns"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"

const formatDate = (date: string | Date) => {
  return format(new Date(date), "dd/MM/yyyy")
}

const getLocale = (locale: string) => {
  switch (locale) {
    case "he":
      return he
    case "en":
      return enUS
    case "ru":
      return ru
    default:
      return he
  }
}

/**
 * Member Reviews Client Component - Mobile First Design
 * Displays user's reviews with mobile-first responsive design
 */
export default function MemberReviewsClient() {
  const { t, language, dir } = useTranslation()
  
  // Search and filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  
  // UI state
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedReview, setSelectedReview] = useState<PopulatedReview | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Debounce search term for real-time searching
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, ratingFilter])

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<
    { reviews: PopulatedReview[]; totalPages: number; totalReviews: number },
    Error
  >({
    queryKey: ["memberReviews", language, debouncedSearchTerm, ratingFilter, currentPage],
    queryFn: () => getUserReviews({
      search: debouncedSearchTerm || undefined,
      rating: ratingFilter === "all" ? undefined : parseInt(ratingFilter),
      page: currentPage,
      limit: 5, // 5 reviews per page
    }),
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  })

  const handleRowClick = (review: PopulatedReview) => {
    setSelectedReview(review)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedReview(null)
  }

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
    refetch() // Refresh data after creating review
  }

  // Define columns for member reviews
  const columns = useMemo(() => getMemberReviewColumns(t, language, handleRowClick), [t, language, handleRowClick])

  const handleRefresh = () => {
    refetch()
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setRatingFilter("all")
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (ratingFilter !== "all") count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  if (isLoading) {
    return (
      <div className="w-full min-h-screen overflow-hidden px-4 py-6 md:px-6 lg:px-8" dir={dir}>
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("memberReviews.title")}</h2>
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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("memberReviews.title")}</h2>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-center sm:text-right">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("memberReviews.title")}</h2>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto h-10 md:h-12 px-4 md:px-6"
        >
          <Star className="h-4 w-4 mr-2" />
          <span className="text-sm md:text-base">{t("memberReviews.writeReview")}</span>
        </Button>
      </div>
      
      {/* Search and Filters - Mobile First */}
      <div className="space-y-3 md:space-y-4">
        {/* Search bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("memberReviews.searchPlaceholder")}
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
                  <span className="text-xs md:text-sm">{t("memberReviews.filters")}</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 md:ml-2 h-5 w-5 p-0 text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 md:w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm md:text-base">{t("memberReviews.advancedFilters")}</h4>
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
                    <label className="text-sm font-medium">{t("memberReviews.filterByRating")}</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("memberReviews.allRatings")}</SelectItem>
                        <SelectItem value="5">5 ⭐</SelectItem>
                        <SelectItem value="4">4 ⭐</SelectItem>
                        <SelectItem value="3">3 ⭐</SelectItem>
                        <SelectItem value="2">2 ⭐</SelectItem>
                        <SelectItem value="1">1 ⭐</SelectItem>
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
            searchPlaceholder={t("memberReviews.searchPlaceholder")}
            emptyMessage={t("memberReviews.noReviews")}
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
          {t("memberReviews.totalReviews", { count: data.totalReviews })}
        </div>
      )}

      {/* Create Review Modal */}
      {isCreateModalOpen && (
        <CreateReviewModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
        />
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg md:text-xl font-semibold">{t("memberReviews.reviewDetails")}</h3>
                <Button variant="ghost" size="sm" onClick={handleCloseDetailModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("memberReviews.treatment")}</p>
                  <p className="font-medium">{selectedReview.booking?.treatment?.name || "N/A"}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">{t("memberReviews.rating")}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= selectedReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                {selectedReview.comment && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("memberReviews.comment")}</p>
                    <p className="mt-1">{selectedReview.comment}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-muted-foreground">{t("memberReviews.dateCreated")}</p>
                  <p>{format(new Date(selectedReview.createdAt), "dd/MM/yyyy HH:mm", { locale: getLocale(language) })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 