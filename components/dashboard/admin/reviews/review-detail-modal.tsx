"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Textarea } from "@/components/common/ui/textarea"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Star, User, Phone, Mail, Calendar, Clock, MessageCircle, AlertTriangle, Edit3 } from "lucide-react"
import type { PopulatedReview } from "@/types/review"
import { format } from "date-fns"
import { he, enUS, ru } from "date-fns/locale"
import { updateReviewResponse } from "@/actions/review-actions"
import { toast } from "sonner"

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
  const [professionalResponse, setProfessionalResponse] = useState(review.professionalResponse || "")
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateResponse = async () => {
    if (!professionalResponse.trim()) {
      toast.error(t("adminReviews.errors.responseRequired"))
      return
    }

    setIsUpdating(true)
    try {
      await updateReviewResponse(review._id, {
        professionalResponse: professionalResponse.trim()
      })
      
      toast.success(t("adminReviews.responseUpdated"))
      onUpdate()
      onClose()
    } catch (error) {
      toast.error(t("adminReviews.errors.updateFailed"))
    } finally {
      setIsUpdating(false)
    }
  }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>{t("adminReviews.reviewDetails")}</span>
            {review.rating < 5 && (
              <Badge variant="destructive" className="mr-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t("adminReviews.lowRating")}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("adminReviews.bookingInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{t("adminReviews.bookingNumber")}:</span>
                    <span>{review.bookingId.bookingNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("adminReviews.treatmentDate")}:</span>
                    <span>{formatDateTime(review.bookingId.bookingDateTime, language)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{t("adminReviews.treatmentType")}:</span>
                    <span>{review.treatmentId.name}</span>
                  </div>
                  {review.treatmentId.duration && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("adminReviews.duration")}:</span>
                      <span>{review.treatmentId.duration} {t("common.minutes")}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("adminReviews.customerInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("adminReviews.customerName")}:</span>
                    <span>{review.userId.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("adminReviews.phone")}:</span>
                    <span>{review.userId.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("adminReviews.email")}:</span>
                    <span>{review.userId.email}</span>
                  </div>
                </div>
                
                {/* Recipient Information (if different) */}
                {review.bookingId.recipientName && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {t("adminReviews.treatmentRecipient")}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("adminReviews.recipientName")}:</span>
                      <span>{review.bookingId.recipientName}</span>
                    </div>
                    {review.bookingId.recipientPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t("adminReviews.recipientPhone")}:</span>
                        <span>{review.bookingId.recipientPhone}</span>
                      </div>
                    )}
                    {review.bookingId.recipientEmail && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t("adminReviews.recipientEmail")}:</span>
                        <span>{review.bookingId.recipientEmail}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("adminReviews.professionalInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t("adminReviews.professionalName")}:</span>
                <span>{review.professionalId.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t("adminReviews.phone")}:</span>
                <span>{review.professionalId.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t("adminReviews.email")}:</span>
                <span>{review.professionalId.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Review Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("adminReviews.reviewContent")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rating */}
              <div>
                <span className="font-medium mb-2 block">{t("adminReviews.rating")}:</span>
                {renderStars(review.rating)}
              </div>

              <Separator />

              {/* Comment */}
              {review.comment ? (
                <div>
                  <span className="font-medium mb-2 block">{t("adminReviews.customerComment")}:</span>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{review.comment}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="font-medium mb-2 block">{t("adminReviews.customerComment")}:</span>
                  <p className="text-muted-foreground italic">{t("adminReviews.noComment")}</p>
                </div>
              )}

              <Separator />

              {/* Professional Response */}
              <div>
                <span className="font-medium mb-2 block">{t("adminReviews.professionalResponse")}:</span>
                {review.professionalResponse ? (
                  <div className="bg-blue-50 p-3 rounded-md mb-3">
                    <p className="text-sm">{review.professionalResponse}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic mb-3">{t("adminReviews.noResponse")}</p>
                )}
                
                {/* Response Form */}
                <div className="space-y-3">
                  <Textarea
                    placeholder={t("adminReviews.responsePlaceholder")}
                    value={professionalResponse}
                    onChange={(e) => setProfessionalResponse(e.target.value)}
                    rows={3}
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {professionalResponse.length}/1000 {t("common.characters")}
                    </span>
                    <Button 
                      onClick={handleUpdateResponse}
                      disabled={isUpdating || !professionalResponse.trim()}
                      size="sm"
                    >
                      {isUpdating ? t("common.updating") : t("adminReviews.updateResponse")}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("adminReviews.reviewMetadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t("adminReviews.reviewDate")}:</span>
                <span>{formatDateTime(review.createdAt, language)}</span>
              </div>
              {review.updatedAt !== review.createdAt && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("adminReviews.lastUpdated")}:</span>
                  <span>{formatDateTime(review.updatedAt, language)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 