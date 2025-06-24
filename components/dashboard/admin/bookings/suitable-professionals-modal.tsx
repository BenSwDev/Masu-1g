"use client"

import React, { useState, useMemo } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Avatar, AvatarFallback } from "@/components/common/ui/avatar"
import { 
  UserPlus, 
  Users, 
  Send, 
  Loader2, 
  Phone, 
  Mail,
  User,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  UserX
} from "lucide-react"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import type { PopulatedBooking } from "@/types/booking"

interface SuitableProfessionalsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: PopulatedBooking
  t?: (key: string, options?: any) => string
}

interface SuitableProfessional {
  _id: string
  name: string
  email: string
  phone?: string
  gender?: string
  profileId: string
  calculatedAt?: Date
}

// Function imports - we'll implement these
async function getSuitableProfessionalsForBooking(bookingId: string): Promise<{
  success: boolean
  professionals?: SuitableProfessional[]
  error?: string
}> {
  try {
    const response = await fetch(`/api/admin/bookings/${bookingId}/suitable-professionals`)
    return await response.json()
  } catch (error) {
    return { success: false, error: "Failed to fetch suitable professionals" }
  }
}

async function assignProfessionalToBooking(bookingId: string, professionalId: string) {
  const { assignProfessionalToBooking } = await import("@/actions/booking-actions")
  return await assignProfessionalToBooking(bookingId, professionalId)
}

async function sendNotificationsToSuitableProfessionals(bookingId: string) {
  const { sendNotificationToSuitableProfessionals } = await import("@/actions/booking-actions")
  return await sendNotificationToSuitableProfessionals(bookingId)
}

export function SuitableProfessionalsModal({
  open,
  onOpenChange,
  booking,
  t = (key: string) => key
}: SuitableProfessionalsModalProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [isSendingNotifications, setIsSendingNotifications] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const queryClient = useQueryClient()

  const { _data: professionalsData, isLoading, error } = useQuery({
    queryKey: ["suitableProfessionals", booking._id],
    queryFn: () => getSuitableProfessionalsForBooking(booking._id.toString()),
    enabled: open,
    refetchOnWindowFocus: false
  })

  const professionals = professionalsData?.professionals || []
  const currentProfessional = booking.professionalId

  // Calculate booking criteria for display
  const bookingCriteria = useMemo(() => {
    const treatment = booking.treatmentId
    const city = booking.bookingAddressSnapshot?.city
    const genderPreference = booking.therapistGenderPreference
    
    return {
      treatment: treatment?.name || "לא זמין",
      city: city || "לא זמין", 
      genderPreference: genderPreference === "any" ? "ללא העדפה" : 
                       genderPreference === "male" ? "גבר" : 
                       genderPreference === "female" ? "אישה" : "לא זמין",
      bookingDate: format(new Date(booking.bookingDateTime), "dd/MM/yyyy", { locale: he }),
      bookingTime: format(new Date(booking.bookingDateTime), "HH:mm", { locale: he })
    }
  }, [booking])

  const handleAssignProfessional = async (professionalId: string) => {
    setIsAssigning(true)
    try {
      const result = await assignProfessionalToBooking(booking._id.toString(), professionalId)
      if (result.success) {
        toast.success("המטפל שויך בהצלחה להזמנה")
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        queryClient.invalidateQueries({ queryKey: ["suitableProfessionals", booking._id] })
        onOpenChange(false)
      } else {
        toast.error(result.error || "שגיאה בשיוך המטפל")
      }
    } catch (error) {
      toast.error("שגיאה בשיוך המטפל")
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveProfessional = async () => {
    if (!currentProfessional) return
    
    setIsRemoving(true)
    try {
      const { updateBookingByAdmin } = await import("@/actions/booking-actions")
      const result = await updateBookingByAdmin(booking._id.toString(), { 
        professionalId: "" // This will set it to null
      })
      
      if (result.success) {
        toast.success("המטפל הוסר מההזמנה")
        queryClient.invalidateQueries({ queryKey: ["adminBookings"] })
        queryClient.invalidateQueries({ queryKey: ["suitableProfessionals", booking._id] })
      } else {
        toast.error(result.error || "שגיאה בהסרת המטפל")
      }
    } catch (error) {
      toast.error("שגיאה בהסרת המטפל")
    } finally {
      setIsRemoving(false)
    }
  }

  const handleSendNotifications = async () => {
    setIsSendingNotifications(true)
    try {
      const result = await sendNotificationsToSuitableProfessionals(booking._id.toString())
      if (result.success) {
        toast.success(`הודעות נשלחו ל-${result.sentCount} מטפלים`)
      } else {
        toast.error(result.error || "שגיאה בשליחת ההודעות")
      }
    } catch (error) {
      toast.error("שגיאה בשליחת ההודעות")
    } finally {
      setIsSendingNotifications(false)
    }
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin ml-2" />
            <span>טוען מטפלים מתאימים...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            מטפלים מתאימים לשיוך
          </DialogTitle>
          <DialogDescription>
            הזמנה #{booking.bookingNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Booking Criteria Display */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">קריטריוני סינון לפי פרטי ההזמנה</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{bookingCriteria.bookingDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{bookingCriteria.bookingTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{bookingCriteria.city}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{bookingCriteria.genderPreference}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-700">
              <strong>טיפול:</strong> {bookingCriteria.treatment}
            </div>
          </CardContent>
        </Card>

        {/* Current Professional Display */}
        {currentProfessional && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  מטפל משויך כעת
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveProfessional}
                  disabled={isRemoving}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin ml-1" />
                      מסיר...
                    </>
                  ) : (
                    <>
                      <UserX className="h-3 w-3 ml-1" />
                      הסר שיוך
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-green-100">
                  <AvatarFallback className="text-green-700 font-semibold">
                    {(currentProfessional as any)?.name?.charAt(0) || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-green-900">
                    {(currentProfessional as any)?.name || "לא זמין"}
                  </div>
                  <div className="text-xs text-green-700 space-y-1">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {(currentProfessional as any)?.phone || "לא זמין"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {(currentProfessional as any)?.email || "לא זמין"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2 justify-between">
          <div className="text-sm text-muted-foreground">
            נמצאו {professionals.length} מטפלים מתאימים
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSendNotifications}
              disabled={isSendingNotifications || professionals.length === 0}
              className="flex items-center gap-2"
            >
              {isSendingNotifications ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  שלח לתפוצה
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Professionals List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {professionals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <div>לא נמצאו מטפלים מתאימים לקריטריונים</div>
              <div className="text-xs mt-1">נסה לעדכן את פרטי ההזמנה או לחפש ידנית</div>
            </div>
          ) : (
            professionals.map((professional) => (
              <Card key={professional._id} className="border-gray-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-blue-100">
                        <AvatarFallback className="text-blue-700 font-semibold">
                          {professional.name?.charAt(0) || "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{professional.name}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {professional.phone || "לא זמין"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {professional.email}
                          </div>
                          <div className="flex items-center gap-2">
                            {professional.gender && (
                              <Badge variant="outline" className="text-xs">
                                {professional.gender === "male" ? "גבר" : "אישה"}
                              </Badge>
                            )}
                            {professional.calculatedAt && (
                              <span className="text-xs text-muted-foreground">
                                חושב: {format(new Date(professional.calculatedAt), "dd/MM HH:mm", { locale: he })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAssignProfessional(professional._id)}
                      disabled={isAssigning || Boolean(currentProfessional)}
                      className="flex items-center gap-2"
                    >
                      {isAssigning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          משייך...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          שייך
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 