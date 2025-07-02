"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslation } from "@/lib/translations/i18n"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"
import { useToast } from "@/components/common/ui/use-toast"
import { Search, Filter, Users, UserCheck, UserX, Clock, AlertTriangle, Plus, RefreshCw } from "lucide-react"
import { getProfessionals } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { ProfessionalStatus, IProfessionalProfile } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"
import type { Professional, ProfessionalManagementProps, PaginationInfo, ProfessionalStats } from "@/lib/types/professional"

// פונקציה לטרנספורמציה של נתונים מהשרת
function transformProfessionalData(rawProfessional: IProfessionalProfile & { userId: IUser }): Professional {
  return {
    _id: rawProfessional._id.toString(),
    userId: rawProfessional.userId,
    status: rawProfessional.status,
    isActive: rawProfessional.isActive,
    specialization: rawProfessional.specialization,
    experience: rawProfessional.experience,
    certifications: rawProfessional.certifications,
    bio: rawProfessional.bio,
    profileImage: rawProfessional.profileImage,
    treatments: (rawProfessional.treatments || []).map(t => ({
      treatmentId: t.treatmentId?.toString() || '',
      durationId: t.durationId?.toString(),
      professionalPrice: t.professionalPrice || 0,
      treatmentName: (t as any).treatmentName
    })),
    workAreas: (rawProfessional.workAreas || []).map(w => ({
      cityId: w.cityId?.toString() || '',
      cityName: w.cityName || '',
      distanceRadius: w.distanceRadius,
      coveredCities: w.coveredCities || []
    })),
    totalEarnings: rawProfessional.totalEarnings || 0,
    pendingPayments: rawProfessional.pendingPayments || 0,
    adminNotes: rawProfessional.adminNotes,
    rejectionReason: rawProfessional.rejectionReason,
    appliedAt: rawProfessional.appliedAt,
    approvedAt: rawProfessional.approvedAt,
    rejectedAt: rawProfessional.rejectedAt,
    lastActiveAt: rawProfessional.lastActiveAt,
    createdAt: rawProfessional.createdAt,
    updatedAt: rawProfessional.updatedAt
  }
}

export function ProfessionalManagement({ 
  initialProfessionals = [], 
  totalPages: initialTotalPages = 1, 
  currentPage: initialPage = 1, 
  initialSearch = "",
  initialStats = { total: 0, active: 0, byStatus: {} }
}: ProfessionalManagementProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  
  const [professionals, setProfessionals] = useState<Professional[]>(initialProfessionals)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: initialPage,
    limit: 10,
    total: 0,
    pages: initialTotalPages
  })
  const [stats, setStats] = useState<ProfessionalStats>(initialStats)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<ProfessionalStatus | "all">("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [error, setError] = useState<string | null>(null)

  // Fetch professionals with improved error handling
  const fetchProfessionals = useCallback(async (page = 1, showLoadingState = true) => {
    if (showLoadingState) setLoading(true)
    setError(null)
    
    try {
      const result = await getProfessionals({
        page,
        limit: 10, // קבוע
        search: searchTerm,
        status: statusFilter === "all" ? undefined : statusFilter,
        sortBy,
        sortOrder
      })

      if (result.success && result.data) {
        const transformedProfessionals = (result.data.professionals || []).map(transformProfessionalData)
        setProfessionals(transformedProfessionals)
        setPagination(result.data.pagination)
        setStats(result.data.stats)
      } else {
        setError(result.error || "שגיאה בטעינת המטפלים")
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בטעינת המטפלים"
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "שגיאה בטעינת המטפלים"
      setError(errorMessage)
      console.error("Error fetching professionals:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: errorMessage
      })
    } finally {
      if (showLoadingState) setLoading(false)
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder, toast])

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true)
    await fetchProfessionals(pagination.page, false)
    setRefreshing(false)
    toast({
      title: "הצלחה",
      description: "הנתונים עודכנו בהצלחה"
    })
  }, [fetchProfessionals, pagination.page, toast])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
      fetchProfessionals(1)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm]) // רק searchTerm

  // Filter and sort effects
  useEffect(() => {
    fetchProfessionals(1)
  }, [statusFilter, sortBy, sortOrder]) // רק הפילטרים

  // Initial load effect
  useEffect(() => {
    if (initialProfessionals.length === 0) {
      fetchProfessionals()
    }
  }, []) // ריק - רק בטעינה ראשונה

  const handleCreateNew = useCallback(() => {
    router.push("/dashboard/admin/professional-management/new")
  }, [router])

  const getStatusBadge = useCallback((status: ProfessionalStatus) => {
    const statusConfig = {
      active: { variant: "default" as const, icon: UserCheck, text: "פעיל" },
      pending_admin_approval: { variant: "secondary" as const, icon: Clock, text: "ממתין לאישור" },
      pending_user_action: { variant: "outline" as const, icon: Clock, text: "ממתין למשתמש" },
      rejected: { variant: "destructive" as const, icon: UserX, text: "נדחה" },
      suspended: { variant: "destructive" as const, icon: AlertTriangle, text: "מושהה" }
    }

    const config = statusConfig[status]
    if (!config) return null
    
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }, [])

  const formatDate = useCallback((date?: Date | string) => {
    if (!date) return "-"
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString("he-IL")
    } catch {
      return "-"
    }
  }, [])

  // חישוב סטטיסטיקות
  const computedStats = {
    total: stats.total,
    active: stats.active,
    pending: stats.byStatus["pending_admin_approval"] || 0,
    rejected: stats.byStatus["rejected"] || 0
  }

  // Error state
  if (error && professionals.length === 0) {
    return (
      <div className="space-y-6" dir={dir}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">שגיאה בטעינת הנתונים</h3>
            <p className="text-muted-foreground mb-4 text-center">{error}</p>
            <Button onClick={() => fetchProfessionals()} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading skeleton
  if (loading && professionals.length === 0) {
    return (
      <div className="space-y-6">
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
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              סה"כ מטפלים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-2xl font-bold">{computedStats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              מטפלים פעילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{computedStats.active}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ממתינים לאישור
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{computedStats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              נדחו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{computedStats.rejected}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי שם, אימייל או טלפון..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProfessionalStatus | "all")}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="סנן לפי סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="pending_admin_approval">ממתין לאישור</SelectItem>
                <SelectItem value="pending_user_action">ממתין למשתמש</SelectItem>
                <SelectItem value="rejected">נדחה</SelectItem>
                <SelectItem value="suspended">מושהה</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field)
              setSortOrder(order as "asc" | "desc")
            }}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="מיין לפי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">תאריך הצטרפות (חדש לישן)</SelectItem>
                <SelectItem value="createdAt-asc">תאריך הצטרפות (ישן לחדש)</SelectItem>
                <SelectItem value="user.name-asc">שם (א-ת)</SelectItem>
                <SelectItem value="user.name-desc">שם (ת-א)</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={refreshData} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              רענן
            </Button>

            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              הוסף מטפל
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Professionals Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם המטפל</TableHead>
                <TableHead>פרטי קשר</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>טיפולים</TableHead>
                <TableHead>איזורי פעילות</TableHead>
                <TableHead>תאריך הצטרפות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && professionals.length > 0 ? (
                // Show skeleton rows when refreshing existing data
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : professionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {error ? "אירעה שגיאה בטעינת הנתונים" : "לא נמצאו מטפלים"}
                  </TableCell>
                </TableRow>
              ) : (
                professionals.map((professional) => (
                  <Link 
                    key={professional._id} 
                    href={`/dashboard/admin/professional-management/${professional._id}`}
                    className="contents"
                  >
                    <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {typeof professional.userId === 'object' ? professional.userId.name : 'לא זמין'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {typeof professional.userId === 'object' && professional.userId.gender === 'male' ? 'זכר' : 'נקבה'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {typeof professional.userId === 'object' ? professional.userId.email : 'לא זמין'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatPhoneForDisplay(typeof professional.userId === 'object' ? professional.userId.phone || "" : "")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(professional.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {professional.treatments?.length || 0} טיפולים
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {professional.workAreas?.length || 0} איזורים
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(professional.appliedAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  </Link>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1 || loading}
            onClick={() => fetchProfessionals(pagination.page - 1)}
          >
            הקודם
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              let page: number
              if (pagination.pages <= 7) {
                page = i + 1
              } else {
                // Show current page and surrounding pages
                const start = Math.max(1, pagination.page - 3)
                const end = Math.min(pagination.pages, start + 6)
                page = start + i
                if (page > end) return null
              }
              
              return (
                <Button
                  key={page}
                  variant={pagination.page === page ? "default" : "outline"}
                  size="sm"
                  disabled={loading}
                  onClick={() => fetchProfessionals(page)}
                >
                  {page}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            disabled={pagination.page === pagination.pages || loading}
            onClick={() => fetchProfessionals(pagination.page + 1)}
          >
            הבא
          </Button>
        </div>
      )}

    </div>
  )
}
