"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import type { PopulatedReview } from "@/types/review"
import { Heading } from "@/components/common/ui/heading"
import { getUserReviews } from "@/actions/review-actions"
import { Input } from "@/components/common/ui/input"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Search, RefreshCw, Filter, X, Star, MessageCircle, Eye } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/common/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Separator } from "@/components/common/ui/separator"
import { formatDateTime } from "@/lib/utils/date"
import { type ColumnDef } from "@tanstack/react-table"
import ReviewDetailModal from "../../../admin/reviews/review-detail-modal"

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
  const columns: ColumnDef<PopulatedReview>[] = useMemo(() => [
    {
      accessorKey: "bookingId.bookingNumber",
      header: t("memberReviews.columns.bookingNumber"),
      cell: ({ row }) => {
        const review = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">{review.bookingId.bookingNumber}</div>
            <div className="text-xs text-muted-foreground">
              {formatDateTime(review.bookingId.bookingDateTime, language)}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "treatmentId.name",
      header: t("memberReviews.columns.treatmentType"),
      cell: ({ row }) => {
        const review = row.original
        const duration = review.treatmentId.duration
        return (
          <div className="space-y-1">
            <div className="font-medium">{review.treatmentId.name}</div>
            {duration && (
              <div className="text-xs text-muted-foreground">
                {duration} {t("common.minutes")}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "professionalId.name",
      header: t("memberReviews.columns.professional"),
      cell: ({ row }) => {
        const review = row.original
        return (
          <div className="font-medium">{review.professionalId.name}</div>
        )
      },
    },
    {
      accessorKey: "rating",
      header: t("memberReviews.columns.rating"),
      cell: ({ row }) => {
        const review = row.original
        const rating = review.rating
        const hasComment = !!review.comment
        const hasResponse = !!review.professionalResponse
        
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
              <span className="ml-2 text-sm font-medium">{rating}/5</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {hasComment && (
                <Badge variant="secondary" className="text-xs">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {t("memberReviews.hasComment")}
                </Badge>
              )}
              
              {hasResponse && (
                <Badge variant="outline" className="text-xs">
                  {t("memberReviews.hasResponse")}
                </Badge>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: t("memberReviews.columns.reviewDate"),
      cell: ({ row }) => {
        const review = row.original
        return (
          <div className="text-sm">
            {formatDateTime(review.createdAt, language)}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const review = row.original
        
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRowClick(review)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {t("memberReviews.viewDetails")}
          </Button>
        )
      },
    },
  ], [t, language])

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