"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from "@/lib/utils/utils"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Badge } from "@/components/common/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"
import { useToast } from "@/components/common/ui/use-toast"
import { Search, Filter, Users, UserCheck, UserX, Clock, AlertTriangle } from "lucide-react"
import { getProfessionals } from "@/actions/professional-actions"
import ProfessionalEditModal from "./professional-edit-modal"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"

interface Professional {
  _id: string
  userId: {
    _id: string
    name: string
    email: string
    phone: string
    gender: string
  }
  status: ProfessionalStatus
  specialization?: string
  treatments: any[]
  workAreas: any[]
  totalEarnings: number
  appliedAt: string
  approvedAt?: string
  rejectedAt?: string
  lastActiveAt?: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export default function ProfessionalsManagement() {
  const { t, dir, language } = useTranslation()
  const { toast } = useToast()
  
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProfessionalStatus | "">("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Fetch professionals
  const fetchProfessionals = async (page = 1) => {
    setLoading(true)
    try {
      const result = await getProfessionals({
        page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter || undefined,
        sortBy,
        sortOrder
      })

      if (result.success) {
        setProfessionals(result.professionals || [])
        setPagination(result.pagination || pagination)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בטעינת המטפלים"
        })
      }
    } catch (error) {
      console.error("Error fetching professionals:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בטעינת המטפלים"
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchProfessionals()
  }, [searchTerm, statusFilter, sortBy, sortOrder])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }))
      } else {
        fetchProfessionals(1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Handle filter changes
  useEffect(() => {
    fetchProfessionals(1)
  }, [statusFilter, sortBy, sortOrder])

  const handleRowClick = (professional: Professional) => {
    setSelectedProfessional(professional)
    setShowEditModal(true)
  }

  const handleModalClose = () => {
    setShowEditModal(false)
    setSelectedProfessional(null)
    fetchProfessionals(pagination.page) // Refresh current page
  }

  const getStatusBadge = (status: ProfessionalStatus) => {
    const statusConfig = {
      active: { variant: "default" as const, icon: UserCheck, text: "פעיל" },
      pending_admin_approval: { variant: "secondary" as const, icon: Clock, text: "ממתין לאישור" },
      pending_user_action: { variant: "outline" as const, icon: Clock, text: "ממתין למשתמש" },
      rejected: { variant: "destructive" as const, icon: UserX, text: "נדחה" },
      suspended: { variant: "destructive" as const, icon: AlertTriangle, text: "מושהה" }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return formatDateUtil(dateString, language)
  }

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, "ILS", language)
  }

  // Statistics
  const stats = {
    total: pagination.total,
    active: professionals.filter(p => p.status === "active").length,
    pending: professionals.filter(p => p.status === "pending_admin_approval").length,
    rejected: professionals.filter(p => p.status === "rejected").length
  }

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
              <span className="text-2xl font-bold">{stats.total}</span>
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
              <span className="text-2xl font-bold text-green-600">{stats.active}</span>
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
              <span className="text-2xl font-bold text-orange-600">{stats.pending}</span>
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
              <span className="text-2xl font-bold text-red-600">{stats.rejected}</span>
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
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProfessionalStatus | "")}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="סנן לפי סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">כל הסטטוסים</SelectItem>
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
                <SelectItem value="totalEarnings-desc">רווחים (גבוה לנמוך)</SelectItem>
                <SelectItem value="totalEarnings-asc">רווחים (נמוך לגבוה)</SelectItem>
              </SelectContent>
            </Select>
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
                <TableHead>התמחות</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>טיפולים</TableHead>
                <TableHead>איזורי פעילות</TableHead>
                <TableHead>רווחים</TableHead>
                <TableHead>תאריך הצטרפות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : professionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    לא נמצאו מטפלים
                  </TableCell>
                </TableRow>
              ) : (
                professionals.map((professional) => (
                  <TableRow 
                    key={professional._id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(professional)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{professional.userId.name}</div>
                        <div className="text-sm text-muted-foreground">{professional.userId.gender === 'male' ? 'זכר' : 'נקבה'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{professional.userId.email}</div>
                        <div className="text-sm text-muted-foreground">{professional.userId.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {professional.specialization || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(professional.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {professional.treatments.length} טיפולים
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {professional.workAreas.length} איזורים
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {formatCurrency(professional.totalEarnings)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(professional.appliedAt)}
                      </div>
                    </TableCell>
                  </TableRow>
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
            disabled={pagination.page === 1}
            onClick={() => fetchProfessionals(pagination.page - 1)}
          >
            הקודם
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={pagination.page === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchProfessionals(page)}
                >
                  {page}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            disabled={pagination.page === pagination.pages}
            onClick={() => fetchProfessionals(pagination.page + 1)}
          >
            הבא
          </Button>
        </div>
      )}

      {/* Edit Modal */}
      {selectedProfessional && (
        <ProfessionalEditModal
          professional={selectedProfessional}
          open={showEditModal}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
} 