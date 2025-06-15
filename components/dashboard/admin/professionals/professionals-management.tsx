"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { CustomPagination } from "@/components/common/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { ProfessionalEditModal } from "./professional-edit-modal"
import { useTranslation } from "@/lib/translations/i18n"
import { getProfessionals } from "@/actions/professional-actions"

export interface ProfessionalData {
  id: string
  name: string
  email: string
  phone?: string
  gender?: "male" | "female" | "other"
  roles: string[]
  createdAt: string
  professionalProfile?: {
    id: string
    professionalNumber: string
    status: string
    treatments: Array<{
      id: string
      treatmentId: string
      treatmentName: string
      treatmentCategory: string
      professionalPrice: number
      isActive: boolean
    }>
    workAreas: Array<{
      id: string
      cityId: string
      cityName: string
      maxDistanceKm: number
      coveredCities: string[]
    }>
    totalEarnings: number
  } | null
}

interface ProfessionalsManagementProps {
  initialProfessionals: ProfessionalData[]
  totalPages: number
  currentPage: number
  initialSearch?: string
  initialStatus?: string
}

const statusOptions = [
  { value: "", label: "כל הסטטוסים" },
  { value: "active", label: "פעיל" },
  { value: "pending_admin_approval", label: "ממתין לאישור מנהל" },
  { value: "pending_user_action", label: "ממתין למשתמש" },
  { value: "rejected", label: "נדחה" },
  { value: "suspended", label: "מושהה" },
]

const getStatusBadge = (status: string) => {
  const statusConfig = {
    active: { label: "פעיל", variant: "default" as const },
    pending_admin_approval: { label: "ממתין לאישור", variant: "secondary" as const },
    pending_user_action: { label: "ממתין למשתמש", variant: "outline" as const },
    rejected: { label: "נדחה", variant: "destructive" as const },
    suspended: { label: "מושהה", variant: "destructive" as const },
  }
  
  const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function ProfessionalsManagement({ 
  initialProfessionals, 
  totalPages: initialTotalPages, 
  currentPage: initialPage, 
  initialSearch = "",
  initialStatus = ""
}: ProfessionalsManagementProps) {
  const { t, dir } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [professionals, setProfessionals] = useState(initialProfessionals)
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalData | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [page, setPage] = useState(initialPage)
  const [pages, setPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)

  const loadProfessionals = async (newPage = 1, term = search, statusFilter = status) => {
    setLoading(true)
    const result = await getProfessionals(newPage, 10, term, statusFilter)
    if (result.success) {
      setProfessionals(result.professionals as ProfessionalData[])
      setPages(result.totalPages)
      setPage(newPage)
      
      // Update URL
      const params = new URLSearchParams()
      if (term) params.set("search", term)
      if (statusFilter) params.set("status", statusFilter)
      if (newPage > 1) params.set("page", newPage.toString())
      
      const newUrl = params.toString() ? `?${params.toString()}` : ""
      router.replace(`/dashboard/admin/professionals${newUrl}`)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProfessionals(1, search, status)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [search, status])

  const handleRowClick = (professional: ProfessionalData) => {
    setSelectedProfessional(professional)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedProfessional(null)
    // Refresh data
    loadProfessionals(page, search, status)
  }

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש מטפל לפי שם, אימייל או טלפון..."
            className="max-w-sm"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="בחר סטטוס" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>מגדר</TableHead>
                <TableHead>מספר מטפל</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>טיפולים</TableHead>
                <TableHead>איזורי פעילות</TableHead>
                <TableHead>סה"כ רווחים</TableHead>
                <TableHead>תאריך הצטרפות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    {loading ? "טוען..." : "לא נמצאו מטפלים"}
                  </TableCell>
                </TableRow>
              ) : (
                professionals.map((professional) => (
                  <TableRow
                    key={professional.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(professional)}
                  >
                    <TableCell className="font-medium">{professional.name}</TableCell>
                    <TableCell>{professional.email}</TableCell>
                    <TableCell>{professional.phone || "-"}</TableCell>
                    <TableCell>
                      {professional.gender === "male" ? "זכר" : 
                       professional.gender === "female" ? "נקבה" : 
                       professional.gender === "other" ? "אחר" : "-"}
                    </TableCell>
                    <TableCell>
                      {professional.professionalProfile?.professionalNumber || "-"}
                    </TableCell>
                    <TableCell>
                      {professional.professionalProfile ? 
                        getStatusBadge(professional.professionalProfile.status) : 
                        <Badge variant="outline">אין פרופיל</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      {professional.professionalProfile?.treatments.length || 0} טיפולים
                    </TableCell>
                    <TableCell>
                      {professional.professionalProfile?.workAreas.length || 0} איזורים
                    </TableCell>
                    <TableCell>
                      ₪{professional.professionalProfile?.totalEarnings.toLocaleString() || "0"}
                    </TableCell>
                    <TableCell>
                      {new Date(professional.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pages > 1 && (
        <CustomPagination 
          currentPage={page} 
          totalPages={pages} 
          onPageChange={loadProfessionals} 
          isLoading={loading} 
        />
      )}

      <div className="text-sm text-muted-foreground">
        💡 לחץ על שורה לעריכת פרופיל המטפל
      </div>

      {selectedProfessional && (
        <ProfessionalEditModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          professional={selectedProfessional}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
} 