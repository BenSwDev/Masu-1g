"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { Mail, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { getAdminGiftVouchers, getGiftVoucherById, resendGiftVoucherNotification } from "@/actions/gift-voucher-actions"

interface GiftVouchersClientProps {
  initialSearch?: string
  initialPage?: number
  initialSortField?: string
  initialSortDirection?: "asc" | "desc"
  initialFilterRedeemed?: boolean
}

export default function GiftVouchersClient({
  initialSearch = "",
  initialPage = 1,
  initialSortField = "createdAt",
  initialSortDirection = "desc",
  initialFilterRedeemed,
}: GiftVouchersClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(initialPage)
  const [sortField, setSortField] = useState(initialSortField)
  const [sortDirection, setSortDirection] = useState(initialSortDirection)
  const [filterRedeemed, setFilterRedeemed] = useState<boolean | undefined>(initialFilterRedeemed)

  const [isLoading, setIsLoading] = useState(true)
  const [vouchers, setVouchers] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null)
  const [isResending, setIsResending] = useState(false)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams)

    if (search) params.set("search", search)
    else params.delete("search")

    params.set("page", page.toString())
    params.set("sortField", sortField)
    params.set("sortDirection", sortDirection)

    if (filterRedeemed !== undefined) {
      params.set("status", filterRedeemed ? "redeemed" : "unredeemed")
    } else {
      params.delete("status")
    }

    router.push(`${pathname}?${params.toString()}`)

    // Fetch vouchers
    fetchVouchers()
  }, [search, page, sortField, sortDirection, filterRedeemed])

  // Fetch vouchers
  const fetchVouchers = async () => {
    setIsLoading(true)
    try {
      const response = await getAdminGiftVouchers(search, sortField, sortDirection, page, 10, filterRedeemed)
      if (response.success) {
        setVouchers(response.vouchers || [])
        setTotalPages(response.totalPages || 1)
      } else {
        toast({
          title: t("common.error"),
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching gift vouchers:", error)
      toast({
        title: t("common.error"),
        description: t("giftVouchers.fetchError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPage(1) // Reset to first page on new search
  }

  // Handle sort
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setPage(1) // Reset to first page on sort change
  }

  // Handle filter
  const handleFilterChange = (value: string) => {
    if (value === "all") {
      setFilterRedeemed(undefined)
    } else if (value === "redeemed") {
      setFilterRedeemed(true)
    } else {
      setFilterRedeemed(false)
    }
    setPage(1) // Reset to first page on filter change
  }

  // Open voucher details dialog
  const openDetailsDialog = async (voucher: any) => {
    setSelectedVoucher(voucher)
    try {
      const response = await getGiftVoucherById(voucher._id)
      if (response.success && response.voucher) {
        setSelectedVoucher(response.voucher)
      }
    } catch (error) {
      console.error("Error fetching voucher details:", error)
    }
    setIsDetailsDialogOpen(true)
  }

  // Handle resend notification
  const handleResendNotification = async () => {
    if (!selectedVoucher) return

    setIsResending(true)
    try {
      const response = await resendGiftVoucherNotification(selectedVoucher._id)

      if (response.success) {
        toast({
          title: t("common.success"),
          description: t("giftVouchers.resendSuccess"),
        })
      } else {
        toast({
          title: t("common.error"),
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error resending notification:", error)
      toast({
        title: t("common.error"),
        description: t("giftVouchers.resendError"),
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t("giftVouchers.title")}</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <form onSubmit={handleSearch} className="flex w-full md:w-auto gap-2">
            <Input
              placeholder={t("giftVouchers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80"
            />
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex gap-2 w-full md:w-auto">
            <Select
              value={filterRedeemed === undefined ? "all" : filterRedeemed ? "redeemed" : "unredeemed"}
              onValueChange={handleFilterChange}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="redeemed">{t("giftVouchers.redeemed")}</SelectItem>
                <SelectItem value="unredeemed">{t("giftVouchers.unredeemed")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortField}
              onValueChange={(value) => {
                setSortField(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={t("common.sortField")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code">{t("giftVouchers.fields.code")}</SelectItem>
                <SelectItem value="amount">{t("giftVouchers.fields.amount")}</SelectItem>
                <SelectItem value="expiryDate">{t("giftVouchers.fields.expiryDate")}</SelectItem>
                <SelectItem value="createdAt">{t("common.created")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortDirection}
              onValueChange={(value: "asc" | "desc") => {
                setSortDirection(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={t("common.sortDirection")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">{t("giftVouchers.sortAscending")}</SelectItem>
                <SelectItem value="desc">{t("giftVouchers.sortDescending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("giftVouchers.fields.code")}</TableHead>
                  <TableHead>{t("giftVouchers.fields.amount")}</TableHead>
                  <TableHead>{t("giftVouchers.fields.recipient")}</TableHead>
                  <TableHead>{t("giftVouchers.fields.sender")}</TableHead>
                  <TableHead>{t("giftVouchers.fields.expiryDate")}</TableHead>
                  <TableHead>{t("giftVouchers.fields.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 7 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : vouchers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {t("giftVouchers.noVouchers")}
                    </TableCell>
                  </TableRow>
                ) : (
                  vouchers.map((voucher) => (
                    <TableRow key={voucher._id} className="cursor-pointer" onClick={() => openDetailsDialog(voucher)}>
                      <TableCell className="font-medium">{voucher.code}</TableCell>
                      <TableCell>${voucher.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{voucher.recipientName}</span>
                          <span className="text-xs text-muted-foreground">{voucher.recipientEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{voucher.senderName}</span>
                          <span className="text-xs text-muted-foreground">{voucher.senderEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(voucher.expiryDate), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={voucher.isRedeemed ? "default" : "secondary"}>
                          {voucher.isRedeemed ? t("giftVouchers.redeemed") : t("giftVouchers.unredeemed")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedVoucher(voucher)
                              handleResendNotification()
                            }}
                            title={t("giftVouchers.resend")}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          {totalPages > 1 && (
            <CardFooter className="flex justify-center py-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <PaginationItem key={pageNum}>
                      <PaginationLink onClick={() => setPage(pageNum)} isActive={page === pageNum}>
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Voucher Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("giftVouchers.details")}</DialogTitle>
            <DialogDescription>{t("giftVouchers.detailsDescription")}</DialogDescription>
          </DialogHeader>

          {selectedVoucher && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.code")}</h3>
                  <p className="text-lg font-semibold">{selectedVoucher.code}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.amount")}</h3>
                  <p className="text-lg font-semibold">${selectedVoucher.amount.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.status")}</h3>
                  <Badge variant={selectedVoucher.isRedeemed ? "default" : "secondary"} className="mt-1">
                    {selectedVoucher.isRedeemed ? t("giftVouchers.redeemed") : t("giftVouchers.unredeemed")}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.expiryDate")}</h3>
                  <p className="text-lg font-semibold">{format(new Date(selectedVoucher.expiryDate), "PPP")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.recipient")}</h3>
                  <p className="text-lg font-semibold">{selectedVoucher.recipientName}</p>
                  <p className="text-sm text-muted-foreground">{selectedVoucher.recipientEmail}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.sender")}</h3>
                  <p className="text-lg font-semibold">{selectedVoucher.senderName}</p>
                  <p className="text-sm text-muted-foreground">{selectedVoucher.senderEmail}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.message")}</h3>
                <p className="text-base mt-1">{selectedVoucher.message || t("giftVouchers.noMessage")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.purchasedBy")}</h3>
                  <p className="text-base mt-1">
                    {selectedVoucher.purchasedBy?.name || t("giftVouchers.unknown")}
                    {selectedVoucher.purchasedBy?.email && (
                      <span className="text-sm text-muted-foreground block">{selectedVoucher.purchasedBy.email}</span>
                    )}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.purchaseDate")}</h3>
                  <p className="text-base mt-1">{format(new Date(selectedVoucher.createdAt), "PPP")}</p>
                </div>
              </div>

              {selectedVoucher.isRedeemed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.redeemedBy")}</h3>
                    <p className="text-base mt-1">
                      {selectedVoucher.redeemedBy?.name || t("giftVouchers.unknown")}
                      {selectedVoucher.redeemedBy?.email && (
                        <span className="text-sm text-muted-foreground block">{selectedVoucher.redeemedBy.email}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t("giftVouchers.fields.redeemedAt")}</h3>
                    <p className="text-base mt-1">
                      {selectedVoucher.redeemedAt
                        ? format(new Date(selectedVoucher.redeemedAt), "PPP")
                        : t("giftVouchers.unknown")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!selectedVoucher?.isRedeemed && (
              <Button variant="outline" onClick={handleResendNotification} disabled={isResending} className="mr-auto">
                <Mail className="mr-2 h-4 w-4" />
                {isResending ? t("giftVouchers.resending") : t("giftVouchers.resend")}
              </Button>
            )}
            <Button onClick={() => setIsDetailsDialogOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
