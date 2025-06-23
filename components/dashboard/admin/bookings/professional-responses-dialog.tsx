"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Phone,
  Smartphone,
  Monitor,
  RefreshCw,
  Send
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { he } from "date-fns/locale"
import { getProfessionalResponses, resendProfessionalNotifications } from "@/actions/notification-service"
import { toast } from "sonner"

interface ProfessionalResponsesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  bookingStatus: string
}

interface ProfessionalResponse {
  _id: string
  professionalId: {
    _id: string
    name: string
    phone: string
    email: string
  }
  phoneNumber: string
  status: "pending" | "accepted" | "declined" | "expired"
  sentAt: string
  respondedAt?: string
  responseMethod?: "sms" | "app" | "phone"
  expiresAt: string
  smsMessageId?: string
}

export function ProfessionalResponsesDialog({
  open,
  onOpenChange,
  bookingId,
  bookingStatus
}: ProfessionalResponsesDialogProps) {
  const [responses, setResponses] = useState<ProfessionalResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const fetchResponses = async () => {
    if (!open || !bookingId) return
    
    setLoading(true)
    try {
      const result = await getProfessionalResponses(bookingId)
      if (result.success && result.responses) {
        setResponses(result.responses)
      } else {
        toast.error("שגיאה בטעינת תגובות המטפלים")
      }
    } catch (error) {
      console.error("Error fetching responses:", error)
      toast.error("שגיאה בטעינת תגובות המטפלים")
    } finally {
      setLoading(false)
    }
  }

  const handleResendNotifications = async () => {
    setResending(true)
    try {
      const result = await resendProfessionalNotifications(bookingId)
      if (result.success) {
        toast.success(`נשלחו הודעות ל-${result.sentCount} מטפלים`)
        fetchResponses() // Refresh the list
      } else {
        toast.error(result.error || "שגיאה בשליחת הודעות")
      }
    } catch (error) {
      console.error("Error resending notifications:", error)
      toast.error("שגיאה בשליחת הודעות")
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    fetchResponses()
  }, [open, bookingId])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          ממתין
        </Badge>
      case "accepted":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          קיבל
        </Badge>
      case "declined":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          דחה
        </Badge>
      case "expired":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          פג תוקף
        </Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getResponseMethodIcon = (method?: string) => {
    switch (method) {
      case "sms":
        return <MessageSquare className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "app":
        return <Monitor className="h-4 w-4" />
      default:
        return <Smartphone className="h-4 w-4" />
    }
  }

  const canResendNotifications = bookingStatus === "confirmed" && !responses.some(r => r.status === "accepted")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            תגובות מטפלים להזמנה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              onClick={fetchResponses}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              רענן
            </Button>

            {canResendNotifications && (
              <Button
                onClick={handleResendNotifications}
                variant="outline"
                size="sm"
                disabled={resending}
              >
                <Send className={`h-4 w-4 mr-2 ${resending ? 'animate-pulse' : ''}`} />
                שלח הודעות מחדש
              </Button>
            )}
          </div>

          <Separator />

          {/* Responses List */}
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : responses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>לא נשלחו הודעות למטפלים עדיין</p>
              </div>
            ) : (
              <div className="space-y-3">
                {responses.map((response) => (
                  <Card key={response._id} className="border-l-4 border-l-blue-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {response.professionalId.name}
                        </CardTitle>
                        {getStatusBadge(response.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {response.phoneNumber}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          נשלח {formatDistanceToNow(new Date(response.sentAt), { 
                            addSuffix: true, 
                            locale: he 
                          })}
                        </div>
                      </div>

                      {response.respondedAt && (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            {getResponseMethodIcon(response.responseMethod)}
                            ענה {formatDistanceToNow(new Date(response.respondedAt), { 
                              addSuffix: true, 
                              locale: he 
                            })}
                          </div>
                        </div>
                      )}

                      {response.status === "pending" && (
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            פג תוקף {formatDistanceToNow(new Date(response.expiresAt), { 
                              addSuffix: true, 
                              locale: he 
                            })}
                          </div>
                        </div>
                      )}

                      {response.smsMessageId && (
                        <div className="text-xs text-muted-foreground">
                          מזהה הודעה: {response.smsMessageId}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Summary */}
          {responses.length > 0 && (
            <>
              <Separator />
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {responses.length}
                  </div>
                  <div className="text-sm text-muted-foreground">סה"כ נשלחו</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {responses.filter(r => r.status === "pending").length}
                  </div>
                  <div className="text-sm text-muted-foreground">ממתינים</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {responses.filter(r => r.status === "accepted").length}
                  </div>
                  <div className="text-sm text-muted-foreground">קיבלו</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {responses.filter(r => r.status === "declined").length}
                  </div>
                  <div className="text-sm text-muted-foreground">דחו</div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 