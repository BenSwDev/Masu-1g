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
import { Search, RefreshCw, Filter, X, Star } from "lucide-react"
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
 * Member Reviews Client Component
 * Displays user's reviews
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
      limit: 20,
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

  // Define columns for member reviews (simplified version)
  const columns = useMemo(() => getMemberReviewColumns(t, language), [t, language])

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
      <div>
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-3xl font-bold tracking-tight">{t("memberReviews.title")}</h2>
        </div>
        <BookingsTableSkeleton />
        <p className="mt-4 text-center text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <div className="mb-6 text-center md:text-right">
          <h2 className="text-3xl font-bold tracking-tight">{t("memberReviews.title")}</h2>
        </div>
        <p>
          {t("common.error")}: {error.message}
        </p>
      </div>
    )
  }

  return (
    <div dir={dir}>
      <div className="mb-6 text-center md:text-right">
        <h2 className="text-3xl font-bold tracking-tight">{t("memberReviews.title")}</h2>
      </div>
      
      {/* Search and Filters Bar */}
      <div className="mb-6 space-y-4">
        {/* Main search bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("memberReviews.searchPlaceholder")}
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
                  {t("memberReviews.filters")}
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
                    <h4 className="font-medium">{t("memberReviews.advancedFilters")}</h4>
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
                    <label className="text-sm font-medium">{t("memberReviews.filterByRating")}</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("memberReviews.allRatings")}</SelectItem>
                        <SelectItem value="5">5 {t("memberReviews.stars")}</SelectItem>
                        <SelectItem value="4">4 {t("memberReviews.stars")}</SelectItem>
                        <SelectItem value="3">3 {t("memberReviews.stars")}</SelectItem>
                        <SelectItem value="2">2 {t("memberReviews.stars")}</SelectItem>
                        <SelectItem value="1">1 {t("memberReviews.star")}</SelectItem>
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
      
      <DataTable
        columns={columns}
        data={data?.reviews || []}
        searchPlaceholder={t("memberReviews.searchPlaceholder")}
        emptyMessage={t("memberReviews.noReviews")}
        totalPages={data?.totalPages || 1}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      
      {data && data.totalReviews > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {t("memberReviews.totalReviews", { count: data.totalReviews })}
        </div>
      )}

      {/* Review Detail Modal - Simplified for members */}
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