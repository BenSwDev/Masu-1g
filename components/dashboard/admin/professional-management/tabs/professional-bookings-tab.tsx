"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Calendar, Clock, MapPin, User, Phone, Mail, Filter } from "lucide-react"

interface Booking {
  _id: string
  bookingNumber: string
  clientName: string
  clientPhone: string
  clientEmail: string
  treatmentName: string
  scheduledDate: string
  scheduledTime: string
  status: string
  address: {
    city: string
    street: string
    building: string
  }
  finalPrice: number
}

interface Professional {
  _id: string
  bookings?: Booking[]
}

interface ProfessionalBookingsTabProps {
  professional: Professional
}

export default function ProfessionalBookingsTab({
  professional
}: ProfessionalBookingsTabProps) {
  const { t, dir } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("scheduledDate")

  const bookings = professional.bookings || []

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any, text: string, color: string }> = {
      pending: { variant: "secondary", text: "ממתין", color: "text-yellow-600" },
      confirmed: { variant: "default", text: "מאושר", color: "text-blue-600" },
      in_progress: { variant: "default", text: "בביצוע", color: "text-purple-600" },
      completed: { variant: "default", text: "הושלם", color: "text-green-600" },
      cancelled: { variant: "destructive", text: "בוטל", color: "text-red-600" },
      no_show: { variant: "destructive", text: "לא הגיע", color: "text-red-600" }
    }

    const config = statusConfig[status] || { variant: "outline", text: status, color: "text-gray-600" }
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.text}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL")
  }

  const formatTime = (timeString: string) => {
    return timeString
  }

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString()}`
  }

  const filteredBookings = bookings.filter(booking => 
    !statusFilter || booking.status === statusFilter
  )

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (sortBy === "scheduledDate") {
      return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    }
    return 0
  })

  // Statistics
  const stats = {
    total: bookings.length,
    completed: bookings.filter(b => b.status === "completed").length,
    pending: bookings.filter(b => b.status === "pending").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
    totalRevenue: bookings
      .filter(b => b.status === "completed")
      .reduce((sum, b) => sum + b.finalPrice, 0)
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">סה"כ הזמנות</div>
                <div className="font-semibold text-blue-600">{stats.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">הושלמו</div>
                <div className="font-semibold text-green-600">{stats.completed}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <div className="text-sm text-muted-foreground">ממתינות</div>
                <div className="font-semibold text-yellow-600">{stats.pending}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <div>
                <div className="text-sm text-muted-foreground">סה"כ הכנסות</div>
                <div className="font-semibold text-purple-600">{formatCurrency(stats.totalRevenue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="סנן לפי סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">כל הסטטוסים</SelectItem>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="confirmed">מאושר</SelectItem>
                <SelectItem value="in_progress">בביצוע</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
                <SelectItem value="no_show">לא הגיע</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="מיין לפי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduledDate">תאריך (חדש לישן)</SelectItem>
                <SelectItem value="status">סטטוס</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            הזמנות המטפל ({sortedBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">
                {statusFilter ? "אין הזמנות מסוננות" : "אין הזמנות"}
              </h3>
              <p className="text-sm">
                {statusFilter 
                  ? "לא נמצאו הזמנות עם הסטטוס הנבחר"
                  : "המטפל עדיין לא קיבל הזמנות"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מספר הזמנה</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>טיפול</TableHead>
                  <TableHead>תאריך ושעה</TableHead>
                  <TableHead>כתובת</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>מחיר</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>
                      <div className="font-medium">#{booking.bookingNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{booking.clientName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{booking.clientPhone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span>{booking.clientEmail}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{booking.treatmentName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>{formatDate(booking.scheduledDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(booking.scheduledTime)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <div className="text-sm">
                          <div>{booking.address.city}</div>
                          <div className="text-xs text-muted-foreground">
                            {booking.address.street} {booking.address.building}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(booking.status)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(booking.finalPrice)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 