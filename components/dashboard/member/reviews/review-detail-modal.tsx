"use client"

import { useTranslation } from "@/lib/translations/i18n"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Star, User, Calendar, Clock, MessageCircle } from "lucide-react"
import type { PopulatedReview } from "@/types/review"
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"

interface ReviewDetailModalProps {
  review: PopulatedReview
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

const formatDateTime = (date: string | Date, language: string) => {
  const d = new Date(date)
  const locale = language === "he" ? he : language === "ru" ? ru : enUS
  return format(d, "dd/MM/yyyy HH:mm", { locale })
}

export default function ReviewDetailModal({
  review,
  isOpen,
  onClose,
  onUpdate,
}: ReviewDetailModalProps) {
  const { t, language, dir } = useTranslation()

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-2 text-lg font-medium">{rating}/5</span>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir} aria-describedby="review-detail-description">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>{t("memberReviews.reviewDetails")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6" id="review-detail-description">
          {/* Review Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("memberReviews.yourRating")}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderStars(review.rating)}
            </CardContent>
          </Card>

          {/* Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("memberReviews.treatmentDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{t("memberReviews.bookingNumber")}:</span>
                  <span>#{review.bookingId?.bookingNumber || t("common.unknown")}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("memberReviews.treatmentDate")}:</span>
                  <span>{formatDateTime(review.bookingId?.bookingDateTime || review.createdAt, language)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{t("memberReviews.treatmentType")}:</span>
                  <span>{review.treatmentId?.name || t("common.unknown")}</span>
                </div>
                {review.professionalId?.name && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("memberReviews.professional")}:</span>
                    <span>{review.professionalId.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Review Comment */}
          {review.comment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("memberReviews.yourComment")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                  {review.comment}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Professional Response */}
          {review.professionalResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>{t("memberReviews.professionalResponse")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                  {review.professionalResponse}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Date */}
          <div className="text-sm text-muted-foreground text-center">
            {t("memberReviews.reviewSubmitted")}: {formatDateTime(review.createdAt, language)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 