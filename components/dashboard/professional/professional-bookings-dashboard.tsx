"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Separator } from "@/components/common/ui/separator"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Navigation, 
  Star, 
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Phone
} from "lucide-react"
import BookingResponseCard from "./booking-response-card"
import { getProfessionalBookings } from "@/actions/professional-actions"
import type { PopulatedBooking } from "@/types/booking"

interface ProfessionalBookingsDashboardProps {
  professionalId: string
  professionalName: string
}

/**
 * דשבורד ראשי למטפלים
 * מציג הזמנות לפי קטגוריות: הודעות חדשות, מאושרות, מושלמות
 */
export default function ProfessionalBookingsDashboard({
  professionalId,
  professionalName
}: ProfessionalBookingsDashboardProps) {
  const [activeTab, setActiveTab] = useState("notifications")
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Fetch professional bookings
  const {
    data: bookingsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["professionalBookings", professionalId, lastRefresh],
    queryFn: async () => {
      const result = await getProfessionalBookings(professionalId)
      if (!result.success) {
        throw new Error(result.error || "שגיאה בטעינת הזמנות")
      }
      return result.data
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // רענון כל 30 שניות
    staleTime: 10000, // נתונים עדכניים ל-10 שניות
  })

  const handleRefresh = () => {
    setLastRefresh(new Date())
    refetch()
  }

  const handleResponseSubmitted = () => {
    // רענון נתונים אחרי מענה
    handleRefresh()
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">טוען נתונים...</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            שגיאה בטעינת הנתונים: {error.message}
          </AlertDescription>
        </Alert>
        <div className="mt-4 text-center">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            נסה שוב
          </Button>
        </div>
      </div>
    )
  }

  const {
    notifications = [],
    assigned = [],
    completed = [],
    statistics
  } = bookingsData || {}

  // Count badges for tabs
  const notificationCount = notifications.length
  const assignedCount = assigned.filter((b: PopulatedBooking) => 
    ["confirmed", "on_way"].includes(b.status)
  ).length

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">שלום {professionalName}</h1>
          <p className="text-muted-foreground">
            דשבורד ההזמנות שלך
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          רענן
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                הזמנות השבוע
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                שיעור קבלה
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.acceptanceRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                דירוג ממוצע
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.averageRating.toFixed(1)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                הכנסות החודש
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₪{statistics.earnings.month.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications" className="relative">
            <Bell className="w-4 h-4 mr-2" />
            הודעות חדשות
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {notificationCount}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="assigned" className="relative">
            <Navigation className="w-4 h-4 mr-2" />
            הזמנות מאושרות
            {assignedCount > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {assignedCount}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="completed">
            <CheckCircle className="w-4 h-4 mr-2" />
            הושלמו
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                הזמנות חדשות הממתינות למענה
              </CardTitle>
              <CardDescription>
                הזמנות שנשלחו אליך וממתינות לאישור או דחייה
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    אין הזמנות חדשות כעת
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((booking: PopulatedBooking) => (
                    <BookingResponseCard
                      key={booking._id}
                      booking={booking}
                      professionalId={professionalId}
                      mode="notification"
                      onResponseSubmitted={handleResponseSubmitted}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assigned Bookings Tab */}
        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                ההזמנות המאושרות שלך
              </CardTitle>
              <CardDescription>
                הזמנות שאישרת ועליך לטפל בהן
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assigned.length === 0 ? (
                <div className="text-center py-8">
                  <Navigation className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    אין הזמנות מאושרות כעת
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assigned.map((booking: PopulatedBooking) => (
                    <BookingResponseCard
                      key={booking._id}
                      booking={booking}
                      professionalId={professionalId}
                      mode="assigned"
                      onResponseSubmitted={handleResponseSubmitted}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Bookings Tab */}
        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                טיפולים שהושלמו
              </CardTitle>
              <CardDescription>
                היסטוריית הטיפולים שביצעת
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completed.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    טרם השלמת טיפולים
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completed.slice(0, 10).map((booking: PopulatedBooking) => (
                    <BookingResponseCard
                      key={booking._id}
                      booking={booking}
                      professionalId={professionalId}
                      mode="completed"
                      onResponseSubmitted={handleResponseSubmitted}
                    />
                  ))}
                  {completed.length > 10 && (
                    <div className="text-center pt-4">
                      <Button variant="outline">
                        הצג עוד טיפולים
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <MapPin className="w-6 h-6" />
              <span>עדכון אזורי עבודה</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Clock className="w-6 h-6" />
              <span>שעות עבודה</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Phone className="w-6 h-6" />
              <span>יצירת קשר עם התמיכה</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 