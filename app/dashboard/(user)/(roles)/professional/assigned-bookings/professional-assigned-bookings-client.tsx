"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Users,
  Target,
  TrendingUp
} from "lucide-react"
import { useRouter } from "next/navigation"

interface Booking {
  _id: string
  treatmentType: string
  status: string
  preferredDate: string
  preferredTime: string
  bookingAddress: {
    city: string
    street: string
    building: string
    apartment?: string
  }
  guestInfo: {
    name: string
    phone: string
    email: string
  }
  priceDetails: {
    basePrice: number
    totalPrice: number
  }
  createdAt: string
}

interface ProfessionalAssignedBookingsClientProps {
  professional: {
    _id: string
    userId: string
    status: string
    isActive: boolean
  }
}

export default function ProfessionalAssignedBookingsClient({ professional }: ProfessionalAssignedBookingsClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])

  // Load assigned bookings
  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/professional/assigned-bookings')
        const data = await response.json()
        
        if (data.success) {
          setBookings(data.bookings || [])
        } else {
          toast({
            title: "שגיאה",
            description: "לא ניתן לטעון את רשימת ההזמנות",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error loading bookings:', error)
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את רשימת ההזמנות",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, [toast])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            מאושר
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            בטיפול
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            הושלם
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'border-l-green-500'
      case 'in_progress': return 'border-l-blue-500'
      case 'completed': return 'border-l-gray-500'
      default: return 'border-l-gray-300'
    }
  }

  // Calculate statistics
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    inProgress: bookings.filter(b => b.status === 'in_progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    totalRevenue: bookings.reduce((sum, b) => sum + (b.priceDetails?.totalPrice || 0), 0)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-muted-foreground">טוען הזמנות...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                <div className="text-xs text-blue-600">סה"כ הזמנות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{stats.confirmed}</div>
                <div className="text-xs text-green-600">מאושרות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-700">{stats.inProgress}</div>
                <div className="text-xs text-orange-600">בטיפול</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-700">₪{stats.totalRevenue}</div>
                <div className="text-xs text-purple-600">סה"כ הכנסות</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {!professional.isActive && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            הפרופיל שלך אינו פעיל כרגע. לא תקבל הזמנות חדשות עד לאישור המנהל.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            ההזמנות שלי ({bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">אין הזמנות משוייכות</h3>
              <p className="text-gray-600 mb-4">
                כרגע אין לך הזמנות משוייכות. הזמנות חדשות יופיעו כאן לאחר שהן יוקצו אליך על ידי המנהל.
              </p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/(user)/(roles)/professional/potential-bookings')}
                className="gap-2"
              >
                <Target className="w-4 h-4" />
                צפה בהזמנות פוטנציאליות
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking._id} className={`border-l-4 ${getStatusColor(booking.status)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{booking.treatmentType}</h4>
                          {getStatusBadge(booking.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>{formatDate(booking.preferredDate)} בשעה {booking.preferredTime}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {booking.bookingAddress.city}, {booking.bookingAddress.street} {booking.bookingAddress.building}
                                {booking.bookingAddress.apartment && ` דירה ${booking.bookingAddress.apartment}`}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>{booking.guestInfo.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-xs">{booking.guestInfo.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left space-y-2">
                        <div className="text-lg font-bold text-green-600">
                          ₪{booking.priceDetails?.totalPrice || 0}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/dashboard/(user)/(roles)/professional/booking-management/${booking._id}`)}
                          className="gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          פרטים
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      נוצר ב-{formatDate(booking.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">מידע על הזמנות משוייכות:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>מאושרות:</strong> הזמנות שאושרו ומחכות לטיפול</li>
                <li>• <strong>בטיפול:</strong> הזמנות שכרגע בתהליך</li>
                <li>• <strong>הושלמו:</strong> הזמנות שטופלו בהצלחה</li>
                <li>• <strong>ניהול:</strong> לחץ על "פרטים" לניהול מלא של ההזמנה</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 