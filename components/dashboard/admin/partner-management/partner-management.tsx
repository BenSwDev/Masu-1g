"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"
import { useToast } from "@/components/common/ui/use-toast"
import { Search, RefreshCw, Plus, Edit, Trash2 } from "lucide-react"
import { getPartners, removePartner } from "@/app/dashboard/(user)/(roles)/admin/partners/actions"
import PartnerFormDialog from "./partner-form-dialog"
import PartnerProfileDialog from "./partner-profile-dialog"
import type { IPartnerProfile } from "@/lib/db/models/partner-profile"
import type { IUser } from "@/lib/db/models/user"

interface Partner extends IPartnerProfile {
  _id: string
  userId: IUser
}

interface PartnerManagementProps {
  initialPartners: Partner[]
  totalPages: number
  currentPage: number
  initialSearch?: string
}

interface PartnerData {
  id?: string
  name: string
  email: string
  phone: string
  gender: "male" | "female"
  businessNumber: string
  contactName: string
}

export function PartnerManagement({
  initialPartners,
  totalPages: initialTotalPages,
  currentPage: initialPage,
  initialSearch = ""
}: PartnerManagementProps) {
  const { toast } = useToast()
  const [partners, setPartners] = useState<Partner[]>(initialPartners)
  const [pagination, setPagination] = useState({ page: initialPage, totalPages: initialTotalPages })
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<PartnerData | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; id: string | null}>({open:false,id:null})

  const fetchPartners = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await getPartners({ page, limit: 10, search: searchTerm })
      if (res.success && res.data) {
        const transformed = (res.data.partners || []) as unknown as Partner[]
        transformed.forEach(p => { ;(p as any)._id = p._id.toString() })
        setPartners(transformed)
        setPagination({ page: res.data.pagination.page, totalPages: res.data.pagination.pages })
      } else {
        toast({ variant: "destructive", title: "שגיאה", description: res.error || "שגיאה בטעינת השותפים" })
      }
    } catch (e) {
      toast({ variant: "destructive", title: "שגיאה", description: "שגיאה בטעינת השותפים" })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, toast])

  useEffect(() => {
    const timer = setTimeout(() => fetchPartners(1), 500)
    return () => clearTimeout(timer)
  }, [searchTerm, fetchPartners])

  const refresh = () => fetchPartners(pagination.page)

  const handleCreate = () => {
    setEditingPartner(null)
    setIsFormOpen(true)
  }

  const handleEdit = (p: Partner) => {
    setEditingPartner({
      id: p._id,
      name: p.userId.name,
      email: p.userId.email,
      phone: p.userId.phone,
      gender: p.userId.gender,
      businessNumber: p.businessNumber,
      contactName: p.contactName,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteDialog.id) return
    try {
      const res = await removePartner(deleteDialog.id)
      if (res.success) {
        toast({ title: "הצלחה", description: "השותף נמחק" })
        fetchPartners(pagination.page)
      } else {
        toast({ variant: "destructive", title: "שגיאה", description: res.error || "שגיאה במחיקה" })
      }
    } finally {
      setDeleteDialog({open:false,id:null})
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>חיפוש שותפים</CardTitle>
          <Button onClick={handleCreate} className="flex items-center gap-1">
            <Plus className="w-4 h-4" /> הוסף שותף
          </Button>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חיפוש לפי שם, אימייל או טלפון" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-8" />
          </div>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>ח.פ</TableHead>
                <TableHead>איש קשר</TableHead>
                <TableHead className="w-24">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && partners.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">לא נמצאו שותפים</TableCell>
                </TableRow>
              ) : (
                partners.map(p => (
                  <TableRow key={p._id} className="hover:bg-muted cursor-pointer" onClick={() => setSelectedId(p._id)}>
                    <TableCell>{p.userId.name}</TableCell>
                    <TableCell>{p.userId.email}</TableCell>
                    <TableCell>{p.userId.phone}</TableCell>
                    <TableCell>{p.businessNumber}</TableCell>
                    <TableCell>{p.contactName}</TableCell>
                    <TableCell className="space-x-2" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteDialog({open:true,id:p._id})}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={pagination.page === 1 || loading} onClick={() => fetchPartners(pagination.page - 1)}>הקודם</Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <Button key={page} size="sm" variant={pagination.page === page ? "default" : "outline"} disabled={loading} onClick={() => fetchPartners(page)}>{page}</Button>
            ))}
          </div>
          <Button variant="outline" disabled={pagination.page === pagination.totalPages || loading} onClick={() => fetchPartners(pagination.page + 1)}>הבא</Button>
        </div>
      )}

      {selectedId && (
        <PartnerProfileDialog partnerId={selectedId} open={!!selectedId} onOpenChange={() => setSelectedId(null)} />
      )}

      <PartnerFormDialog
        isOpen={isFormOpen}
        onOpenChange={(o) => setIsFormOpen(o)}
        initialData={editingPartner || undefined}
        onSuccess={() => fetchPartners(pagination.page)}
      />

      {deleteDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow space-y-4">
            <p>האם למחוק שותף זה?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialog({open:false,id:null})}>ביטול</Button>
              <Button variant="destructive" onClick={handleDelete}>מחק</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
