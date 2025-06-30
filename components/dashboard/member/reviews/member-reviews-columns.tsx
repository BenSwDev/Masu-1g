"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"
import { ArrowUpDown, Star, Eye, MessageCircle } from "lucide-react"
import type { PopulatedReview } from "@/types/review"

type TFunction = (key: string, options?: any) => string

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

// Star Rating Component
const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating}/5</span>
    </div>
  )
}

export const getMemberReviewColumns = (
  t: TFunction,
  locale: string,
  onViewDetails?: (review: PopulatedReview) => void
): ColumnDef<PopulatedReview>[] => [
  {
    accessorKey: "bookingId.bookingNumber",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {t("memberReviews.columns.bookingNumber")}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const booking = row.original.bookingId as any
      return (
        <div className="font-mono text-sm font-medium">
          #{booking?.bookingNumber || t("common.unknown")}
        </div>
      )
    },
  },
  {
    accessorKey: "treatmentId.name",
    header: t("memberReviews.columns.treatmentType"),
    cell: ({ row }) => {
      const treatment = row.original.treatmentId as any
      return (
        <div className="max-w-[200px]">
          <span className="text-sm font-medium">{treatment?.name || t("common.unknown")}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "professionalId.name",
    header: t("memberReviews.columns.professional"),
    cell: ({ row }) => {
      const professional = row.original.professionalId as any
      return <div className="text-sm">{professional?.name || t("common.notAssigned")}</div>
    },
  },
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {t("memberReviews.columns.rating")}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const rating = row.getValue("rating") as number
      return <StarRating rating={rating || 0} />
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {t("memberReviews.columns.reviewDate")}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string | Date
      if (!createdAt) return <div className="text-sm">-</div>
      const date = new Date(createdAt)
      return <div className="text-sm">{formatDate(date)}</div>
    },
  },
  {
    id: "indicators",
    header: "",
    cell: ({ row }) => {
      const review = row.original
      return (
        <div className="flex items-center gap-1">
          {review.comment && <MessageCircle className="h-4 w-4 text-blue-500" />}
          {review.professionalResponse && (
            <Badge variant="outline" className="text-xs">
              {t("memberReviews.hasResponse")}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetails?.(row.original)}
        className="h-8 px-2"
      >
        <Eye className="h-4 w-4 mr-1" />
        {t("memberReviews.viewDetails")}
      </Button>
    ),
  },
]
