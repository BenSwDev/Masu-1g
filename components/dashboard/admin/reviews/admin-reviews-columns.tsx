"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Star, MessageCircle, AlertTriangle, Eye } from "lucide-react"
import type { PopulatedReview } from "@/types/review"
import { formatDate, formatDateTime } from "@/lib/utils/date"

export function getAdminReviewColumns(
  t: (key: string, fallback?: string) => string,
  language: string,
  onReviewClick: (review: PopulatedReview) => void
): ColumnDef<PopulatedReview>[] {
  return [
    {
      accessorKey: "bookingId.bookingNumber",
      header: t("adminReviews.columns.bookingNumber"),
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
      accessorKey: "bookingId.bookingDateTime", 
      header: t("adminReviews.columns.treatmentTime"),
      cell: ({ row }) => {
        const review = row.original
        return (
          <div className="text-sm">
            {formatDateTime(review.bookingId.bookingDateTime, language)}
          </div>
        )
      },
    },
    {
      accessorKey: "treatmentId.name",
      header: t("adminReviews.columns.treatmentType"),
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
      header: t("adminReviews.columns.professional"),
      cell: ({ row }) => {
        const review = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">{review.professionalId.name}</div>
            <div className="text-xs text-muted-foreground">
              {review.professionalId.phone}
            </div>
            <div className="text-xs text-muted-foreground">
              {review.professionalId.email}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "userId.name",
      header: t("adminReviews.columns.customer"),
      cell: ({ row }) => {
        const review = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">{review.userId.name}</div>
            <div className="text-xs text-muted-foreground">
              {review.userId.phone}
            </div>
            <div className="text-xs text-muted-foreground">
              {review.userId.email}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "bookingId.recipientName",
      header: t("adminReviews.columns.bookedFor"),
      cell: ({ row }) => {
        const review = row.original
        const recipient = review.bookingId.recipientName
        
        if (!recipient) {
          return <span className="text-muted-foreground">-</span>
        }
        
        return (
          <div className="space-y-1">
            <div className="font-medium">{recipient}</div>
            {review.bookingId.recipientPhone && (
              <div className="text-xs text-muted-foreground">
                {review.bookingId.recipientPhone}
              </div>
            )}
            {review.bookingId.recipientEmail && (
              <div className="text-xs text-muted-foreground">
                {review.bookingId.recipientEmail}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "rating",
      header: t("adminReviews.columns.rating"),
      cell: ({ row }) => {
        const review = row.original
        const rating = review.rating
        const hasComment = !!review.comment
        const hasResponse = !!review.professionalResponse
        const isLowRating = rating < 5
        
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
                  {t("adminReviews.hasComment")}
                </Badge>
              )}
              
              {isLowRating && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t("adminReviews.lowRating")}
                </Badge>
              )}
            </div>
            
            {hasResponse && (
              <Badge variant="outline" className="text-xs">
                {t("adminReviews.hasResponse")}
              </Badge>
            )}
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
            onClick={() => onReviewClick(review)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {t("adminReviews.viewDetails")}
          </Button>
        )
      },
    },
  ]
} 