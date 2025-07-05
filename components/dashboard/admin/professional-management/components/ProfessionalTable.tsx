"use client"

import { memo, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Pagination } from "@/components/common/ui/pagination"
import { 
  Eye, 
  Edit, 
  MoreHorizontal, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Stethoscope,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/common/ui/dropdown-menu"
import type { Professional, PaginationInfo } from "@/lib/types/professional"
import { 
  getProfessionalDisplayData,
  getStatusBadgeConfig,
  formatDate
} from "../utils/professional-utils"

interface ProfessionalTableProps {
  professionals: Professional[]
  pagination: PaginationInfo
  loading?: boolean
  onProfessionalClick: (professional: Professional) => void
  onPageChange: (page: number) => void
  className?: string
}

// Status badge component
const StatusBadge = memo(({ status }: { status: string }) => {
  const config = getStatusBadgeConfig(status as any)
  
  const StatusIcon = {
    active: CheckCircle,
    pending_admin_approval: Clock,
    pending_user_action: AlertTriangle,
    rejected: XCircle,
    suspended: XCircle
  }[status as any] || Clock

  return (
    <Badge variant={config.variant} className={`${config.color} flex items-center gap-1`}>
      <StatusIcon className="w-3 h-3" />
      {config.text}
    </Badge>
  )
})

StatusBadge.displayName = "StatusBadge"

// Professional row component
const ProfessionalRow = memo(({ 
  professional, 
  onEdit, 
  onView 
}: { 
  professional: Professional
  onEdit: (professional: Professional) => void
  onView: (professional: Professional) => void
}) => {
  const displayData = useMemo(() => 
    getProfessionalDisplayData(professional), 
    [professional]
  )

  if (displayData.isLoading) {
    return (
      <TableRow className="hover:bg-muted/50">
        <TableCell className="w-1/4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        </TableCell>
        <TableCell className="w-1/4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </TableCell>
        <TableCell className="w-1/6">
          <Skeleton className="h-6 w-20" />
        </TableCell>
        <TableCell className="w-1/6">
          <Skeleton className="h-4 w-16" />
        </TableCell>
        <TableCell className="w-1/6">
          <Skeleton className="h-4 w-16" />
        </TableCell>
        <TableCell className="w-1/6">
          <Skeleton className="h-4 w-20" />
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => onView(professional)}>
      <TableCell className="w-1/4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              {displayData.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {displayData.gender}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(professional)
              }}
            >
              <Edit className="w-4 h-4 mr-1" />
              עריכה
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(professional)}>
                  <Eye className="w-4 h-4 mr-2" />
                  צפייה מהירה
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(professional)}>
                  <Edit className="w-4 h-4 mr-2" />
                  עריכה מלאה
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TableCell>
      
      <TableCell className="w-1/4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            {displayData.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            {displayData.phone}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="w-1/6">
        <StatusBadge status={displayData.status} />
      </TableCell>
      
      <TableCell className="w-1/6">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{displayData.treatmentsCount}</span>
        </div>
      </TableCell>
      
      <TableCell className="w-1/6">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{displayData.workAreasCount}</span>
        </div>
      </TableCell>
      
      <TableCell className="w-1/6">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {displayData.appliedAt}
        </div>
      </TableCell>
    </TableRow>
  )
})

ProfessionalRow.displayName = "ProfessionalRow"

// Loading skeleton for table
const TableSkeleton = memo(() => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="grid grid-cols-6 gap-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    ))}
  </div>
))

TableSkeleton.displayName = "TableSkeleton"

// Empty state component
const EmptyState = memo(({ hasFilters }: { hasFilters: boolean }) => {
  const { t } = useTranslation()
  
  return (
    <div className="text-center py-12">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-muted/20 rounded-full">
          <User className="w-12 h-12 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {hasFilters ? "לא נמצאו תוצאות" : "אין מטפלים במערכת"}
          </h3>
          <p className="text-muted-foreground">
            {hasFilters 
              ? "נסה לשנות את הפילטרים או החיפוש שלך"
              : "התחל בהוספת מטפל ראשון למערכת"
            }
          </p>
        </div>
      </div>
    </div>
  )
})

EmptyState.displayName = "EmptyState"

// Main table component
export const ProfessionalTable = memo(({
  professionals,
  pagination,
  loading = false,
  onProfessionalClick,
  onPageChange,
  className = ""
}: ProfessionalTableProps) => {
  const { t, dir } = useTranslation()

  const handleEditClick = (professional: Professional) => {
    onProfessionalClick(professional)
  }

  const handleViewClick = (professional: Professional) => {
    onProfessionalClick(professional)
  }

  const hasFilters = useMemo(() => {
    // You can determine this based on current filters
    return false // This should be passed as a prop or computed
  }, [])

  if (loading) {
    return (
      <Card className={`border-0 shadow-sm ${className}`} dir={dir}>
        <CardContent className="p-6">
          <TableSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (professionals.length === 0) {
    return (
      <Card className={`border-0 shadow-sm ${className}`} dir={dir}>
        <CardContent className="p-6">
          <EmptyState hasFilters={hasFilters} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-0 shadow-sm ${className}`} dir={dir}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-1/4 font-semibold">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    שם המטפל
                  </div>
                </TableHead>
                <TableHead className="w-1/4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    פרטי קשר
                  </div>
                </TableHead>
                <TableHead className="w-1/6 font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    סטטוס
                  </div>
                </TableHead>
                <TableHead className="w-1/6 font-semibold">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    טיפולים
                  </div>
                </TableHead>
                <TableHead className="w-1/6 font-semibold">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    איזורי פעילות
                  </div>
                </TableHead>
                <TableHead className="w-1/6 font-semibold">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    תאריך הצטרפות
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionals.map((professional) => (
                <ProfessionalRow
                  key={professional._id}
                  professional={professional}
                  onEdit={handleEditClick}
                  onView={handleViewClick}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              מציג {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} - {Math.min(pagination.page * pagination.limit, pagination.total)} מתוך {pagination.total} מטפלים
            </div>
            
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={onPageChange}
              showFirstLast={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
})

ProfessionalTable.displayName = "ProfessionalTable" 