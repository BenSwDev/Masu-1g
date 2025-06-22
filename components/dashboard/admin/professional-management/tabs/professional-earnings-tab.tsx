"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { TrendingUp, DollarSign, Calendar, Clock, Star, AlertTriangle, Eye, BarChart3 } from "lucide-react"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

interface Professional {
  _id: string
  userId: IUser
  status: ProfessionalStatus
  isActive: boolean
  specialization?: string
  experience?: string
  certifications?: string[]
  bio?: string
  profileImage?: string
  treatments: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
    treatmentName?: string
  }>
  workAreas: Array<{
    cityId: string
    cityName: string
    distanceRadius: "20km" | "40km" | "60km" | "80km" | "unlimited"
    coveredCities: string[]
  }>
  totalEarnings: number
  pendingPayments: number
  adminNotes?: string
  rejectionReason?: string
  appliedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  lastActiveAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface Booking {
  _id: string
  treatmentName: string
  customerName: string
  customerPhone: string
  status: "confirmed" | "completed" | "cancelled" | "in_process" | "pending_payment"
  totalAmount: number
  professionalAmount: number
  scheduledDate: Date
  duration: number
  address: {
    street: string
    city: string
    building?: string
    apartment?: string
  }
  rating?: number
  createdAt: Date
}

interface EarningsStats {
  totalEarnings: number
  pendingPayments: number
  completedBookings: number
  averageRating: number
  monthlyEarnings: Array<{
    month: string
    amount: number
  }>
}

interface ProfessionalEarningsTabProps {
  professional: Professional
}

export default function ProfessionalEarningsTab({
  professional
}: ProfessionalEarningsTabProps) {
  const { t, dir } = useTranslation()
  
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<EarningsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [timeFrame, setTimeFrame] = useState<string>("3months")

  // Load professional bookings and stats
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Fetch bookings
        const bookingsResponse = await fetch(`/api/admin/bookings/by-professional/${professional._id}?limit=20&status=${statusFilter}&timeFrame=${timeFrame}`)
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json()
          setBookings(bookingsData.bookings || [])
        }

        // Fetch earnings stats
        const statsResponse = await fetch(`/api/admin/bookings/stats/${professional._id}?timeFrame=${timeFrame}`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.stats || null)
        }
      } catch (error) {
        console.error("Error loading professional data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [professional._id, statusFilter, timeFrame])

  const getStatusBadge = (status: Booking["status"]) => {
    const statusConfig = {
      confirmed: { variant: "default" as const, text: "מאושר" },
      completed: { variant: "default" as const, text: "הושלם" },
      cancelled: { variant: "destructive" as const, text: "בוטל" },
      in_process: { variant: "secondary" as const, text: "בביצוע" },
      pending_payment: { variant: "outline" as const, text: "ממתין לתשלום" }
    }

    const config = statusConfig[status] || { variant: "outline" as const, text: status }
    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString("he-IL", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch {
      return "-"
    }
  }

  const formatDateTime = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString("he-IL", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return "-"
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6" dir={dir}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir={dir}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              סה"כ הכנסות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalEarnings || professional.totalEarnings || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              תשלומים ממתינים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats?.pendingPayments || professional.pendingPayments || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              הזמנות שהושלמו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.completedBookings || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="w-4 h-4" />
              דירוג ממוצע
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.averageRating ? stats.averageRating.toFixed(1) : "-"}
              {stats?.averageRating && (
                <span className="text-sm text-muted-foreground mr-1">/ 5</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={timeFrame} onValueChange={setTimeFrame}>
                <SelectTrigger>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">חודש אחרון</SelectItem>
                  <SelectItem value="3months">3 חודשים אחרונים</SelectItem>
                  <SelectItem value="6months">6 חודשים אחרונים</SelectItem>
                  <SelectItem value="1year">שנה אחרונה</SelectItem>
                  <SelectItem value="all">כל הזמן</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="confirmed">מאושר</SelectItem>
                  <SelectItem value="completed">הושלם</SelectItem>
                  <SelectItem value="cancelled">בוטל</SelectItem>
                  <SelectItem value="in_process">בביצוע</SelectItem>
                  <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            הזמנות אחרונות
            <Badge variant="secondary">{bookings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">אין הזמנות</h3>
              <p className="text-muted-foreground text-center">
                {statusFilter === "all" 
                  ? "לא נמצאו הזמנות לתקופה הנבחרת"
                  : `לא נמצאו הזמנות עם סטטוס "${statusFilter}"`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>טיפול</TableHead>
                    <TableHead>לקוח</TableHead>
                    <TableHead>תאריך</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>סכום כולל</TableHead>
                    <TableHead>סכום מטפל</TableHead>
                    <TableHead>דירוג</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking._id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.treatmentName}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.duration} דקות
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.customerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.customerPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatDate(booking.scheduledDate)}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.address.city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(booking.totalAmount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatCurrency(booking.professionalAmount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{booking.rating}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Earnings Chart (if data available) */}
      {stats?.monthlyEarnings && stats.monthlyEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              הכנסות חודשיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.monthlyEarnings.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="font-medium">{month.month}</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(month.amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Status Alert */}
      {professional.status !== "active" && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>שים לב:</strong> המטפל אינו פעיל במערכת, לכן לא יוכל לקבל הזמנות חדשות.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
