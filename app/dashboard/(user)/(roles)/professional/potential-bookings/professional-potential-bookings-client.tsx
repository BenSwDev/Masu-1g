"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  Target, 
  Clock, 
  MapPin, 
  User, 
  DollarSign,
  AlertTriangle,
  Loader2,
  Calendar,
  Filter,
  Heart,
  Eye,
  Search,
  TrendingUp,
  Users
} from "lucide-react"
import { useRouter } from "next/navigation"

interface PotentialBooking {
  _id: string
  treatmentType: string
  preferredDate: string
  preferredTime: string
  bookingAddress: {
    city: string
    street: string
    building: string
  }
  priceDetails: {
    basePrice: number
    totalPrice: number
  }
  distanceFromProfessional?: number
  matchScore?: number
  createdAt: string
}

interface ProfessionalPotentialBookingsClientProps {
  professional: {
    _id: string
    userId: string
    status: string
    isActive: boolean
    workAreas?: any[]
    treatments?: any[]
  }
}

export default function ProfessionalPotentialBookingsClient({ professional }: ProfessionalPotentialBookingsClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<PotentialBooking[]>([])
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all')

  // Load potential bookings
  useEffect(() => {
    const loadPotentialBookings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/professional/potential-bookings')
        const data = await response.json()
        
        if (data.success) {
          setBookings(data.bookings || [])
        } else {
          toast({
            title: "שגיאה",
            description: "לא ניתן לטעון את רשימת ההזמנות הפוטנציאליות",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error loading potential bookings:', error)
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את רשימת ההזמנות הפוטנציאליות",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadPotentialBookings()
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

  const getMatchBadge = (score?: number) => {
    if (!score) return null
    
    if (score >= 90) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <Heart className="w-3 h-3 mr-1" />
          התאמה מושלמת
        </Badge>
      )
    } else if (score >= 75) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          התאמה טובה
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800">
          התאמה חלקית
        </Badge>
      )
    }
  }

  const getDistanceBadge = (distance?: number) => {
    if (!distance) return null
    
    if (distance <= 20) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          {distance.toFixed(1)} ק"מ
        </Badge>
      )
    } else if (distance <= 40) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {distance.toFixed(1)} ק"מ
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          {distance.toFixed(1)} ק"מ
        </Badge>
      )
    }
  }

  const handleViewBooking = (bookingId: string) => {
    router.push(`/dashboard/professional/booking-response/${bookingId}`)
  }

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    
    const bookingDate = new Date(booking.preferredDate)
    const today = new Date()
    
    if (filter === 'today') {
      return bookingDate.toDateString() === today.toDateString()
    } else if (filter === 'week') {
      const oneWeek = new Date()
      oneWeek.setDate(today.getDate() + 7)
      return bookingDate >= today && bookingDate <= oneWeek
    }
    
    return true
  })

  // Calculate statistics
  const stats = {
    total: bookings.length,
    today: bookings.filter(b => new Date(b.preferredDate).toDateString() === new Date().toDateString()).length,
    week: bookings.filter(b => {
      const date = new Date(b.preferredDate)
      const today = new Date()
      const oneWeek = new Date()
      oneWeek.setDate(today.getDate() + 7)
      return date >= today && date <= oneWeek
    }).length,
    avgRevenue: bookings.length > 0 ? bookings.reduce((sum, b) => sum + (b.priceDetails?.totalPrice || 0), 0) / bookings.length : 0
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-muted-foreground">טוען הזמנות פוטנציאליות...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-700">{stats.total}</div>
                <div className="text-xs text-orange-600">הזמנות זמינות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.today}</div>
                <div className="text-xs text-blue-600">היום</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{stats.week}</div>
                <div className="text-xs text-green-600">השבוע</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-700">₪{Math.round(stats.avgRevenue)}</div>
                <div className="text-xs text-purple-600">ממוצע הכנסה</div>
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
            הפרופיל שלך אינו פעיל כרגע. לא תוכל לצפות בהזמנות פוטנציאליות עד לאישור המנהל.
          </AlertDescription>
        </Alert>
      )}

      {/* Missing Configuration Alerts */}
      {(!professional.workAreas || professional.workAreas.length === 0) && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>לא הוגדרו איזורי פעילות. הוסף אזורים כדי לראות הזמנות מתאימות.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => router.push('/dashboard/professional/work-areas')}
              >
                הגדר איזורים
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {(!professional.treatments || professional.treatments.length === 0) && (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>לא הוגדרו טיפולים. הוסף טיפולים כדי לראות הזמנות מתאימות.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => router.push('/dashboard/professional/treatments')}
              >
                הגדר טיפולים
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-orange-600" />
              סינון הזמנות
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                הכל ({stats.total})
              </Button>
              <Button
                variant={filter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('today')}
              >
                היום ({stats.today})
              </Button>
              <Button
                variant={filter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('week')}
              >
                השבוע ({stats.week})
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" />
            הזמנות פוטנציאליות ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'all' ? 'אין הזמנות פוטנציאליות' : `אין הזמנות ${filter === 'today' ? 'להיום' : 'לשבוע זה'}`}
              </h3>
              <p className="text-gray-600 mb-4">
                {bookings.length === 0 
                  ? 'כרגע אין הזמנות שמתאימות לפרופיל שלך. ודא שהגדרת טיפולים ואזורי פעילות.'
                  : 'נסה לשנות את הסינון או לבדוק שוב מאוחר יותר.'
                }
              </p>
              {filter !== 'all' && (
                <Button 
                  variant="outline" 
                  onClick={() => setFilter('all')}
                  className="gap-2"
                >
                  <Search className="w-4 h-4" />
                  צפה בכל ההזמנות
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card key={booking._id} className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{booking.treatmentType}</h4>
                          {getMatchBadge(booking.matchScore)}
                          {getDistanceBadge(booking.distanceFromProfessional)}
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
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">₪{booking.priceDetails?.totalPrice || 0}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                נוצר {formatDate(booking.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left space-y-2">
                        <div className="text-lg font-bold text-orange-600">
                          ₪{booking.priceDetails?.totalPrice || 0}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleViewBooking(booking._id)}
                          className="gap-1 bg-orange-600 hover:bg-orange-700"
                        >
                          <Eye className="w-3 h-3" />
                          צפה
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-2">מה הן הזמנות פוטנציאליות?</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>מתאימות:</strong> הזמנות שמתאימות לטיפולים ולאזורי הפעילות שלך</li>
                <li>• <strong>זמינות:</strong> הזמנות שעדיין לא הוקצו למטפל ספציפי</li>
                <li>• <strong>התאמה:</strong> נקודת ההתאמה מחושבת לפי המרחק, הטיפול והזמינות</li>
                <li>• <strong>תגובה:</strong> לחץ על "צפה" כדי לראות פרטים ולהגיב להזמנה</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 