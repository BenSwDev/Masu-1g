"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Star, User, Calendar, Clock, MessageCircle } from "lucide-react"
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"
import { createReview } from "@/actions/review-actions"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import type { PopulatedBooking } from "@/types/booking"

interface CreateReviewModalProps {
  booking: any // The completed booking to review
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const formatDateTime = (date: string | Date, language: string) => {
  const d = new Date(date)
  const locale = language === "he" ? he : language === "ru" ? ru : enUS
  return format(d, "dd/MM/yyyy HH:mm", { locale })
}

export default function CreateReviewModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: CreateReviewModalProps) {
  const { t, language, dir } = useTranslation()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(t("memberReviews.errors.ratingRequired"))
      return
    }

    setIsSubmitting(true)
    try {
      await createReview({
        bookingId: booking._id,
        rating,
        comment: comment.trim() || undefined,
      })

      toast.success(t("memberReviews.reviewSubmitted"))
      onSuccess()
      onClose()

      // Reset form
      setRating(0)
      setComment("")
    } catch (error) {
      toast.error(t("memberReviews.errors.submitFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setRating(0)
    setComment("")
    onClose()
  }

  const renderStars = () => {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">{t("memberReviews.selectRating")}:</span>
        <div className="flex items-center space-x-1">
          {Array.from({ length: 5 }, (_, i) => {
            const starValue = i + 1
            const isActive = starValue <= (hoveredRating || rating)

            return (
              <button
                key={i}
                type="button"
                className="focus:outline-none"
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(0)}
              >
                <Star
                  className={`h-8 w-8 cursor-pointer transition-colors ${
                    isActive
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300 hover:text-yellow-300"
                  }`}
                />
              </button>
            )
          })}
        </div>
        {rating > 0 && <span className="text-sm font-medium">{rating}/5</span>}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" dir={dir} aria-describedby="create-review-description">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>{t("memberReviews.writeReview")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6" id="create-review-description">
          {/* Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("memberReviews.treatmentDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{t("memberReviews.bookingNumber")}:</span>
                    <span>{booking.bookingNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("memberReviews.treatmentDate")}:</span>
                    <span>{formatDateTime(booking.bookingDateTime, language)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{t("memberReviews.treatmentType")}:</span>
                    <span>{booking.treatmentId?.name}</span>
                  </div>
                  {booking.treatmentId?.duration && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("memberReviews.duration")}:</span>
                      <span>
                        {booking.treatmentId.duration} {t("common.minutes")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {booking.professionalId?.name && (
                <div className="pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("memberReviews.professional")}:</span>
                    <span>{booking.professionalId.name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("memberReviews.yourRating")}</CardTitle>
            </CardHeader>
            <CardContent>{renderStars()}</CardContent>
          </Card>

          {/* Comment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("memberReviews.yourComment")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder={t("memberReviews.commentPlaceholder")}
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {comment.length}/1000 {t("common.characters")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("memberReviews.commentOptional")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? t("common.submitting") : t("memberReviews.submitReview")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
