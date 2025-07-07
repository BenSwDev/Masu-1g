"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Input } from "@/components/common/ui/input"
import { DataTable } from "@/components/common/ui/data-table"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/ui/dialog"
import { toast } from "sonner"
import { 
  BarChart3, 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  X,
  Mail,
  Users,
  Star,
  TrendingUp,
  Calendar,
  Play
} from "lucide-react"

import { useTranslation } from "@/lib/translations/i18n"
import { useDebounce } from "@/hooks/use-debounce"
import { 
  getReviewManagementStats, 
  getBookingsWithoutReviews, 
  sendManualReviewRequest, 
  sendManualReviewReminder, 
  sendBulkReviewRequests, 
  sendBulkReviewReminders,
  runScheduledReviewReminders
} from "@/actions/enhanced-review-actions"
import type { ReviewManagementStats, BookingWithoutReview } from "@/actions/enhanced-review-actions"

interface StatCard {
  title: string
  value: string | number
  icon: React.ReactNode
  change?: string
  color?: "default" | "success" | "warning" | "error"
}

/**
 * Enhanced Admin Reviews Client Component
 * Advanced review management with statistics and bulk actions
 */
export default function EnhancedAdminReviewsClient() {
  const { t, language, dir } = useTranslation()
  
  // State management
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<"request" | "reminder" | null>(null)
  
  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Review statistics query
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    refetch: refetchStats 
  } = useQuery<ReviewManagementStats>({
    queryKey: ["reviewManagementStats"],
    queryFn: getReviewManagementStats,
    refetchInterval: 60000, // Refresh every minute
  })

  // Bookings without reviews query
  const {
    data: bookingsData,
    isLoading: isLoadingBookings,
    refetch: refetchBookings
  } = useQuery({
    queryKey: ["bookingsWithoutReviews", currentPage, debouncedSearchTerm],
    queryFn: () => getBookingsWithoutReviews(currentPage, 20, debouncedSearchTerm),
    enabled: activeTab === "without-reviews"
  })

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm])

  // Statistics cards
  const statCards: StatCard[] = [
    {
      title: t("reviewManagement.stats.totalCompleted"),
      value: stats?.totalCompletedBookings || 0,
      icon: <CheckCircle className="h-4 w-4" />,
      color: "default"
    },
    {
      title: t("reviewManagement.stats.withReviews"),
      value: stats?.bookingsWithReviews || 0,
      icon: <MessageSquare className="h-4 w-4" />,
      color: "success"
    },
    {
      title: t("reviewManagement.stats.pendingReview"),
      value: stats?.bookingsPendingReview || 0,
      icon: <Clock className="h-4 w-4" />,
      color: "warning"
    },
    {
      title: t("reviewManagement.stats.responseRate"),
      value: `${stats?.reviewResponseRate || 0}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: (stats?.reviewResponseRate || 0) > 70 ? "success" : "warning"
    },
    {
      title: t("reviewManagement.stats.averageRating"),
      value: `${stats?.averageRating || 0}/5`,
      icon: <Star className="h-4 w-4" />,
      color: (stats?.averageRating || 0) > 4 ? "success" : "default"
    }
  ]

  // Table columns for bookings without reviews
  const bookingColumns = [
    {
      id: "select",
      header: ({ table }: { table: any }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("common.selectAll")}
        />
      ),
      cell: ({ row }: { row: any }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("common.selectRow")}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "bookingNumber",
      header: t("booking.bookingNumber"),
      cell: ({ row }: { row: any }) => (
        <div className="font-medium">{row.getValue("bookingNumber")}</div>
      ),
    },
    {
      accessorKey: "treatmentName",
      header: t("booking.treatment"),
      cell: ({ row }: { row: any }) => (
        <div className="max-w-[200px] truncate">{row.getValue("treatmentName")}</div>
      ),
    },
    {
      accessorKey: "clientName",
      header: t("booking.client"),
      cell: ({ row }: { row: any }) => (
        <div className="max-w-[150px] truncate">{row.getValue("clientName")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: t("booking.status"),
      cell: ({ row }: { row: any }) => {
        const status = row.getValue("status") as string
        const isPending = status === "pending_review"
        return (
          <Badge variant={isPending ? "outline" : "secondary"}>
            {isPending ? t("booking.pendingReview") : t(`booking.status.${status}`)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "bookingDateTime",
      header: t("booking.date"),
      cell: ({ row }: { row: any }) => {
        const date = new Date(row.getValue("bookingDateTime"))
        return (
          <div className="text-sm">
            {date.toLocaleDateString(language === "he" ? "he-IL" : "en-US")}
          </div>
        )
      },
    },
    {
      accessorKey: "reviewRequestSentAt",
      header: t("reviewManagement.requestSent"),
      cell: ({ row }: { row: any }) => {
        const date = row.getValue("reviewRequestSentAt")
        return date ? (
          <div className="text-sm text-green-600">
            {new Date(date).toLocaleDateString(language === "he" ? "he-IL" : "en-US")}
          </div>
        ) : (
          <Badge variant="outline" className="text-red-600">
            {t("reviewManagement.notSent")}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }: { row: any }) => {
        const booking = row.original as BookingWithoutReview
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSingleReviewRequest(booking._id)}
              disabled={isLoadingAction}
            >
              <Send className="h-3 w-3 mr-1" />
              {t("reviewManagement.sendRequest")}
            </Button>
            {booking.reviewRequestSentAt && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSingleReviewReminder(booking._id)}
                disabled={isLoadingAction}
              >
                <Clock className="h-3 w-3 mr-1" />
                {t("reviewManagement.sendReminder")}
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  // Handlers
  const handleSingleReviewRequest = async (bookingId: string) => {
    setIsLoadingAction(true)
    try {
      const result = await sendManualReviewRequest(bookingId)
      if (result.success) {
        toast.success(t("reviewManagement.requestSent"))
        refetchBookings()
        refetchStats()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoadingAction(false)
    }
  }

  const handleSingleReviewReminder = async (bookingId: string) => {
    setIsLoadingAction(true)
    try {
      const result = await sendManualReviewReminder(bookingId)
      if (result.success) {
        toast.success(t("reviewManagement.reminderSent"))
        refetchBookings()
        refetchStats()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoadingAction(false)
    }
  }

  const handleBulkAction = async (actionType: "request" | "reminder") => {
    if (selectedBookings.length === 0) {
      toast.error(t("reviewManagement.selectBookings"))
      return
    }

    setIsLoadingAction(true)
    setBulkActionType(actionType)
    
    try {
      const result = actionType === "request" 
        ? await sendBulkReviewRequests(selectedBookings)
        : await sendBulkReviewReminders(selectedBookings)
      
      if (result.success) {
        const messageKey = `reviewManagement.bulk${actionType === "request" ? "Request" : "Reminder"}Success`
        toast.success(t(messageKey))
        setSelectedBookings([])
        refetchBookings()
        refetchStats()
      } else {
        toast.error(t("reviewManagement.bulkActionError"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoadingAction(false)
      setBulkActionType(null)
    }
  }

  const handleRunScheduledReminders = async () => {
    setIsLoadingAction(true)
    try {
      const result = await runScheduledReviewReminders()
      if (result.success) {
        const { stats } = result
        toast.success(t("reviewManagement.scheduledRemindersSuccess"))
        refetchStats()
      } else {
        toast.error(t("reviewManagement.scheduledRemindersError"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoadingAction(false)
    }
  }

  const handleRefresh = () => {
    refetchStats()
    refetchBookings()
  }

  const getCardColor = (color: StatCard["color"]) => {
    switch (color) {
      case "success": return "border-green-200 bg-green-50"
      case "warning": return "border-yellow-200 bg-yellow-50"
      case "error": return "border-red-200 bg-red-50"
      default: return "border-gray-200 bg-gray-50"
    }
  }

  return (
    <div dir={dir} className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("reviewManagement.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("reviewManagement.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoadingStats}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
            {t("common.refresh")}
          </Button>
          <Button
            onClick={handleRunScheduledReminders}
            disabled={isLoadingAction}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {t("reviewManagement.runScheduledReminders")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className={`${getCardColor(card.color)} transition-all hover:shadow-md`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.change && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reminder Statistics */}
      {stats?.reminderStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("reviewManagement.reminderStatistics")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.reminderStats.firstRemindersSent}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("reviewManagement.firstReminders")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.reminderStats.secondRemindersSent}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("reviewManagement.secondReminders")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.reminderStats.finalRemindersSent}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("reviewManagement.finalReminders")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList>
          <TabsTrigger value="overview">{t("reviewManagement.overview")}</TabsTrigger>
          <TabsTrigger value="without-reviews">
            {t("reviewManagement.withoutReviews")}
            {stats?.bookingsPendingReview && (
              <Badge variant="secondary" className="ml-2">
                {stats.bookingsPendingReview}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("reviewManagement.overviewPlaceholder")}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="without-reviews" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("reviewManagement.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Bulk Actions */}
            {selectedBookings.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction("request")}
                  disabled={isLoadingAction}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t("reviewManagement.sendRequests")} ({selectedBookings.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction("reminder")}
                  disabled={isLoadingAction}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t("reviewManagement.sendReminders")} ({selectedBookings.length})
                </Button>
              </div>
            )}
          </div>

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("reviewManagement.bookingsWithoutReviews")}
                {bookingsData?.totalBookings && (
                  <Badge variant="secondary">
                    {bookingsData.totalBookings}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBookings ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>{t("common.loading")}</p>
                </div>
              ) : (
                <DataTable
                  columns={bookingColumns}
                  data={bookingsData?.bookings || []}
                  hideDefaultPagination={true}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 