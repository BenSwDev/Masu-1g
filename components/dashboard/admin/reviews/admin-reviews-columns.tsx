"use client"

import React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Star, MessageCircle, AlertTriangle, Eye } from "lucide-react"
import type { PopulatedReview } from "@/types/review"
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"

type TFunction = (key: string, options?: any) => string

// Safe date formatting functions
const formatDateSafe = (date: string | Date | null | undefined): string => {
  if (!date) return "-"
  try {
    return format(new Date(date), "dd/MM/yyyy")
  } catch {
    return "-"
  }
}

const formatDateTimeSafe = (date: string | Date | null | undefined, language: string): string => {
  if (!date) return "-"
  try {
    const d = new Date(date)
    const locale = language === "he" ? he : language === "ru" ? ru : enUS
    return format(d, "dd/MM/yyyy HH:mm", { locale })
  } catch {
    return "-"
  }
}

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
        if (!review?.bookingId) {
          return <div className="text-sm text-muted-foreground">-</div>
        }
        
        return (
          <div className="space-y-1">
            <div className="font-medium">{(review.bookingId as any).bookingNumber || "-"}</div>
            <div className="text-xs text-muted-foreground">
              {formatDateTimeSafe((review.bookingId as any).bookingDateTime, language)}
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
        if (!review?.bookingId) {
          return <div className="text-sm text-muted-foreground">-</div>
        }
        
        return (
          <div className="text-sm">
            {formatDateTimeSafe((review.bookingId as any).bookingDateTime, language)}
          </div>
        )
      },
    },
    {
      accessorKey: "treatmentId.name",
      header: t("adminReviews.columns.treatmentType"),
      cell: ({ row }) => {
        const review = row.original
        if (!review?.treatmentId) {
          return <div className="text-sm text-muted-foreground">-</div>
        }
        
        const treatment = review.treatmentId as any
        const duration = treatment.duration
        return (
          <div className="space-y-1">
            <div className="font-medium">{treatment.name || t("common.unknown")}</div>
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
        if (!review?.professionalId) {
          return <div className="text-sm text-muted-foreground">-</div>
        }
        
        const professional = review.professionalId as any
        return (
          <div className="space-y-1">
            <div className="font-medium">{professional.name || t("common.unknown")}</div>
            <div className="text-xs text-muted-foreground">
              {professional.phone || "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              {professional.email || "-"}
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
        if (!review?.userId) {
          return <div className="text-sm text-muted-foreground">-</div>
        }
        
        const user = review.userId as any
        return (
          <div className="space-y-1">
            <div className="font-medium">{user.name || t("common.unknown")}</div>
            <div className="text-xs text-muted-foreground">
              {user.phone || "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.email || "-"}
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
        if (!review?.bookingId) {
          return <div className="text-sm text-muted-foreground">-</div>
        }
        
        const booking = review.bookingId as any
        const recipient = booking.recipientName
        
        if (!recipient) {
          return <span className="text-muted-foreground">-</span>
        }
        
        return (
          <div className="space-y-1">
            <div className="font-medium">{recipient}</div>
            {booking.recipientPhone && (
              <div className="text-xs text-muted-foreground">
                {booking.recipientPhone}
              </div>
            )}
            {booking.recipientEmail && (
              <div className="text-xs text-muted-foreground">
                {booking.recipientEmail}
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
        
        // COMPREHENSIVE NULL SAFETY CHECK
        if (!review) {
          return <div className="text-sm text-muted-foreground">-</div>
        }
        
        const rating = review.rating || 0
        const hasComment = !!(review.comment && review.comment.trim())
        // SAFE ACCESS TO professionalResponse with multiple null checks
        const hasResponse = !!(
          review.professionalResponse && 
          typeof review.professionalResponse === 'string' && 
          review.professionalResponse.trim().length > 0
        )
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
        
        if (!review) {
          return <div className="text-sm text-muted-foreground">-</div>
        }
        
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onReviewClick(review)
            }}
            className="h-8 px-2"
          >
            <Eye className="h-4 w-4 mr-1" />
            {t("adminReviews.viewDetails")}
          </Button>
        )
      },
    },
  ]
} 
