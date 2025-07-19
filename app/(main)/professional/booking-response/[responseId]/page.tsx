"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Loader2, CheckCircle, XCircle, Clock, MapPin, Calendar, User, Phone, AlertCircle, Shield, DollarSign, Users, Timer } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface AddressDetails {
  city: string
  street: string
  streetNumber: string
  addressType: "apartment" | "house" | "office" | "hotel" | "other"
  notes: string
  hasPrivateParking: boolean
  specificDetails: {
    // Apartment
    apartment?: string
    floor?: string
    entrance?: string
    // House
    doorName?: string
    // Office
    buildingName?: string
    // Hotel
    hotelName?: string
    roomNumber?: string
    // Other
    instructions?: string
  }
  fullDisplayText: string
  specificInstructions: string
}

interface BookingDetails {
  _id: string
  bookingNumber: string
  treatmentName: string
  treatmentDuration: string
  bookingDateTime: Date
  address: AddressDetails
  status: string
  notes?: string
  client: {
    name: string
    gender: string
    phone: string
    email: string
    genderPreference: string
    isBookingForSomeoneElse: boolean
    bookerInfo?: {
      name: string
      phone: string
      email: string
    } | null
  }
}

interface ExpectedPayment {
  basePayment: number
  surcharges: number
  paymentBonus: number
  total: number
  breakdown: Array<{
    description: string
    amount: number
  }>
}

interface ResponseData {
  _id: string
  status: "pending" | "accepted" | "declined" | "expired"
  booking: BookingDetails
  professionalName: string
  canRespond: boolean
  bookingCurrentStatus: string
  professionalPhone: string
  expectedPayment: ExpectedPayment
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

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  useEffect(() => {
    if (responseId) {
      // Check if already authenticated
      const token = localStorage.getItem(`professional_token_${responseId}`)
      if (token) {
        setIsAuthenticated(true)
        fetchResponseData()
      } else {
        setLoading(false)
      }
    }
  }, [responseId])

  const verifyPhone = async () => {
    if (!phoneNumber.trim()) {
      setVerificationError("נא להכניס מספר טלפון")
      return
    }

    setVerificationLoading(true)
    setVerificationError(null)

    try {
      const response = await fetch(`/api/professional/response/${responseId}/verify-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() })
      })

      const data = await response.json()

      if (data.success) {
        // Store token for future visits
        localStorage.setItem(`professional_token_${responseId}`, data.token)
        setIsAuthenticated(true)
        await fetchResponseData()
      } else {
        setVerificationError(data.error || "שגיאה באימות הטלפון")
      }
    } catch (err) {
      setVerificationError("שגיאה בחיבור לשרת")
    } finally {
      setVerificationLoading(false)
    }
  }

  const fetchResponseData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem(`professional_token_${responseId}`)
      const response = await fetch(`/api/professional/response/${responseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResponseData(data.data)
      } else {
        if (data.error === "Unauthorized") {
          // Remove invalid token
          localStorage.removeItem(`professional_token_${responseId}`)
          setIsAuthenticated(false)
        }
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
      const token = localStorage.getItem(`professional_token_${responseId}`)
      const response = await fetch(`/api/professional/response/${responseId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        await fetchResponseData() // Refresh data
      } else {
        if (data.error === "Unauthorized") {
          localStorage.removeItem(`professional_token_${responseId}`)
          setIsAuthenticated(false)
        }
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
      expired: { label: "לא זמין", color: "bg-gray-100 text-gray-800" }, // Changed from "פג תוקף" to "לא זמין"
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

    // אם לא ניתן להגיב - נבדוק למה
    if (!canRespond) {
      let alertMessage = "ההזמנה כבר נתפסה על ידי מטפל אחר או שהסטטוס השתנה"
      
      // אם המטפל דחה את ההזמנה
      if (status === "declined") {
        alertMessage = "דחית את ההזמנה הזו"
      }
      // אם התגובה לא זמינה יותר (במקום "פג תוקף")
      else if (status === "expired") {
        alertMessage = "ההזמנה כבר לא זמינה - נתפסה על ידי מטפל אחר"
      }
      // אם הטיפול הסתיים
      else if (["completed", "cancelled"].includes(bookingCurrentStatus)) {
        alertMessage = "הטיפול הסתיים או בוטל"
      }
      
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {alertMessage}
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

  // Phone verification screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Masu - אימות זהות</h1>
            <p className="text-gray-600">לביטחון שלך ושל הלקוח</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                אימות מספר טלפון
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                נא להכניס את מספר הטלפון שלך כדי לוודא שאת/ה המטפל/ת שההתראה נשלחה אליו/ה
              </div>

              {verificationError && (
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{verificationError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">מספר טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="050-123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && verifyPhone()}
                  className="text-right"
                />
              </div>

              <Button 
                onClick={verifyPhone}
                disabled={verificationLoading}
                className="w-full"
              >
                {verificationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                אמת זהות
              </Button>

              <div className="text-xs text-gray-500 text-center">
                המספר חייב להיות זהה למספר שרשום במערכת
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Masu - הזמנה פנויה לשיוך</h1>
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
            {/* פרטי מטופל */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {responseData.booking.client.isBookingForSomeoneElse ? "פרטי מטופל ומזמין" : "פרטי מטופל"}
              </h3>
              
              {/* פרטי המטופל שמקבל את הטיפול */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="font-medium text-blue-800">שם המטופל</p>
                  <p className="text-blue-700">{responseData.booking.client.name}</p>
                </div>
                <div>
                  <p className="font-medium text-blue-800">מין</p>
                  <p className="text-blue-700">
                    {responseData.booking.client.gender === "male" ? "זכר" : 
                     responseData.booking.client.gender === "female" ? "נקבה" : "לא צוין"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-blue-800">העדפת מין מטפל</p>
                  <p className="text-blue-700">
                    {responseData.booking.client.genderPreference === "male" ? "זכר" :
                     responseData.booking.client.genderPreference === "female" ? "נקבה" : "ללא העדפה"}
                  </p>
                </div>
              </div>

              {/* אם ההזמנה עבור מישהו אחר - הצג פרטי מזמין */}
              {responseData.booking.client.isBookingForSomeoneElse && responseData.booking.client.bookerInfo && (
                <>
                  <Separator className="my-3" />
                  <div className="bg-blue-100 p-3 rounded">
                    <h4 className="font-medium text-blue-800 mb-2">פרטי מזמין ההזמנה</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-blue-700">שם המזמין</p>
                        <p className="text-blue-600">{responseData.booking.client.bookerInfo.name}</p>
                      </div>
                      {responseData.booking.client.bookerInfo.email !== "לא צוין" && (
                        <div>
                          <p className="font-medium text-blue-700">אימייל המזמין</p>
                          <p className="text-blue-600">{responseData.booking.client.bookerInfo.email}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-blue-500 mt-2">
                      💡 הוזמן עבור אדם אחר
                    </div>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* פרטי טיפול */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">טיפול</p>
                  <p className="text-gray-600">{responseData.booking.treatmentName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">משך זמן</p>
                  <p className="text-gray-600">{responseData.booking.treatmentDuration}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:col-span-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">תאריך ושעה</p>
                  <p className="text-gray-600">{formatDateTime(responseData.booking.bookingDateTime)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* כתובת מלאה */}
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-gray-500 mt-1" />
              <div className="flex-1">
                <p className="font-medium mb-2">כתובת מלאה</p>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-gray-700 font-medium mb-2">{responseData.booking.address.fullDisplayText}</p>
                  
                  {/* סוג הכתובת */}
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">סוג כתובת: </span>
                    {responseData.booking.address.addressType === "apartment" && "דירה"}
                    {responseData.booking.address.addressType === "house" && "בית פרטי"}
                    {responseData.booking.address.addressType === "office" && "משרד"}
                    {responseData.booking.address.addressType === "hotel" && "מלון"}
                    {responseData.booking.address.addressType === "other" && "אחר"}
                  </div>

                  {/* פרטים ספציפיים לפי סוג כתובת */}
                  {responseData.booking.address.specificInstructions && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">פרטים נוספים: </span>
                      {responseData.booking.address.specificInstructions}
                    </div>
                  )}

                  {/* פרטים נוספים */}
                  <div className="text-sm text-gray-600 space-y-1">
                    {responseData.booking.address.addressType === "apartment" && (
                      <>
                        {responseData.booking.address.specificDetails.apartment && (
                          <p>דירה: {responseData.booking.address.specificDetails.apartment}</p>
                        )}
                        {responseData.booking.address.specificDetails.floor && (
                          <p>קומה: {responseData.booking.address.specificDetails.floor}</p>
                        )}
                        {responseData.booking.address.specificDetails.entrance && (
                          <p>כניסה: {responseData.booking.address.specificDetails.entrance}</p>
                        )}
                      </>
                    )}

                    {responseData.booking.address.addressType === "house" && (
                      <>
                        {responseData.booking.address.specificDetails.doorName && (
                          <p>שם הדלת: {responseData.booking.address.specificDetails.doorName}</p>
                        )}
                        {responseData.booking.address.specificDetails.entrance && (
                          <p>כניסה: {responseData.booking.address.specificDetails.entrance}</p>
                        )}
                      </>
                    )}

                    {responseData.booking.address.addressType === "office" && (
                      <>
                        {responseData.booking.address.specificDetails.buildingName && (
                          <p>שם הבניין: {responseData.booking.address.specificDetails.buildingName}</p>
                        )}
                        {responseData.booking.address.specificDetails.floor && (
                          <p>קומה: {responseData.booking.address.specificDetails.floor}</p>
                        )}
                        {responseData.booking.address.specificDetails.entrance && (
                          <p>כניסה: {responseData.booking.address.specificDetails.entrance}</p>
                        )}
                      </>
                    )}

                    {responseData.booking.address.addressType === "hotel" && (
                      <>
                        {responseData.booking.address.specificDetails.hotelName && (
                          <p>שם המלון: {responseData.booking.address.specificDetails.hotelName}</p>
                        )}
                        {responseData.booking.address.specificDetails.roomNumber && (
                          <p>חדר: {responseData.booking.address.specificDetails.roomNumber}</p>
                        )}
                      </>
                    )}

                    {responseData.booking.address.addressType === "other" && responseData.booking.address.specificDetails.instructions && (
                      <p>הנחיות: {responseData.booking.address.specificDetails.instructions}</p>
                    )}

                    {responseData.booking.address.hasPrivateParking && (
                      <p className="text-green-600">✓ חניה פרטית זמינה</p>
                    )}

                    {responseData.booking.address.notes && (
                      <p>הערות כתובת: {responseData.booking.address.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* מחיר למטפל */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                התשלום המצופה שלך
              </h3>
              <div className="space-y-2">
                {responseData.expectedPayment.breakdown.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-green-700">{item.description}</span>
                    <span className="font-medium text-green-800">₪{item.amount.toFixed(2)}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-green-800">סה"כ</span>
                  <span className="text-green-900 text-xl">₪{responseData.expectedPayment.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {responseData.booking.notes && (
              <>
                <div>
                  <p className="font-medium mb-2">הערות להזמנה</p>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{responseData.booking.notes}</p>
                </div>
                <Separator />
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