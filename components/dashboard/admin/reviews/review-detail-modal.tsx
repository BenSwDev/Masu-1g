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
      console.error("Update response error:", error)
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

  // Safe access to nested properties
  const bookingInfo = review?.bookingId as any
  const treatmentInfo = review?.treatmentId as any
  const userInfo = review?.userId as any
  const professionalInfo = review?.professionalId as any

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={dir} aria-describedby="admin-review-detail-description">
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

        <div className="space-y-6" id="admin-review-detail-description">
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
                    <span>{bookingInfo?.bookingNumber || "-"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("adminReviews.treatmentDate")}:</span>
                    <span>{bookingInfo?.bookingDateTime ? formatDateTime(bookingInfo.bookingDateTime, language) : "-"}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{t("adminReviews.treatmentType")}:</span>
                    <span>{treatmentInfo?.name || "-"}</span>
                  </div>
                  {treatmentInfo?.duration && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("adminReviews.duration")}:</span>
                      <span>{treatmentInfo.duration} {t("common.minutes")}</span>
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
                    <span>{userInfo?.name || "-"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("adminReviews.phone")}:</span>
                    <span>{userInfo?.phone || "-"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("adminReviews.email")}:</span>
                    <span>{userInfo?.email || "-"}</span>
                  </div>
                </div>
                
                {/* Recipient Information (if different) */}
                {bookingInfo?.recipientName && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {t("adminReviews.treatmentRecipient")}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("adminReviews.recipientName")}:</span>
                      <span>{bookingInfo.recipientName}</span>
                    </div>
                    {bookingInfo.recipientPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t("adminReviews.recipientPhone")}:</span>
                        <span>{bookingInfo.recipientPhone}</span>
                      </div>
                    )}
                    {bookingInfo.recipientEmail && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t("adminReviews.recipientEmail")}:</span>
                        <span>{bookingInfo.recipientEmail}</span>
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
                <span>{professionalInfo?.name || "-"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t("adminReviews.phone")}:</span>
                <span>{professionalInfo?.phone || "-"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t("adminReviews.email")}:</span>
                <span>{professionalInfo?.email || "-"}</span>
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
              <div className="space-y-2">
                <h4 className="font-medium">{t("adminReviews.rating")}</h4>
                {renderStars(review.rating || 0)}
              </div>

              {/* Customer Comment */}
              {review.comment && (
                <div className="space-y-2">
                  <h4 className="font-medium">{t("adminReviews.customerComment")}</h4>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Professional Response */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{t("adminReviews.professionalResponse")}</h4>
                  <Edit3 className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <Textarea
                  placeholder={t("adminReviews.responseePlaceholder")}
                  value={professionalResponse}
                  onChange={(e) => setProfessionalResponse(e.target.value)}
                  className="min-h-[100px]"
                  disabled={isUpdating}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleUpdateResponse} disabled={isUpdating || !professionalResponse.trim()}>
                    {isUpdating ? t("common.updating") : t("adminReviews.updateResponse")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 