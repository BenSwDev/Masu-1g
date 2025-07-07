"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Badge } from "@/components/common/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { 
  Search, 
  RefreshCw, 
  Filter, 
  X,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Star,
  CreditCard,
  Clock,
  TrendingUp,
  Eye
} from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "sonner"
import { getMemberBookings, cancelMemberBooking } from "@/actions/member-booking-actions"
import BookingOverviewCard from "./booking-overview-card"
import EnhancedBookingDetailsView from "./enhanced-booking-details-view"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/common/ui/alert-dialog"
import type { PopulatedBooking } from "@/types/booking"

interface EnhancedMemberBookingsClientProps {
  userId: string
}

/**
 * רכיב לקוח משופר להזמנות החבר
 * כולל סקירה מהירה של הזמנות דחופות, טאבים לסינון, ותצוגה משופרת
 */
export default function EnhancedMemberBookingsClient({ userId }: EnhancedMemberBookingsClientProps) {
  const { t, language, dir } = useTranslation()

  // State management
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedBooking, setSelectedBooking] = useState<PopulatedBooking | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Fetch bookings data
  const {
    data: bookingsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["memberBookings", userId, debouncedSearchTerm, activeTab],
    queryFn: () => getMemberBookings({
      search: debouncedSearchTerm || undefined,
      status: activeTab === "all" ? undefined : activeTab,
      page: 1,
      limit: 50
    }),
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // רענון כל 30 שניות
    staleTime: 15000, // 15 שניות
  })

  // Filter bookings by tab
  const filteredBookings = useMemo(() => {
    if (!bookingsData?.bookings) return []
    
    const now = new Date()
    
    switch (activeTab) {
      case "urgent":
        return bookingsData.urgentBookings || []
      case "upcoming":
        return bookingsData.bookings.filter(b => 
          new Date(b.bookingDateTime) > now && 
          !["cancelled", "completed", "reviewed"].includes(b.status)
        )
      case "completed":
        return bookingsData.bookings.filter(b => 
          ["completed", "reviewed"].includes(b.status)
        )
      case "cancelled":
        return bookingsData.bookings.filter(b => b.status === "cancelled")
      default:
        return bookingsData.bookings
    }
  }, [bookingsData, activeTab])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
    toast.success("הנתונים עודכנו")
  }

  // Handle booking details view
  const handleViewDetails = (booking: PopulatedBooking) => {
    setSelectedBooking(booking)
    setShowDetailsModal(true)
  }

  // Handle cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const result = await cancelMemberBooking(bookingId, "בוטל על ידי הלקוח")
      if (result.success) {
        toast.success(result.message)
        refetch()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("שגיאה בביטול ההזמנה")
    }
    setCancelBookingId(null)
  }

  // Get tab statistics
  const getTabStats = (): {
    all: number;
    urgent: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  } => {
    if (!bookingsData) return {
      all: 0,
      urgent: 0,
      upcoming: 0,
      completed: 0,
      cancelled: 0
    }
    
    const now = new Date()
    const upcomingCount = bookingsData.bookings.filter(b => 
      new Date(b.bookingDateTime) > now && 
      !["cancelled", "completed", "reviewed"].includes(b.status)
    ).length
    
    return {
      all: bookingsData.bookings.length,
      urgent: bookingsData.urgentBookings?.length || 0,
      upcoming: upcomingCount,
      completed: bookingsData.statistics?.completedCount || 0,
      cancelled: bookingsData.bookings.filter(b => b.status === "cancelled").length
    }
  }

  const tabStats = getTabStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t("memberBookings.client.title")}</h2>
          <p className="text-gray-600">{t("memberBookings.client.loading")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t("memberBookings.client.error")}</h2>
        <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : "שגיאה לא ידועה"}</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          נסה שוב
        </Button>
      </div>
    )
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("memberBookings.client.title")}</h2>
          <p className="text-gray-600 mt-1">
            {bookingsData?.totalBookings || 0} הזמנות בסך הכל
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>

      {/* Urgent Bookings Alert */}
      {bookingsData?.urgentBookings && bookingsData.urgentBookings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              הזמנות הדורשות תשומת לב
            </CardTitle>
            <CardDescription className="text-amber-700">
              יש לך {bookingsData.urgentBookings.length} הזמנות הדורשות פעולה מיידית
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bookingsData.urgentBookings.map((booking) => (
                <BookingOverviewCard
                  key={booking._id.toString()}
                  booking={booking}
                  variant="compact"
                  onViewDetails={() => handleViewDetails(booking)}
                  onCancel={() => setCancelBookingId(booking._id.toString())}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">הזמנות קרובות</p>
                <p className="text-2xl font-bold">{bookingsData?.statistics?.upcomingCount || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">הושלמו</p>
                <p className="text-2xl font-bold">{bookingsData?.statistics?.completedCount || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ממתינות לתשלום</p>
                <p className="text-2xl font-bold">{bookingsData?.statistics?.pendingPaymentCount || 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ממתינות לחוות דעת</p>
                <p className="text-2xl font-bold">{bookingsData?.statistics?.pendingReviewCount || 0}</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חפש הזמנות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            הכל
            {tabStats.all > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tabStats.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="urgent" className="flex items-center gap-2">
            דחוף
            {tabStats.urgent > 0 && (
              <Badge variant="destructive" className="text-xs">
                {tabStats.urgent}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            קרובות
            {tabStats.upcoming > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tabStats.upcoming}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            הושלמו
            {tabStats.completed > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tabStats.completed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            בוטלו
            {tabStats.cancelled > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tabStats.cancelled}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value={activeTab} className="space-y-4">
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">אין הזמנות למציאה</h3>
                <p className="text-gray-600">
                  {activeTab === "all" ? "עדיין לא ביצעת הזמנות" : `אין הזמנות בקטגוריה "${activeTab}"`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBookings.map((booking) => (
                <BookingOverviewCard
                  key={booking._id.toString()}
                  booking={booking}
                  onViewDetails={() => handleViewDetails(booking)}
                  onCancel={() => setCancelBookingId(booking._id.toString())}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Booking Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>פרטי הזמנה</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <EnhancedBookingDetailsView
              booking={selectedBooking}
              onRefresh={handleRefresh}
              onCancel={() => {
                setShowDetailsModal(false)
                setCancelBookingId(selectedBooking._id.toString())
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation */}
      <AlertDialog open={!!cancelBookingId} onOpenChange={() => setCancelBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ביטול הזמנה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לבטל הזמנה זו? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => cancelBookingId && handleCancelBooking(cancelBookingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              בטל הזמנה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 