"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { CheckCircle, XCircle, Clock, AlertCircle, Navigation, MapPin, Calendar, User } from "lucide-react"
import { toast } from "@/components/common/ui/use-toast"

interface BookingData {
  _id: string
  status: string
  booking: {
    _id: string
    bookingNumber: string
    treatmentName: string
    bookingDateTime: string
    address: {
      city: string
      street: string
      streetNumber: string
    }
    status: string
    notes?: string
  }
  professionalName: string
  professionalPhone: string
  canRespond: boolean
  bookingCurrentStatus: string
  isAdminAssigned?: boolean
  responseMethod?: string
}

interface ProfessionalResponseClientProps {
  responseId: string
  action?: "accept" | "decline"
}

export default function ProfessionalResponseClient({ responseId, action }: ProfessionalResponseClientProps) {
  const [data, setData] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  useEffect(() => {
    fetchResponseData()
  }, [responseId])

  useEffect(() => {
    if (action && data) {
      handleAction(action)
    }
  }, [action, data])

  const fetchResponseData = async () => {
    try {
      const response = await fetch(`/api/professional/response/${responseId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch response data')
      }
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load booking data')
      }
    } catch (err) {
      setError('שגיאה בטעינת נתוני ההזמנה')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (actionType: "accept" | "decline") => {
    if (!data) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/professional/response/${responseId}/${actionType}`, {
        method: 'POST'
      })
      const result = await response.json()
      setActionResult(result)
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: result.message
        })
      } else {
        toast({
          title: "שגיאה", 
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (err) {
      const errorMsg = 'שגיאה בעיבוד התגובה'
      setActionResult({ success: false, error: errorMsg })
      toast({
        title: "שגיאה",
        description: errorMsg,
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleOnWay = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/professional/response/${responseId}/on_way`, {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: result.message
        })
        // Refresh data to show updated status
        fetchResponseData()
      } else {
        toast({
          title: "שגיאה", 
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (err) {
      toast({
        title: "שגיאה",
        description: 'שגיאה בעדכון הסטטוס',
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            שגיאה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {error || 'לא ניתן לטעון את נתוני ההזמנה'}
          </p>
          <div className="text-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/professional/booking-management">
                כניסה לאפליקציה
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If action was processed, show result
  if (actionResult) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {actionResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            {actionResult.success ? (
              action === "accept" ? "ההזמנה נקבלה!" : "ההזמנה נדחתה"
            ) : (
              "שגיאה"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {actionResult.message || actionResult.error}
          </p>
          {actionResult.success && action === "accept" && (
            <div className="text-center">
              <Button asChild>
                <Link href="/dashboard/professional/booking-management">
                  צפייה בהזמנות שלי
                </Link>
              </Button>
            </div>
          )}
          <div className="text-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/professional/booking-management">
                כניסה לאפליקציה
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format booking details
  const bookingDate = new Date(data.booking.bookingDateTime).toLocaleDateString('he-IL')
  const bookingTime = new Date(data.booking.bookingDateTime).toLocaleTimeString('he-IL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  const fullAddress = `${data.booking.address.street} ${data.booking.address.streetNumber}, ${data.booking.address.city}`

  // Admin assigned booking - show pre-approved state
  if (data.isAdminAssigned && data.status === "accepted") {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            ההזמנה שוייכה אליך!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-center text-green-800 font-medium">
              🎯 מנהל המערכת שייך את ההזמנה אליך
            </p>
            <p className="text-center text-green-600 text-sm mt-1">
              ההזמנה מאושרת ומוכנה לטיפול
            </p>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{data.booking.treatmentName}</p>
                <p className="text-sm text-gray-600">טיפול #{data.booking.bookingNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{bookingDate}</p>
                <p className="text-sm text-gray-600">{bookingTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{fullAddress}</p>
                <p className="text-sm text-gray-600">כתובת הטיפול</p>
              </div>
            </div>

            {data.booking.notes && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">הערות:</p>
                <p className="text-sm text-yellow-700 mt-1">{data.booking.notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {data.bookingCurrentStatus === "confirmed" && (
              <Button 
                onClick={handleOnWay}
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {actionLoading ? "מעדכן..." : "אני בדרך אליכם"}
              </Button>
            )}
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/professional/booking-management">
                כניסה לאפליקציה
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Regular booking - show accept/decline options
  if (data.status === "pending" && !action) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            הזמנה חדשה זמינה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{data.booking.treatmentName}</p>
                <p className="text-sm text-gray-600">טיפול #{data.booking.bookingNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{bookingDate}</p>
                <p className="text-sm text-gray-600">{bookingTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{fullAddress}</p>
                <p className="text-sm text-gray-600">כתובת הטיפול</p>
              </div>
            </div>

            {data.booking.notes && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">הערות:</p>
                <p className="text-sm text-yellow-700 mt-1">{data.booking.notes}</p>
              </div>
            )}
          </div>

          <p className="text-center text-muted-foreground">
            האם תרצה לקחת את ההזמנה הזו?
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              asChild
              className="bg-green-600 hover:bg-green-700"
            >
              <Link href={`/dashboard/professional/booking-response/${responseId}?action=accept`}>
                <CheckCircle className="h-4 w-4 mr-2" />
                אקבל את ההזמנה
              </Link>
            </Button>
            <Button 
              asChild
              variant="destructive"
            >
              <Link href={`/dashboard/professional/booking-response/${responseId}?action=decline`}>
                <XCircle className="h-4 w-4 mr-2" />
                אדחה את ההזמנה
              </Link>
            </Button>
          </div>
          
          <div className="text-center">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/professional/booking-management">
                כניסה לאפליקציה
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Booking no longer available
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          ההזמנה לא זמינה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-muted-foreground">
          ההזמנה כבר טופלה או שאינה זמינה יותר
        </p>
        <div className="text-center">
          <Button asChild variant="outline">
            <Link href="/dashboard/professional/booking-management">
              כניסה לאפליקציה
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 