"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Plus, Gift, Check, X, CreditCard } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import GiftVoucherForm, { type GiftVoucherPlain } from "./gift-voucher-form"
import { deleteGiftVoucher, getGiftVouchers } from "@/actions/gift-voucher-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/common/ui/alert-dialog"
import { GiftVoucherRow } from "./gift-voucher-row"
import { Switch } from "@/components/common/ui/switch"
import { useToast } from "@/components/ui/use-toast"

interface GiftVouchersClientProps {
  initialVouchers: GiftVoucherPlain[]
  initialPagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export function GiftVouchersClient({ initialVouchers, initialPagination }: GiftVouchersClientProps) {
  const { toast } = useToast()
  const [vouchers, setVouchers] = useState(initialVouchers)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<GiftVoucherPlain | null>(null)
  const [deleteVoucherId, setDeleteVoucherId] = useState<string | null>(null)

  async function loadVouchers(page = 1) {
    try {
      setIsLoading(true)
      const result = await getGiftVouchers(page, search, showActiveOnly, statusFilter, typeFilter)
      if (!result.success) {
        throw new Error(result.error)
      }
      if (result.giftVouchers && result.pagination) {
        setVouchers(result.giftVouchers)
        setPagination(result.pagination)
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "נכשל בטעינת שוברי המתנה",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVouchers(1)
  }, [search, showActiveOnly, statusFilter, typeFilter])

  async function handleDelete(id: string) {
    try {
      setIsLoading(true)
      const result = await deleteGiftVoucher(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      setVouchers((prev) => prev.filter((v) => v._id !== id))
      toast({
        title: "הצלחה",
        description: "שובר המתנה נמחק בהצלחה",
      })
    } catch (error) {
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "נכשל במחיקת שובר המתנה",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setDeleteVoucherId(null)
    }
  }

  function handleEdit(voucher: GiftVoucherPlain) {
    setEditingVoucher(voucher)
    setIsFormOpen(true)
  }

  function handleFormSuccess() {
    setIsFormOpen(false)
    setEditingVoucher(null)
    loadVouchers(pagination.page)
  }

  const getStatsCards = () => {
    const totalVouchers = vouchers.length
    const activeVouchers = vouchers.filter((v) => v.status === "active").length
    const usedVouchers = vouchers.filter((v) => v.status === "fully_used").length
    const totalValue = vouchers.reduce((sum, v) => sum + v.monetaryValue, 0)

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">סה"כ שוברים</p>
                <p className="text-2xl font-bold">{totalVouchers}</p>
              </div>
              <Gift className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">שוברים פעילים</p>
                <p className="text-2xl font-bold">{activeVouchers}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">שוברים שנוצלו</p>
                <p className="text-2xl font-bold">{usedVouchers}</p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ערך כולל</p>
                <p className="text-2xl font-bold">₪{totalValue.toFixed(2)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {getStatsCards()}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
          <Input
            placeholder="חפש שוברים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[300px]"
            disabled={isLoading}
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="fully_used">נוצל במלואו</SelectItem>
              <SelectItem value="partially_used">נוצל חלקית</SelectItem>
              <SelectItem value="expired">פג תוקף</SelectItem>
              <SelectItem value="pending_payment">ממתין לתשלום</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סוג שובר" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              <SelectItem value="monetary">כספי</SelectItem>
              <SelectItem value="treatment">טיפול</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Switch checked={showActiveOnly} onCheckedChange={setShowActiveOnly} disabled={isLoading} />
            <span className="text-sm">פעילים בלבד</span>
          </div>
        </div>

        <Button onClick={() => setIsFormOpen(true)} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          שובר חדש
        </Button>
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-9 gap-4 p-4 font-medium bg-gray-50">
          <div>קוד</div>
          <div>סוג</div>
          <div>ערך</div>
          <div>רוכש</div>
          <div>בעלים</div>
          <div>מקבל</div>
          <div>תאריך</div>
          <div>סטטוס</div>
          <div className="text-right">פעולות</div>
        </div>
        {vouchers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">לא נמצאו שוברי מתנה</div>
        ) : (
          vouchers.map((voucher) => (
            <GiftVoucherRow
              key={voucher._id}
              voucher={voucher}
              onEdit={() => handleEdit(voucher)}
              onDelete={() => setDeleteVoucherId(voucher._id)}
            />
          ))
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => loadVouchers(pagination.page - 1)}
            disabled={isLoading || pagination.page === 1}
          >
            הקודם
          </Button>
          <span className="flex items-center px-4">
            עמוד {pagination.page} מתוך {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => loadVouchers(pagination.page + 1)}
            disabled={isLoading || pagination.page === pagination.totalPages}
          >
            הבא
          </Button>
        </div>
      )}

      {isFormOpen && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVoucher ? "ערוך שובר מתנה" : "שובר מתנה חדש"}</DialogTitle>
            </DialogHeader>
            <GiftVoucherForm
              initialData={editingVoucher ?? undefined}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingVoucher(null)
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {deleteVoucherId && (
        <AlertDialog open={!!deleteVoucherId} onOpenChange={() => setDeleteVoucherId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>מחק שובר מתנה</AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך למחוק את שובר המתנה? פעולה זו לא ניתנת לביטול.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(deleteVoucherId)}>מחק</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
