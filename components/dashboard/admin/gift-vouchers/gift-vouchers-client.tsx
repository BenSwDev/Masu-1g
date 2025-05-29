"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Plus, Search, Edit, Trash, Gift, Calendar, Check, X, FilterX } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { useState, useEffect } from "react"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { Pagination } from "@/components/common/ui/pagination"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import GiftVoucherForm, { GiftVoucherPlain } from "./gift-voucher-form"
import {
  createGiftVoucher,
  updateGiftVoucher,
  deleteGiftVoucher,
  getGiftVouchers,
} from "@/actions/gift-voucher-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/common/ui/alert-dialog"
import { IGiftVoucher } from "@/lib/db/models/gift-voucher"
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

export function GiftVouchersClient({
  initialVouchers,
  initialPagination,
}: GiftVouchersClientProps) {
  const { toast } = useToast()
  const [vouchers, setVouchers] = useState(initialVouchers)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<GiftVoucherPlain | null>(null)

  async function loadVouchers(page = 1) {
    try {
      setIsLoading(true)
      const result = await getGiftVouchers(page, search, showActiveOnly)
      if (!result.success) {
        throw new Error(result.error)
      }
      if (result.giftVouchers && result.pagination) {
        setVouchers(result.giftVouchers)
        setPagination(result.pagination)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load gift vouchers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      setIsLoading(true)
      const result = await deleteGiftVoucher(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      setVouchers((prev) => prev.filter((v) => v._id !== id))
      toast({
        title: "Success",
        description: "Gift voucher deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete gift voucher",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search vouchers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[300px]"
            disabled={isLoading}
          />
          <div className="flex items-center space-x-2">
            <Switch
              checked={showActiveOnly}
              onCheckedChange={setShowActiveOnly}
              disabled={isLoading}
            />
            <span className="text-sm">Active only</span>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          New Voucher
        </Button>
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-6 gap-4 p-4 font-medium">
          <div>Code</div>
          <div>Value</div>
          <div>Valid From</div>
          <div>Valid Until</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        {vouchers.map((voucher) => (
          <GiftVoucherRow
            key={voucher._id}
            voucher={voucher}
            onEdit={() => handleEdit(voucher)}
            onDelete={() => handleDelete(voucher._id)}
          />
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => loadVouchers(pagination.page - 1)}
            disabled={isLoading || pagination.page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => loadVouchers(pagination.page + 1)}
            disabled={isLoading || pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">
              {editingVoucher ? "Edit Gift Voucher" : "New Gift Voucher"}
            </h2>
            <GiftVoucherForm
              initialData={editingVoucher ?? undefined}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingVoucher(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
