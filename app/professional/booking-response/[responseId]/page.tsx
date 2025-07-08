"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Loader2, CheckCircle, XCircle, Clock, MapPin, Calendar, User, Phone, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface BookingDetails {
  _id: string
  bookingNumber: string
  treatmentName: string
  bookingDateTime: Date
  address: {
    city: string
    street: string
    streetNumber?: string
  }
  status: string
  price: number
  notes?: string
}

interface ResponseData {
  _id: string
  status: "pending" | "accepted" | "declined" | "expired"
  booking: BookingDetails
  professionalName: string
  canRespond: boolean
  bookingCurrentStatus: string
}

type ActionType = "accept" | "decline" | "on_way" | "start_treatment" | "complete_treatment"

export default function ProfessionalResponsePage() {
  const params = useParams()
  const responseId = params.responseId as string
  
  const [responseData, setResponseData] = useState<ResponseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (responseId) {
      fetchResponseData()
    }
  }, [responseId])

  const fetchResponseData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/professional/response/${responseId}`)
      const data = await response.json()
      
      if (data.success) {
        setResponseData(data.data)
      } else {
        setError(data.error || "שגיאה בטעינת הנתונים")
      }
    } catch (err) {
      setError("שגיאה בחיבור לשרת")
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: ActionType) => {
    if (!responseData) return

    setActionLoading(action)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/professional/response/${responseId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        await fetchResponseData() // Refresh data
      } else {
        setError(data.error || "שגיאה בביצוע הפעולה")
      }
    } catch (err) {
      setError("שגיאה בחיבור לשרת")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "ממתין לתגובה", color: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "התקבל", color: "bg-green-100 text-green-800" },
      declined: { label: "נדחה", color: "bg-red-100 text-red-800" },
      expired: { label: "פג תוקף", color: "bg-gray-100 text-gray-800" },
      pending_professional: { label: "ממתין לשיוך מטפל", color: "bg-orange-100 text-orange-800" },
      confirmed: { label: "מאושר", color: "bg-green-100 text-green-800" },
      on_way: { label: "בדרך", color: "bg-blue-100 text-blue-800" },
      in_treatment: { label: "בטיפול", color: "bg-purple-100 text-purple-800" },
      completed: { label: "הושלם", color: "bg-green-100 text-green-800" }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: "bg-gray-100 text-gray-800" }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const formatDateTime = (date: Date) => {
    return format(new Date(date), "EEEE, dd/MM/yyyy בשעה HH:mm", { locale: he })
  }

  const renderActionButtons = () => {
    if (!responseData) return null

    const { status, bookingCurrentStatus, canRespond } = responseData

    // אם לא ניתן להגיב (כנראה כי מישהו אחר כבר לקח את ההזמנה)
    if (!canRespond) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ההזמנה כבר נתפסה על ידי מטפל אחר או שהסטטוס השתנה
          </AlertDescription>
        </Alert>
      )
    }

    // אם התגובה עדיין ממתינה
    if (status === "pending") {
      return (
        <div className="flex gap-4">
          <Button
            onClick={() => handleAction("accept")}
            disabled={actionLoading !== null}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {actionLoading === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            אשר הזמנה
          </Button>
          <Button
            onClick={() => handleAction("decline")}
            disabled={actionLoading !== null}
            variant="destructive"
            className="flex-1"
          >
            {actionLoading === "decline" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            סרב
          </Button>
        </div>
      )
    }

    // אם המטפל אישר - הצג כפתורים לעדכוני סטטוס
    if (status === "accepted") {
      if (bookingCurrentStatus === "confirmed") {
        return (
          <Button
            onClick={() => handleAction("on_way")}
            disabled={actionLoading !== null}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {actionLoading === "on_way" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            סמן "בדרך"
          </Button>
        )
      } else if (bookingCurrentStatus === "on_way") {
        return (
          <Button
            onClick={() => handleAction("start_treatment")}
            disabled={actionLoading !== null}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {actionLoading === "start_treatment" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <User className="h-4 w-4 mr-2" />
            )}
            התחל טיפול
          </Button>
        )
      } else if (bookingCurrentStatus === "in_treatment") {
        return (
          <Button
            onClick={() => handleAction("complete_treatment")}
            disabled={actionLoading !== null}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {actionLoading === "complete_treatment" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            השלם טיפול
          </Button>
        )
      }
    }

    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען פרטי הזמנה...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">שגיאה</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchResponseData} variant="outline">
                נסה שוב
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!responseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">לא נמצא</h2>
              <p className="text-gray-600">לא נמצאו פרטי הזמנה</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">מעצו - התגובה להזמנה</h1>
          <p className="text-gray-600">שלום {responseData.professionalName}</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>פרטי הזמנה #{responseData.booking.bookingNumber}</span>
              <div className="flex gap-2">
                {getStatusBadge(responseData.status)}
                {getStatusBadge(responseData.bookingCurrentStatus)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">טיפול</p>
                  <p className="text-gray-600">{responseData.booking.treatmentName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">תאריך ושעה</p>
                  <p className="text-gray-600">{formatDateTime(responseData.booking.bookingDateTime)}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">כתובת</p>
                <p className="text-gray-600">
                  {responseData.booking.address.street} {responseData.booking.address.streetNumber}, {responseData.booking.address.city}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">מחיר</p>
                <p className="text-gray-600">₪{responseData.booking.price}</p>
              </div>
            </div>

            {responseData.booking.notes && (
              <>
                <Separator />
                <div>
                  <p className="font-medium mb-2">הערות</p>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{responseData.booking.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {renderActionButtons()}
        </div>
      </div>
    </div>
  )
} 